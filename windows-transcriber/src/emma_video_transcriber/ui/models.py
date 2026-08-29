from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Mapping


STATUS_QUEUED = "queued"
STATUS_TRANSCRIBING = "transcribing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"
STATUS_PAUSED = "paused"

KNOWN_STATUSES = {
    STATUS_QUEUED,
    STATUS_TRANSCRIBING,
    STATUS_COMPLETED,
    STATUS_FAILED,
    STATUS_PAUSED,
}

_STATUS_LABELS = {
    STATUS_QUEUED: "Waiting",
    STATUS_TRANSCRIBING: "Transcribing",
    STATUS_COMPLETED: "Completed",
    STATUS_FAILED: "Failed",
    STATUS_PAUSED: "Paused",
}


@dataclass(frozen=True)
class UiJob:
    job_id: str
    source_path: Path
    output_path: Path
    source_name: str
    duration_ms: int = -1
    current_ms: int = 0
    status: str = STATUS_QUEUED
    error: str | None = None

    @classmethod
    def from_record(cls, record: object) -> "UiJob":
        return cls(
            job_id=str(getattr(record, "job_id")),
            source_path=Path(getattr(record, "source_path")),
            output_path=Path(getattr(record, "output_path")),
            source_name=str(getattr(record, "source_name")),
            duration_ms=int(getattr(record, "duration_ms", -1)),
            current_ms=max(0, int(getattr(record, "current_ms", 0))),
            status=normalize_status(str(getattr(record, "status", STATUS_QUEUED))),
            error=getattr(record, "error", None),
        )

    @property
    def percent(self) -> int:
        return progress_percent(self.current_ms, self.duration_ms)

    @property
    def status_text(self) -> str:
        base = _STATUS_LABELS[self.status]
        if self.status == STATUS_TRANSCRIBING:
            return f"{base} · {self.percent}%"
        if self.status == STATUS_FAILED and self.error:
            return f"{base} · {self.error}"
        return base


@dataclass(frozen=True)
class ActiveJobSnapshot:
    job_id: str
    source_name: str
    output_name: str
    current_ms: int = 0
    duration_ms: int = -1
    percent: int | None = None
    speed_text: str | None = None
    eta_text: str | None = None
    checkpoint_text: str | None = None

    @classmethod
    def from_job(
        cls,
        job: UiJob,
        *,
        speed_text: str | None = None,
        eta_text: str | None = None,
        checkpoint_text: str | None = None,
    ) -> "ActiveJobSnapshot":
        return cls(
            job_id=job.job_id,
            source_name=str(job.source_path),
            output_name=job.output_path.name,
            current_ms=job.current_ms,
            duration_ms=job.duration_ms,
            percent=job.percent,
            speed_text=speed_text,
            eta_text=eta_text,
            checkpoint_text=checkpoint_text,
        )

    @classmethod
    def from_mapping(cls, data: Mapping[str, object]) -> "ActiveJobSnapshot":
        source = data.get("source_path", data.get("source_name", ""))
        return cls(
            job_id=str(data.get("job_id", "")),
            source_name=str(source or ""),
            output_name=str(data.get("output_name", "")),
            current_ms=max(0, int(data.get("current_ms", 0) or 0)),
            duration_ms=int(data.get("duration_ms", -1) or -1),
            percent=_optional_int(data.get("percent")),
            speed_text=_optional_text(data.get("speed_text")),
            eta_text=_optional_text(data.get("eta_text")),
            checkpoint_text=_optional_text(data.get("checkpoint_text")),
        )

    @property
    def resolved_percent(self) -> int:
        if self.percent is not None:
            return max(0, min(100, int(self.percent)))
        return progress_percent(self.current_ms, self.duration_ms)


def normalize_status(status: str) -> str:
    normalized = status.strip().lower()
    if normalized in KNOWN_STATUSES:
        return normalized
    return STATUS_QUEUED


def progress_percent(current_ms: int, duration_ms: int) -> int:
    if duration_ms <= 0:
        return 0
    current = max(0, current_ms)
    return max(0, min(100, round((current / duration_ms) * 100)))


def format_duration_ms(duration_ms: int) -> str:
    if duration_ms < 0:
        return "—"
    total_seconds = max(0, duration_ms) // 1000
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def format_progress_time(current_ms: int, duration_ms: int) -> str:
    if duration_ms < 0:
        return format_duration_ms(current_ms)
    return f"{format_duration_ms(current_ms)} / {format_duration_ms(duration_ms)}"


def _optional_int(value: object) -> int | None:
    if value is None or value == "":
        return None
    return int(value)


def _optional_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
