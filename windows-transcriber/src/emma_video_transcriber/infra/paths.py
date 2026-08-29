from __future__ import annotations

import os
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

_APP_VENDOR = "EmmaKwon"
_APP_NAME = "EmmaVideoTranscriber"


def _local_appdata() -> Path:
    value = os.environ.get("LOCALAPPDATA")
    if value:
        return Path(value)
    if os.name == "nt":
        return Path.home() / "AppData" / "Local"
    return Path.home() / ".cache"


def app_data_root() -> Path:
    override = os.environ.get("EMMA_VIDEO_TRANSCRIBER_DATA_DIR")
    root = Path(override).expanduser() if override else _local_appdata() / _APP_VENDOR / _APP_NAME
    root.mkdir(parents=True, exist_ok=True)
    return root


def cache_root() -> Path:
    path = app_data_root() / "cache"
    path.mkdir(parents=True, exist_ok=True)
    return path


def model_cache_root() -> Path:
    path = app_data_root() / "models"
    path.mkdir(parents=True, exist_ok=True)
    return path


def gpu_runtime_root() -> Path:
    path = app_data_root() / "gpu-runtime"
    path.mkdir(parents=True, exist_ok=True)
    return path


def temp_root() -> Path:
    path = app_data_root() / "temp"
    path.mkdir(parents=True, exist_ok=True)
    return path


def job_temp_dir(job_id: str) -> Path:
    safe = "".join(ch for ch in job_id if ch.isalnum() or ch in ("-", "_")) or "job"
    path = temp_root() / safe
    path.mkdir(parents=True, exist_ok=True)
    return path


def logs_root() -> Path:
    path = app_data_root() / "logs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def resource_root() -> Path:
    """Return the PyInstaller resource directory or the source checkout root."""
    frozen_root = getattr(sys, "_MEIPASS", None)
    if frozen_root:
        return Path(frozen_root)
    # infra/paths.py -> emma_video_transcriber -> src -> windows-transcriber
    return Path(__file__).resolve().parents[3]


def bundled_ffmpeg_dir() -> Path:
    return resource_root() / "runtime" / "ffmpeg" / "bin"


def executable_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path.cwd()


def cleanup_job_temp(job_id: str) -> None:
    shutil.rmtree(job_temp_dir(job_id), ignore_errors=True)


@dataclass(frozen=True)
class RuntimePaths:
    app_data: Path
    cache: Path
    models: Path
    gpu_runtime: Path
    temp: Path
    logs: Path
    resources: Path
    ffmpeg: Path


def runtime_paths() -> RuntimePaths:
    return RuntimePaths(
        app_data=app_data_root(),
        cache=cache_root(),
        models=model_cache_root(),
        gpu_runtime=gpu_runtime_root(),
        temp=temp_root(),
        logs=logs_root(),
        resources=resource_root(),
        ffmpeg=bundled_ffmpeg_dir(),
    )
