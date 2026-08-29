from __future__ import annotations

import argparse
import dataclasses
import hashlib
import importlib
import json
import os
import platform
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


def load_factory(spec: str):
    module_name, sep, callable_name = spec.partition(":")
    if not sep:
        raise SystemExit("--factory must be module:function")
    module = importlib.import_module(module_name)
    return getattr(module, callable_name)


def normalize_components(value: Any):
    if isinstance(value, dict):
        media = value.get("media") or value.get("media_pipeline")
        engine = value.get("engine") or value.get("transcriber")
    elif isinstance(value, tuple) and len(value) == 2:
        media, engine = value
    else:
        media = getattr(value, "media", None)
        engine = getattr(value, "engine", None)
    if media is None or engine is None:
        raise SystemExit(
            "Factory must return (media_pipeline, engine), a dict with media/engine, "
            "or an object exposing .media and .engine"
        )
    return media, engine


def _diagnostic_mapping(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return dict(value)
    if dataclasses.is_dataclass(value):
        return dataclasses.asdict(value)
    if hasattr(value, "__dict__"):
        return {
            key: item
            for key, item in vars(value).items()
            if isinstance(item, (str, int, float, bool, type(None)))
        }
    return {}


def engine_details(engine: Any) -> dict[str, Any]:
    details: dict[str, Any] = {}
    for method_name in ("get_diagnostics", "diagnostics", "describe"):
        method = getattr(engine, method_name, None)
        if callable(method):
            try:
                details.update(_diagnostic_mapping(method()))
            except Exception as exc:
                details[f"{method_name}_error"] = repr(exc)

    aliases = {
        "selected_device": ("selected_device", "chosen_device", "device"),
        "model": ("model", "model_name", "model_id"),
        "compute_type": ("compute_type", "chosen_compute_type"),
        "gpu_name": ("gpu_name",),
        "fallback_reason": ("fallback_reason",),
    }
    normalized: dict[str, Any] = dict(details)
    for canonical, candidates in aliases.items():
        if canonical in normalized and normalized[canonical] is not None:
            continue
        for name in candidates:
            if name in details and details[name] is not None:
                normalized[canonical] = details[name]
                break
            value = getattr(engine, name, None)
            if isinstance(value, (str, int, float, bool)):
                normalized[canonical] = value
                break
    return normalized


def nvidia_inventory() -> list[dict[str, str]]:
    cmd = [
        "nvidia-smi",
        "--query-gpu=name,memory.total,driver_version",
        "--format=csv,noheader,nounits",
    ]
    try:
        completed = subprocess.run(cmd, capture_output=True, text=True, timeout=10, check=True)
    except Exception:
        return []
    rows = []
    for line in completed.stdout.splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 3:
            rows.append({"name": parts[0], "memory_total_mb": parts[1], "driver_version": parts[2]})
    return rows


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def process_working_set_bytes() -> int | None:
    if os.name == "nt":
        try:
            import ctypes
            from ctypes import wintypes

            class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
                _fields_ = [
                    ("cb", wintypes.DWORD),
                    ("PageFaultCount", wintypes.DWORD),
                    ("PeakWorkingSetSize", ctypes.c_size_t),
                    ("WorkingSetSize", ctypes.c_size_t),
                    ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                    ("PagefileUsage", ctypes.c_size_t),
                    ("PeakPagefileUsage", ctypes.c_size_t),
                ]

            counters = PROCESS_MEMORY_COUNTERS()
            counters.cb = ctypes.sizeof(counters)
            handle = ctypes.windll.kernel32.GetCurrentProcess()
            ok = ctypes.windll.psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb)
            return int(counters.WorkingSetSize) if ok else None
        except Exception:
            return None
    try:
        import resource

        usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return int(usage * (1024 if platform.system() != "Darwin" else 1))
    except Exception:
        return None


class PeakMemorySampler:
    def __init__(self, interval: float = 0.2) -> None:
        self.interval = interval
        self.peak = 0
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def _run(self) -> None:
        while not self._stop.is_set():
            value = process_working_set_bytes()
            if value is not None:
                self.peak = max(self.peak, value)
            self._stop.wait(self.interval)

    def __enter__(self):
        self._thread.start()
        return self

    def __exit__(self, exc_type, exc, tb):
        self._stop.set()
        self._thread.join(timeout=2)
        value = process_working_set_bytes()
        if value is not None:
            self.peak = max(self.peak, value)


