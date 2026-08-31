from __future__ import annotations

import ctypes
import faulthandler
import json
import os
import subprocess
import threading
import time
from pathlib import Path
from typing import Any

from .paths import logs_root

"""Lightweight, best-effort local crash/reliability evidence.

None of this is required for correct transcription. Every public function
here must never raise into a caller: telemetry that cannot be collected
(e.g. GPU tools missing, disk full, permissions) must never fail a real
transcription job. This module exists specifically to leave enough evidence
behind for the case ordinary Python exception handling cannot see: a fatal
native crash (CUDA/CTranslate2/PyAV/etc.) that takes the whole process down
without ever reaching a Python ``except`` block.
"""

_LOCK = threading.Lock()
_FAULTHANDLER_ENABLED = False
_FAULTHANDLER_HANDLE: Any = None
_FAULTHANDLER_PATH: Path | None = None
_HEARTBEAT_LOG_NAME = "diagnostics.log"
_SESSION_MARKER_NAME = "session-marker.json"


def _heartbeat_path(logs_dir: Path | None) -> Path:
    return (logs_dir or logs_root()) / _HEARTBEAT_LOG_NAME


def _marker_path(logs_dir: Path | None) -> Path:
    return (logs_dir or logs_root()) / _SESSION_MARKER_NAME


def enable_crash_diagnostics(logs_dir: Path | None = None) -> Path | None:
    """Enable Python's faulthandler to an app-owned log file, once per process.

    This captures ordinary fatal-signal tracebacks (e.g. a Python-level stack
    overflow) when the platform delivers them. It cannot, by itself, capture a
    hard native crash inside CUDA/CTranslate2 that never returns to Python at
    all; the heartbeat/session-marker mechanism below covers that case.
    """
    global _FAULTHANDLER_ENABLED, _FAULTHANDLER_HANDLE, _FAULTHANDLER_PATH
    with _LOCK:
        if _FAULTHANDLER_ENABLED:
            return _FAULTHANDLER_PATH
        try:
            target_dir = logs_dir or logs_root()
            target_dir.mkdir(parents=True, exist_ok=True)
            path = target_dir / "faulthandler.log"
            handle = path.open("a", encoding="utf-8")
            faulthandler.enable(file=handle, all_threads=True)
            _FAULTHANDLER_HANDLE = handle
            _FAULTHANDLER_PATH = path
            _FAULTHANDLER_ENABLED = True
            return path
        except Exception:
            return None


def process_rss_bytes() -> int | None:
    """Best-effort current process working-set size in bytes, or None."""
    if os.name != "nt":
        return None
    try:
        class _ProcessMemoryCounters(ctypes.Structure):
            _fields_ = [
                ("cb", ctypes.c_ulong),
                ("PageFaultCount", ctypes.c_ulong),
                ("PeakWorkingSetSize", ctypes.c_size_t),
                ("WorkingSetSize", ctypes.c_size_t),
                ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                ("PagefileUsage", ctypes.c_size_t),
                ("PeakPagefileUsage", ctypes.c_size_t),
            ]

        counters = _ProcessMemoryCounters()
        counters.cb = ctypes.sizeof(_ProcessMemoryCounters)
        handle = ctypes.windll.kernel32.GetCurrentProcess()  # type: ignore[attr-defined]
        ok = ctypes.windll.psapi.GetProcessMemoryInfo(  # type: ignore[attr-defined]
            handle, ctypes.byref(counters), counters.cb
        )
        return int(counters.WorkingSetSize) if ok else None
    except Exception:
        return None


