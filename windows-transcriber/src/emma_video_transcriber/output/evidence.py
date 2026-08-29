from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from ..contracts import JobRecord, TranscriptSegment

EVIDENCE_SCHEMA_VERSION = 1
EVIDENCE_KIND = "emma-transcript-evidence"
EVIDENCE_PRODUCER = "emma-video-transcriber"
VAD_FILTER = "faster-whisper-vad-filter"


def evidence_path(output_path: Path) -> Path:
    """Return the structured evidence sidecar path next to the human-readable TXT."""
    return Path(output_path).with_suffix(".evidence.json")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _source_identity(path: Path) -> str:
    return os.path.normcase(os.path.abspath(os.path.normpath(str(path))))


def _read(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise RuntimeError(f"transcript evidence sidecar is unreadable: {exc}") from exc
    if not isinstance(value, dict):
        raise RuntimeError("transcript evidence sidecar is not an object")
    return value


def _write_atomic(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    payload = json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n"
    with temporary.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


def _new_payload(job: JobRecord) -> dict:
    return {
        "schemaVersion": EVIDENCE_SCHEMA_VERSION,
        "kind": EVIDENCE_KIND,
        "producer": EVIDENCE_PRODUCER,
        "status": "partial",
        "sourcePath": str(Path(job.source_path).resolve(strict=False)),
        "durationMs": int(job.duration_ms),
        "committedMs": int(job.current_ms),
        "generatedAt": _now_iso(),
        "vadFilter": VAD_FILTER,
        "segments": [],
    }


def _validated_payload(job: JobRecord, value: dict | None) -> dict:
    if value is None:
        return _new_payload(job)
    if value.get("schemaVersion") != EVIDENCE_SCHEMA_VERSION or value.get("kind") != EVIDENCE_KIND:
        raise RuntimeError("transcript evidence sidecar schema does not match this application")
    if value.get("producer") != EVIDENCE_PRODUCER:
        raise RuntimeError("transcript evidence sidecar producer does not match this application")
    source = value.get("sourcePath")
    if not isinstance(source, str) or _source_identity(Path(source)) != _source_identity(Path(job.source_path)):
        raise RuntimeError("transcript evidence sidecar belongs to a different source file")
    segments = value.get("segments")
    if not isinstance(segments, list):
        raise RuntimeError("transcript evidence sidecar segments are malformed")
    return value


def _normalized_segment(segment: TranscriptSegment) -> dict | None:
    text = segment.text.strip()
    if not text or segment.end_ms <= segment.start_ms or segment.start_ms < 0:
        return None
    return {
        "startMs": int(segment.start_ms),
        "endMs": int(segment.end_ms),
        "text": text,
    }


def reconcile_evidence(job: JobRecord) -> None:
    """Rewind structured evidence to the job's durable checkpoint before a resume/retry."""
    path = evidence_path(job.output_path)
    value = _validated_payload(job, _read(path))
    checkpoint = int(job.current_ms)
    kept: list[dict] = []
    for segment in value.get("segments", []):
        if not isinstance(segment, dict):
            continue
        start_ms = segment.get("startMs")
        end_ms = segment.get("endMs")
        text = segment.get("text")
        if not isinstance(start_ms, int) or not isinstance(end_ms, int) or not isinstance(text, str):
            continue
        if start_ms >= 0 and end_ms > start_ms and end_ms <= checkpoint and text.strip():
            kept.append({"startMs": start_ms, "endMs": end_ms, "text": text.strip()})
    kept.sort(key=lambda item: (item["startMs"], item["endMs"], item["text"]))
    value.update(
        {
            "producer": EVIDENCE_PRODUCER,
            "status": "partial",
            "sourcePath": str(Path(job.source_path).resolve(strict=False)),
            "durationMs": int(job.duration_ms),
            "committedMs": checkpoint,
            "vadFilter": VAD_FILTER,
            "segments": kept,
        }
    )
    _write_atomic(path, value)


def commit_evidence_chunk(
    job: JobRecord,
    chunk_start_ms: int,
    chunk_end_ms: int,
    segments: list[TranscriptSegment],
) -> None:
    """Idempotently replace evidence for one checkpointed audio chunk."""
    if chunk_end_ms <= chunk_start_ms:
        raise RuntimeError("invalid transcript evidence chunk range")
    path = evidence_path(job.output_path)
    value = _validated_payload(job, _read(path))

    kept: list[dict] = []
    for segment in value.get("segments", []):
        if not isinstance(segment, dict):
            continue
        start_ms = segment.get("startMs")
        end_ms = segment.get("endMs")
        text = segment.get("text")
        if not isinstance(start_ms, int) or not isinstance(end_ms, int) or not isinstance(text, str):
            continue
        # Drop the current/future chunk so a retry cannot duplicate segments.
        if end_ms <= chunk_start_ms and start_ms >= 0 and end_ms > start_ms and text.strip():
            kept.append({"startMs": start_ms, "endMs": end_ms, "text": text.strip()})

    for segment in segments:
        normalized = _normalized_segment(segment)
        if normalized is None:
            continue
        if normalized["startMs"] < chunk_start_ms or normalized["endMs"] > chunk_end_ms:
            raise RuntimeError("transcript segment escaped its committed audio chunk")
        kept.append(normalized)

    deduplicated: dict[tuple[int, int, str], dict] = {}
    for segment in kept:
        key = (segment["startMs"], segment["endMs"], segment["text"])
        deduplicated[key] = segment
    ordered = sorted(deduplicated.values(), key=lambda item: (item["startMs"], item["endMs"], item["text"]))

    value.update(
        {
            "producer": EVIDENCE_PRODUCER,
            "status": "partial",
            "sourcePath": str(Path(job.source_path).resolve(strict=False)),
            "durationMs": int(job.duration_ms),
            "committedMs": int(chunk_end_ms),
            "vadFilter": VAD_FILTER,
            "segments": ordered,
        }
    )
    _write_atomic(path, value)


def complete_evidence(job: JobRecord) -> None:
    """Mark evidence importable only after the media job reached its full duration."""
    if job.duration_ms <= 0 or job.current_ms < job.duration_ms:
        raise RuntimeError("cannot complete transcript evidence before the job duration is committed")
    path = evidence_path(job.output_path)
    value = _validated_payload(job, _read(path))
    if int(value.get("committedMs", -1)) < int(job.duration_ms):
        raise RuntimeError("transcript evidence is behind the completed media checkpoint")
    value.update(
        {
            "producer": EVIDENCE_PRODUCER,
            "status": "completed",
            "durationMs": int(job.duration_ms),
            "committedMs": int(job.duration_ms),
            "sourcePath": str(Path(job.source_path).resolve(strict=False)),
            "vadFilter": VAD_FILTER,
        }
    )
    _write_atomic(path, value)
