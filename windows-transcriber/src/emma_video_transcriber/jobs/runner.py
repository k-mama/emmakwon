from __future__ import annotations

import os
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from ..contracts import (
    JobRecord,
    JobStore,
    MediaPipeline,
    TranscriptSegment,
    TranscriptWriter,
    TranscriptionEngine,
)
from ..output.journal import AppendJournal, clear_journal, recover_output, write_journal


@dataclass(frozen=True)
class QueueEvent:
    kind: str
    job_id: str | None = None
    source_path: Path | None = None
    output_path: Path | None = None
    progress_percent: int | None = None
    current_ms: int | None = None
    duration_ms: int | None = None
    message: str | None = None
    error: str | None = None


QueueCallback = Callable[[QueueEvent], None]


class QueueRunner:
    """Sequential, checkpointed queue runner using only shared protocols."""

    def __init__(
        self,
        media: MediaPipeline,
        engine: TranscriptionEngine,
        writer: TranscriptWriter,
        store: JobStore,
        *,
        callback: QueueCallback | None = None,
        default_chunk_ms: int = 600_000,
        cleanup_chunks: bool = True,
    ) -> None:
        if default_chunk_ms <= 0:
            raise ValueError("default_chunk_ms must be > 0")
        self.media = media
        self.engine = engine
        self.writer = writer
        self.store = store
        self.callback = callback
        self.default_chunk_ms = default_chunk_ms
        self.cleanup_chunks = cleanup_chunks
        self._pause_requested = threading.Event()
        self._stop_requested = threading.Event()

    def request_pause(self) -> None:
        """Pause at the next committed chunk boundary."""
        self._pause_requested.set()

    def request_stop(self) -> None:
        """Stop queue advancement at the next committed chunk boundary."""
        self._stop_requested.set()

    def recover_interrupted(self) -> list[JobRecord]:
        """Make stale processing jobs resumable and repair any pending TXT append."""
        recovered: list[JobRecord] = []
        for job in self.store.list_all():
            try:
                action = recover_output(job.output_path, committed_ms=job.current_ms, job_id=job.job_id)
            except Exception as exc:
                job.status = "failed"
                job.error = f"recovery failed: {exc}"
                self.store.update(job)
                self._emit_for_job("job_failed", job, error=job.error)
                continue
            if action != "none":
                self._emit_for_job("recovery", job, message=action)
            if job.status == "processing":
                job.status = "paused"
                job.error = None
                job.metadata["interrupted_recovery"] = "1"
                self.store.update(job)
                recovered.append(job)
                self._emit_for_job("job_paused", job, message="interrupted job is resumable")
        return recovered

    def run(self, *, resume_paused: bool = True) -> None:
        """Process queued jobs sequentially; optionally include paused jobs."""
        self._pause_requested.clear()
        self._stop_requested.clear()
        self.recover_interrupted()
        candidates = self._candidates(resume_paused=resume_paused)
        self._emit("queue_status", message=f"{len(candidates)} job(s) ready")
        for job in candidates:
            if self._stop_requested.is_set():
                break
            self._run_job(job)
            if self._pause_requested.is_set() or self._stop_requested.is_set():
                break
        self._emit("queue_completed", message="queue run finished")

    def retry_failed(self, job_id: str) -> JobRecord:
        job = self.store.get(job_id)
        if job is None:
            raise KeyError(f"unknown job_id: {job_id}")
        if job.status != "failed":
            raise ValueError("only failed jobs can be retried")
        recover_output(job.output_path, committed_ms=job.current_ms, job_id=job.job_id)
        job.status = "paused" if job.current_ms > 0 else "queued"
        job.error = None
        self.store.update(job)
        return job

    def _candidates(self, *, resume_paused: bool) -> list[JobRecord]:
        statuses = {"queued"}
        if resume_paused:
            statuses.add("paused")
        return [job for job in self.store.list_all() if job.status in statuses]

    def _run_job(self, job: JobRecord) -> None:
        try:
            recover_output(job.output_path, committed_ms=job.current_ms, job_id=job.job_id)
            info = self.media.probe(job.source_path)
            if not info.has_audio:
                raise RuntimeError("source has no audio stream")
            if info.duration_ms <= 0:
                raise RuntimeError(f"invalid media duration: {info.duration_ms}")
            job.duration_ms = info.duration_ms
            job.status = "processing"
            job.error = None
            self.store.update(job)
            self._emit_for_job("job_started", job, message=job.source_name)

            chunk_ms = self._chunk_ms(job)
            language = job.metadata.get("language") or None
            for chunk in self.media.iter_audio_chunks(
                job.source_path, start_ms=job.current_ms, chunk_ms=chunk_ms
            ):
                if chunk.end_ms <= job.current_ms:
                    self._cleanup_chunk(chunk.path, source=job.source_path)
                    continue
                if chunk.start_ms != job.current_ms:
                    raise RuntimeError(
                        f"media pipeline returned non-contiguous chunk {chunk.start_ms}-{chunk.end_ms} "
                        f"at checkpoint {job.current_ms}"
                    )
                segments = self.engine.transcribe_chunk(chunk, language=language)
                self._commit_chunk(job, chunk.start_ms, chunk.end_ms, segments)
                self._cleanup_chunk(chunk.path, source=job.source_path)
                self._emit_progress(job)
                if self._pause_requested.is_set() or self._stop_requested.is_set():
                    job.status = "paused"
                    self.store.update(job)
                    self._emit_for_job("job_paused", job, message="paused at safe chunk boundary")
                    return

            if job.current_ms < job.duration_ms:
                raise RuntimeError(
                    f"media pipeline ended at {job.current_ms} ms before duration {job.duration_ms} ms"
                )
            job.current_ms = job.duration_ms
            job.status = "completed"
            job.error = None
            self.store.update(job)
            clear_journal(job.output_path)
            self._emit_for_job("job_completed", job, message=str(job.output_path))
        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
            self.store.update(job)
            self._emit_for_job("job_failed", job, error=job.error)

    def _commit_chunk(
        self,
        job: JobRecord,
        start_ms: int,
        end_ms: int,
        segments: list[TranscriptSegment],
    ) -> None:
        if end_ms <= start_ms:
            raise RuntimeError(f"invalid chunk range: {start_ms}-{end_ms}")
        output = job.output_path
        output.parent.mkdir(parents=True, exist_ok=True)
        if not output.exists():
            output.touch(exist_ok=False)
        safe_offset = output.stat().st_size
        write_journal(
            AppendJournal(
                job_id=job.job_id,
                output_path=str(output),
                safe_offset=safe_offset,
                chunk_start_ms=start_ms,
                chunk_end_ms=end_ms,
            )
        )
        self.writer.append_segments(output, segments)
        self._fsync_path(output)
        job.current_ms = end_ms
        self.store.update(job)
        clear_journal(output)
        self._emit_for_job("chunk_committed", job, message=str(output))

    def _emit_progress(self, job: JobRecord) -> None:
        percent = 100 if job.duration_ms <= 0 else min(100, int(job.current_ms * 100 / job.duration_ms))
        self._emit_for_job("progress", job, progress_percent=percent)

    def _emit_for_job(
        self,
        kind: str,
        job: JobRecord,
        *,
        progress_percent: int | None = None,
        message: str | None = None,
        error: str | None = None,
    ) -> None:
        self._emit(
            kind,
            job_id=job.job_id,
            source_path=job.source_path,
            output_path=job.output_path,
            progress_percent=progress_percent,
            current_ms=job.current_ms,
            duration_ms=job.duration_ms,
            message=message,
            error=error,
        )

    def _emit(self, kind: str, **kwargs) -> None:
        if self.callback is not None:
            self.callback(QueueEvent(kind=kind, **kwargs))

    def _chunk_ms(self, job: JobRecord) -> int:
        raw = job.metadata.get("chunk_ms")
        if raw is None:
            return self.default_chunk_ms
        value = int(raw)
        if value <= 0:
            raise ValueError("job metadata chunk_ms must be > 0")
        return value

    def _cleanup_chunk(self, chunk_path: Path, *, source: Path) -> None:
        if not self.cleanup_chunks:
            return
        chunk_path = Path(chunk_path)
        try:
            if chunk_path.resolve() == Path(source).resolve():
                return
        except OSError:
            pass
        chunk_path.unlink(missing_ok=True)

    @staticmethod
    def _fsync_path(path: Path) -> None:
        with Path(path).open("rb") as handle:
            os.fsync(handle.fileno())
