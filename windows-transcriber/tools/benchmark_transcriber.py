from __future__ import annotations

import argparse
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


def engine_details(engine: Any) -> dict[str, Any]:
    details: dict[str, Any] = {}
    for method_name in ("diagnostics", "describe"):
        method = getattr(engine, method_name, None)
        if callable(method):
            try:
                value = method()
                if isinstance(value, dict):
                    details.update(value)
            except Exception as exc:
                details[f"{method_name}_error"] = repr(exc)
    for key, candidates in {
        "selected_device": ("device", "selected_device"),
        "model": ("model_name", "model_id", "model"),
        "compute_type": ("compute_type",),
    }.items():
        if key in details:
            continue
        for name in candidates:
            value = getattr(engine, name, None)
            if isinstance(value, (str, int, float, bool)):
                details[key] = value
                break
    return details


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


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Measure real EMMA VIDEO TRANSCRIBER media+engine throughput on the target PC."
    )
    parser.add_argument("--factory", required=True, help="module:function returning media+engine components")
    parser.add_argument("--source", required=True, type=Path, help="local spoken-video/audio input")
    parser.add_argument("--chunk-ms", type=int, default=600_000, help="bounded chunk size, default 10 minutes")
    parser.add_argument("--language", default=None)
    parser.add_argument("--json-out", type=Path, default=None)
    args = parser.parse_args()

    if args.chunk_ms <= 0:
        raise SystemExit("--chunk-ms must be > 0")
    if not args.source.exists():
        raise SystemExit(f"Source does not exist: {args.source}")

    factory = load_factory(args.factory)
    media, engine = normalize_components(factory())
    source_stat_before = args.source.stat()
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
            segments = engine.transcribe_chunk(chunk, language=args.language)
            total_segments += len(segments)
            total_characters += sum(len(segment.text) for segment in segments)
    wall_seconds = time.perf_counter() - started

    source_stat_after = args.source.stat()
    source_unchanged = (
        source_stat_before.st_size == source_stat_after.st_size
        and source_stat_before.st_mtime_ns == source_stat_after.st_mtime_ns
    )
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
        "source_metadata_unchanged": source_unchanged,
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