def cleanup_chunk(media: Any, chunk_path: Path, source: Path) -> None:
    cleanup = getattr(media, "cleanup_chunk", None)
    if callable(cleanup):
        cleanup(chunk_path)
        return
    try:
        if chunk_path.resolve() == source.resolve():
            return
    except OSError:
        pass
    chunk_path.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Measure real EMMA VIDEO TRANSCRIBER media+engine throughput on the target PC."
    )
    parser.add_argument(
        "--factory",
        default="benchmark_factory:create_default_components",
        help="module:function returning media+engine components",
    )
    parser.add_argument("--source", required=True, type=Path, help="local spoken-video/audio input")
    parser.add_argument("--chunk-ms", type=int, default=600_000, help="bounded chunk size, default 10 minutes")
    parser.add_argument("--language", default=None)
    parser.add_argument("--json-out", type=Path, default=None)
    parser.add_argument(
        "--skip-source-hash",
        action="store_true",
        help="skip SHA-256 only when hashing an extremely large source is impractical",
    )
    args = parser.parse_args()

    if args.chunk_ms <= 0:
        raise SystemExit("--chunk-ms must be > 0")
    if not args.source.exists():
        raise SystemExit(f"Source does not exist: {args.source}")

    factory = load_factory(args.factory)
    media, engine = normalize_components(factory())
    source_stat_before = args.source.stat()
    source_hash_before = None if args.skip_source_hash else sha256_file(args.source)
    info = media.probe(args.source)
    if not info.has_audio:
        raise SystemExit("Source has no audio; benchmark requires spoken audio")

    total_segments = 0
    total_characters = 0
    processed_audio_ms = 0
    chunk_count = 0
    started = time.perf_counter()
    with PeakMemorySampler() as memory:
        for chunk in media.iter_audio_chunks(args.source, start_ms=0, chunk_ms=args.chunk_ms):
            chunk_count += 1
            processed_audio_ms += max(0, chunk.end_ms - chunk.start_ms)
            try:
                segments = engine.transcribe_chunk(chunk, language=args.language)
                total_segments += len(segments)
                total_characters += sum(len(segment.text) for segment in segments)
            finally:
                cleanup_chunk(media, Path(chunk.path), args.source)
    wall_seconds = time.perf_counter() - started

    source_stat_after = args.source.stat()
    source_hash_after = None if args.skip_source_hash else sha256_file(args.source)
    source_metadata_unchanged = (
        source_stat_before.st_size == source_stat_after.st_size
        and source_stat_before.st_mtime_ns == source_stat_after.st_mtime_ns
    )
    source_hash_unchanged = (
        None if args.skip_source_hash else source_hash_before == source_hash_after
    )
    source_unchanged = source_metadata_unchanged and source_hash_unchanged is not False
    input_seconds = processed_audio_ms / 1000.0
    realtime_x = (input_seconds / wall_seconds) if wall_seconds > 0 else None
    realtime_factor = (wall_seconds / input_seconds) if input_seconds > 0 else None

    result = {
        "source": str(args.source),
        "source_size_bytes": info.size_bytes,
        "input_audio_seconds": round(input_seconds, 3),
        "wall_clock_seconds": round(wall_seconds, 3),
        "x_realtime": round(realtime_x, 3) if realtime_x is not None else None,
        "realtime_factor": round(realtime_factor, 5) if realtime_factor is not None else None,
        "peak_process_working_set_bytes": memory.peak or None,
        "segment_count": total_segments,
        "character_count": total_characters,
        "chunk_count": chunk_count,
        "source_metadata_unchanged": source_metadata_unchanged,
        "source_hash_unchanged": source_hash_unchanged,
        "source_unchanged": source_unchanged,
        "engine": engine_details(engine),
        "nvidia_inventory": nvidia_inventory(),
        "python": sys.version.split()[0],
        "platform": platform.platform(),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0 if source_unchanged else 3


if __name__ == "__main__":
    raise SystemExit(main())
