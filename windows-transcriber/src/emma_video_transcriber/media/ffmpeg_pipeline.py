from __future__ import annotations

import json
import os
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Iterable, Sequence

from emma_video_transcriber.contracts import AudioChunk, MediaInfo

DEFAULT_CHUNK_MS = 600_000
DEFAULT_ORPHAN_AGE_SECONDS = 24 * 60 * 60
_CHUNK_PREFIX = "emma-audio-"
_CHUNK_SUFFIX = ".wav"


class MediaPipelineError(RuntimeError):
    """Base error for media probing and bounded audio extraction."""


class MediaProbeError(MediaPipelineError):
    """Raised when media metadata cannot be read reliably."""


class MissingAudioError(MediaPipelineError):
    """Raised when transcription audio is requested from media with no audio track."""


class AudioExtractionError(MediaPipelineError):
    """Raised when FFmpeg cannot create a usable bounded audio chunk."""


def default_temp_dir() -> Path:
    """Return the application-owned directory used for temporary audio chunks."""
    return Path(tempfile.gettempdir()) / "emma-video-transcriber" / "audio-chunks"


def cleanup_temp_chunk(path: Path) -> bool:
    """Delete one temporary audio chunk if it still exists."""
    try:
        path.unlink()
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise MediaPipelineError(f"Could not delete temporary audio chunk: {path}: {exc}") from exc
    return True


def cleanup_orphaned_chunks(
    temp_dir: Path | None = None,
    *,
    older_than_seconds: int = DEFAULT_ORPHAN_AGE_SECONDS,
    now: float | None = None,
) -> list[Path]:
    """Delete stale EMMA-owned WAV chunks and return the paths removed."""
    if older_than_seconds < 0:
        raise ValueError("older_than_seconds must be >= 0")

    root = temp_dir or default_temp_dir()
    if not root.exists():
        return []

    cutoff = (time.time() if now is None else now) - older_than_seconds
    removed: list[Path] = []
    for candidate in root.glob(f"{_CHUNK_PREFIX}*{_CHUNK_SUFFIX}"):
        try:
            if candidate.stat().st_mtime > cutoff:
                continue
            candidate.unlink()
        except FileNotFoundError:
            continue
        except OSError as exc:
            raise MediaPipelineError(f"Could not clean orphaned audio chunk: {candidate}: {exc}") from exc
        removed.append(candidate)
    return removed


