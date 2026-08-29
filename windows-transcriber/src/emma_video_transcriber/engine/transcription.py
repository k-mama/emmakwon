from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence

from emma_video_transcriber.contracts import AudioChunk, TranscriptSegment

from .errors import AudioInputError
from .policy import is_cuda_oom


@dataclass
class LoadedModel:
    model: Any
    batched_pipeline: Any | None
    device: str
    compute_type: str


def load_model(
    runtime: Any,
    model_name: str,
    *,
    device: str,
    compute_type: str,
    device_index: int,
    cpu_threads: int,
) -> LoadedModel:
    model = runtime.create_model(
        model_name,
        device=device,
        compute_type=compute_type,
        device_index=device_index if device == "cuda" else 0,
        cpu_threads=cpu_threads,
    )
    batched = runtime.create_batched_pipeline(model) if device == "cuda" else None
    return LoadedModel(
        model=model,
        batched_pipeline=batched,
        device=device,
        compute_type=compute_type,
    )


def transcribe_loaded(
    loaded: LoadedModel,
    audio_path: Path,
    *,
    language: str | None,
    batch_sizes: Sequence[int],
) -> list[Any]:
    if loaded.batched_pipeline is None:
        return _materialize(
            loaded.model.transcribe(
                str(audio_path),
                language=language,
                task="transcribe",
                beam_size=3,
                vad_filter=True,
            )
        )

    last_error: BaseException | None = None
    for batch_size in batch_sizes:
        try:
            return _materialize(
                loaded.batched_pipeline.transcribe(
                    str(audio_path),
                    language=language,
                    task="transcribe",
                    beam_size=3,
                    vad_filter=True,
                    batch_size=batch_size,
                )
            )
        except Exception as exc:
            if not is_cuda_oom(exc):
                raise
            last_error = exc

    assert last_error is not None
    raise last_error


def map_segments(raw_segments: Iterable[Any], chunk: AudioChunk) -> list[TranscriptSegment]:
    mapped: list[TranscriptSegment] = []
    for segment in raw_segments:
        text = str(getattr(segment, "text", "")).strip()
        if not text:
            continue
        relative_start_ms = max(0, round(float(segment.start) * 1000))
        relative_end_ms = max(relative_start_ms, round(float(segment.end) * 1000))
        absolute_start = min(chunk.end_ms, chunk.start_ms + relative_start_ms)
        absolute_end = min(chunk.end_ms, chunk.start_ms + relative_end_ms)
        if absolute_end < absolute_start:
            absolute_end = absolute_start
        mapped.append(
            TranscriptSegment(
                start_ms=absolute_start,
                end_ms=absolute_end,
                text=text,
            )
        )
    return mapped


def validate_chunk(chunk: AudioChunk) -> None:
    if chunk.start_ms < 0 or chunk.end_ms < chunk.start_ms:
        raise AudioInputError(
            f"Invalid audio chunk range: {chunk.start_ms}..{chunk.end_ms} ms."
        )
    if not chunk.path.exists() or not chunk.path.is_file():
        raise AudioInputError(f"Audio chunk does not exist: {chunk.path}")


def _materialize(result: Any) -> list[Any]:
    segments = result[0] if isinstance(result, tuple) else result
    return list(segments)
