from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable, Protocol


@dataclass(frozen=True)
class MediaInfo:
    path: Path
    duration_ms: int
    size_bytes: int
    has_audio: bool
    audio_codec: str | None = None


@dataclass(frozen=True)
class AudioChunk:
    path: Path
    start_ms: int
    end_ms: int


@dataclass(frozen=True)
class TranscriptSegment:
    start_ms: int
    end_ms: int
    text: str


@dataclass
class JobRecord:
    job_id: str
    source_path: Path
    output_path: Path
    source_name: str
    duration_ms: int = -1
    current_ms: int = 0
    status: str = "queued"
    error: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)


ProgressCallback = Callable[[int, str], None]


class MediaPipeline(Protocol):
    def probe(self, source: Path) -> MediaInfo: ...

    def iter_audio_chunks(
        self,
        source: Path,
        start_ms: int = 0,
        chunk_ms: int = 600_000,
    ) -> Iterable[AudioChunk]: ...


class TranscriptionEngine(Protocol):
    def transcribe_chunk(
        self,
        chunk: AudioChunk,
        *,
        language: str | None = None,
    ) -> list[TranscriptSegment]: ...


class TranscriptWriter(Protocol):
    def append_segments(self, output_path: Path, segments: list[TranscriptSegment]) -> None: ...


class JobStore(Protocol):
    def add(self, job: JobRecord) -> None: ...
    def update(self, job: JobRecord) -> None: ...
    def get(self, job_id: str) -> JobRecord | None: ...
    def list_all(self) -> list[JobRecord]: ...
    def remove(self, job_id: str) -> None: ...