def gpu_vram_used_mb(device_index: int = 0) -> float | None:
    """Best-effort GPU VRAM usage in MB via nvidia-smi. Never a hard dependency."""
    try:
        completed = subprocess.run(
            [
                "nvidia-smi",
                f"--id={device_index}",
                "--query-gpu=memory.used",
                "--format=csv,noheader,nounits",
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=2,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if completed.returncode != 0:
        return None
    lines = completed.stdout.strip().splitlines()
    if not lines:
        return None
    try:
        return float(lines[0].strip())
    except ValueError:
        return None


def record_stage(stage: str, logs_dir: Path | None = None, **fields: Any) -> None:
    """Append one best-effort JSON diagnostic line. Never raises to the caller."""
    try:
        entry: dict[str, Any] = {"ts": time.time(), "pid": os.getpid(), "stage": stage}
        for key, value in fields.items():
            entry[key] = value if _is_jsonable(value) else str(value)
        line = json.dumps(entry, ensure_ascii=False, sort_keys=True)
        path = _heartbeat_path(logs_dir)
        path.parent.mkdir(parents=True, exist_ok=True)
        with _LOCK:
            with path.open("a", encoding="utf-8") as handle:
                handle.write(line)
                handle.write("\n")
    except Exception:
        pass


def _is_jsonable(value: Any) -> bool:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return True
    if isinstance(value, (list, tuple)):
        return all(_is_jsonable(item) for item in value)
    return False


def begin_session(logs_dir: Path | None = None) -> dict[str, Any] | None:
    """Mark this process session as started.

    Returns the previous session's last-known marker fields if that session
    never reached a clean shutdown (evidence a crash likely happened), or
    None if the previous session shut down cleanly or no marker exists yet.
    """
    path = _marker_path(logs_dir)
    previous: dict[str, Any] | None = None
    try:
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            if not data.get("clean_shutdown"):
                previous = data
    except Exception:
        previous = None
    record_stage("session_start", logs_dir)
    _write_marker(path, {"clean_shutdown": False, "started_at": time.time()})
    return previous


def update_marker(fields: dict[str, Any], logs_dir: Path | None = None) -> None:
    """Refresh the durable last-stage marker. Best-effort; never raises."""
    path = _marker_path(logs_dir)
    try:
        data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    except Exception:
        data = {}
    data.update(fields)
    data["clean_shutdown"] = False
    _write_marker(path, data)


def end_session(logs_dir: Path | None = None) -> None:
    """Mark this process session as having shut down cleanly."""
    record_stage("session_end", logs_dir)
    path = _marker_path(logs_dir)
    try:
        data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    except Exception:
        data = {}
    data["clean_shutdown"] = True
    data["ended_at"] = time.time()
    _write_marker(path, data)


def _write_marker(path: Path, data: dict[str, Any]) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_name(path.name + ".tmp")
        temp.write_text(json.dumps(data, ensure_ascii=False, sort_keys=True), encoding="utf-8")
        os.replace(temp, path)
    except Exception:
        pass


def configure_windows_crash_dumps(logs_dir: Path | None = None) -> Path | None:
    """Enable per-user Windows Error Reporting minidumps for this executable.

    The setting is app-specific under HKCU, requires no administrator rights, and
    gives the next native CUDA/CTranslate2/Qt crash a concrete .dmp artifact that
    can identify the faulting module instead of leaving only a vanished process.
    Best-effort and never raises.
    """
    if os.name != "nt":
        return None
    try:
        import winreg

        target_dir = (logs_dir or logs_root()) / "crash-dumps"
        target_dir.mkdir(parents=True, exist_ok=True)
        key_path = (
            "Software\\Microsoft\\Windows\\Windows Error Reporting\\LocalDumps\\"
            "EmmaVideoTranscriber.exe"
        )
        with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE) as key:
            winreg.SetValueEx(key, "DumpFolder", 0, winreg.REG_EXPAND_SZ, str(target_dir))
            winreg.SetValueEx(key, "DumpCount", 0, winreg.REG_DWORD, 5)
            # 1 = minidump. Small enough for routine diagnostics while preserving
            # exception/module/thread information needed for first-pass forensics.
            winreg.SetValueEx(key, "DumpType", 0, winreg.REG_DWORD, 1)
        record_stage("windows_crash_dumps_enabled", logs_dir, dump_folder=str(target_dir))
        return target_dir
    except Exception:
        return None


__all__ = [
    "begin_session",
    "configure_windows_crash_dumps",
    "enable_crash_diagnostics",
    "end_session",
    "gpu_vram_used_mb",
    "process_rss_bytes",
    "record_stage",
    "update_marker",
]
