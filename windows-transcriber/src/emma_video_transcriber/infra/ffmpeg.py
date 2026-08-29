from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from pathlib import Path

from .paths import bundled_ffmpeg_dir


@dataclass(frozen=True)
class FFmpegRuntime:
    ffmpeg: Path
    ffprobe: Path
    bundled: bool


def _candidate(name: str) -> Path | None:
    exe = f"{name}.exe" if os.name == "nt" else name
    bundled = bundled_ffmpeg_dir() / exe
    if bundled.is_file():
        return bundled
    system = shutil.which(exe) or shutil.which(name)
    return Path(system) if system else None


def locate_ffmpeg() -> FFmpegRuntime:
    ffmpeg = _candidate("ffmpeg")
    ffprobe = _candidate("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError(
            "FFmpeg runtime is missing. Reinstall the portable package or rebuild it with "
            "windows-transcriber/build/provision_ffmpeg.py."
        )
    bundled = ffmpeg.parent.resolve() == bundled_ffmpeg_dir().resolve()
    return FFmpegRuntime(ffmpeg=ffmpeg, ffprobe=ffprobe, bundled=bundled)


def activate_ffmpeg_path() -> FFmpegRuntime:
    runtime = locate_ffmpeg()
    parent = str(runtime.ffmpeg.parent)
    current = os.environ.get("PATH", "")
    entries = current.split(os.pathsep) if current else []
    if parent not in entries:
        os.environ["PATH"] = parent + (os.pathsep + current if current else "")
    return runtime