class FFmpegMediaPipeline:
    """FFmpeg/ffprobe media pipeline that materializes only bounded 16 kHz mono WAV chunks."""

    def __init__(
        self,
        *,
        ffmpeg_path: str = "ffmpeg",
        ffprobe_path: str = "ffprobe",
        temp_dir: Path | None = None,
    ) -> None:
        self.ffmpeg_path = ffmpeg_path
        self.ffprobe_path = ffprobe_path
        self.temp_dir = temp_dir or default_temp_dir()

    def probe(self, source: Path) -> MediaInfo:
        source = self._validated_source(source)
        command = [
            self.ffprobe_path,
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=index,codec_type,codec_name,duration",
            "-of",
            "json",
            os.fspath(source),
        ]
        completed = self._run(command, tool="ffprobe")

        try:
            payload = json.loads(completed.stdout or "{}")
        except json.JSONDecodeError as exc:
            raise MediaProbeError(
                f"ffprobe returned invalid JSON for {source}: {exc}"
            ) from exc

        streams = payload.get("streams") or []
        audio_streams = [stream for stream in streams if stream.get("codec_type") == "audio"]
        audio_codec = None
        if audio_streams:
            codec_name = audio_streams[0].get("codec_name")
            if codec_name:
                audio_codec = str(codec_name)

        duration_seconds = self._duration_seconds(payload, streams)
        if duration_seconds is None or duration_seconds < 0:
            raise MediaProbeError(f"Could not determine media duration: {source}")

        try:
            size_bytes = source.stat().st_size
        except OSError as exc:
            raise MediaProbeError(f"Could not read media file size: {source}: {exc}") from exc

        return MediaInfo(
            path=source,
            duration_ms=max(0, int(round(duration_seconds * 1000))),
            size_bytes=size_bytes,
            has_audio=bool(audio_streams),
            audio_codec=audio_codec,
        )

    def iter_audio_chunks(
        self,
        source: Path,
        start_ms: int = 0,
        chunk_ms: int = DEFAULT_CHUNK_MS,
    ) -> Iterable[AudioChunk]:
        if start_ms < 0:
            raise ValueError("start_ms must be >= 0")
        if chunk_ms <= 0:
            raise ValueError("chunk_ms must be > 0")

        info = self.probe(source)
        if not info.has_audio:
            raise MissingAudioError(f"Media has no audio track: {info.path}")
        if start_ms >= info.duration_ms:
            return

        current_ms = start_ms
        while current_ms < info.duration_ms:
            end_ms = min(current_ms + chunk_ms, info.duration_ms)
            duration_ms = end_ms - current_ms
            output_path = self._new_chunk_path()
            try:
                self._extract_chunk(
                    source=info.path,
                    output_path=output_path,
                    start_ms=current_ms,
                    duration_ms=duration_ms,
                )
            except Exception:
                try:
                    output_path.unlink(missing_ok=True)
                except OSError:
                    pass
                raise

            yield AudioChunk(path=output_path, start_ms=current_ms, end_ms=end_ms)
            current_ms = end_ms

    def cleanup_chunk(self, chunk: AudioChunk | Path) -> bool:
        path = chunk.path if isinstance(chunk, AudioChunk) else chunk
        return cleanup_temp_chunk(path)

    def cleanup_orphans(
        self,
        *,
        older_than_seconds: int = DEFAULT_ORPHAN_AGE_SECONDS,
        now: float | None = None,
    ) -> list[Path]:
        return cleanup_orphaned_chunks(
            self.temp_dir,
            older_than_seconds=older_than_seconds,
            now=now,
        )

    def _validated_source(self, source: Path) -> Path:
        path = Path(source)
        if not path.exists():
            raise MediaProbeError(f"Media file does not exist: {path}")
        if not path.is_file():
            raise MediaProbeError(f"Media source is not a file: {path}")
        return path

    def _new_chunk_path(self) -> Path:
        try:
            self.temp_dir.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise AudioExtractionError(
                f"Could not create temporary audio directory: {self.temp_dir}: {exc}"
            ) from exc
        return self.temp_dir / f"{_CHUNK_PREFIX}{uuid.uuid4().hex}{_CHUNK_SUFFIX}"

    def _extract_chunk(
        self,
        *,
        source: Path,
        output_path: Path,
        start_ms: int,
        duration_ms: int,
    ) -> None:
        command = [
            self.ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "error",
            "-nostdin",
            "-ss",
            _seconds_arg(start_ms),
            "-i",
            os.fspath(source),
            "-map",
            "0:a:0",
            "-vn",
            "-sn",
            "-dn",
            "-t",
            _seconds_arg(duration_ms),
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
            "-f",
            "wav",
            "-y",
            os.fspath(output_path),
        ]
        self._run(command, tool="ffmpeg")
        try:
            size = output_path.stat().st_size
        except OSError as exc:
            raise AudioExtractionError(
                f"FFmpeg did not create the expected audio chunk: {output_path}: {exc}"
            ) from exc
        if size <= 44:
            raise AudioExtractionError(
                f"FFmpeg created an empty or invalid audio chunk: {output_path}"
            )

    def _run(self, command: Sequence[str], *, tool: str) -> subprocess.CompletedProcess[str]:
        creationflags = 0
        if os.name == "nt" and hasattr(subprocess, "CREATE_NO_WINDOW"):
            creationflags = subprocess.CREATE_NO_WINDOW
        try:
            return subprocess.run(
                list(command),
                check=True,
                shell=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                creationflags=creationflags,
            )
        except FileNotFoundError as exc:
            error_type = MediaProbeError if tool == "ffprobe" else AudioExtractionError
            raise error_type(
                f"{tool} executable was not found. Expected command: {command[0]}"
            ) from exc
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or "").strip()
            detail = stderr if stderr else f"exit code {exc.returncode}"
            error_type = MediaProbeError if tool == "ffprobe" else AudioExtractionError
            raise error_type(f"{tool} failed: {detail}") from exc

    @staticmethod
    def _duration_seconds(payload: dict, streams: list[dict]) -> float | None:
        format_info = payload.get("format") or {}
        duration = _parse_duration(format_info.get("duration"))
        if duration is not None:
            return duration

        stream_durations = [
            parsed
            for stream in streams
            if (parsed := _parse_duration(stream.get("duration"))) is not None
        ]
        return max(stream_durations) if stream_durations else None


def _parse_duration(value: object) -> float | None:
    if value in (None, "", "N/A"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _seconds_arg(milliseconds: int) -> str:
    return f"{milliseconds / 1000:.3f}"
