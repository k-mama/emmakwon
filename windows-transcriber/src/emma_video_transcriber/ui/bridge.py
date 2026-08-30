from __future__ import annotations

from collections.abc import Iterable, Mapping
from pathlib import Path

from PySide6.QtCore import QObject, Signal, Slot

from .models import ActiveJobSnapshot, UiJob


class UiEventBridge(QObject):
    """Qt signal boundary between the main-thread UI and integration workers.

    UI -> integration request signals:
      * add_videos_requested(tuple[Path, ...])
      * start_transcription_requested()
      * open_output_folder_requested()
      * close_action_requested(str)
      * remove_job_requested(str)
      * clear_queue_requested()

    Integration/worker -> UI publication slots:
      * publish_jobs(iterable[JobRecord | UiJob])
      * publish_job(JobRecord | UiJob)
      * publish_active(ActiveJobSnapshot | mapping | None)
      * publish_running(bool)
      * publish_status_message(str)
      * publish_error(str)
      * allow_safe_close()

    The path-entry UI intentionally reuses add_videos_requested with a one-item tuple,
    so the integration contract remains backwards compatible. Worker QObjects should
    connect signals across threads and never call QWidget methods directly.
    """

    add_videos_requested = Signal(object)
    start_transcription_requested = Signal()
    open_output_folder_requested = Signal()
    close_action_requested = Signal(str)
    remove_job_requested = Signal(str)
    clear_queue_requested = Signal()

    jobs_published = Signal(object)
    job_published = Signal(object)
    active_published = Signal(object)
    running_published = Signal(bool)
    status_message_published = Signal(str)
    error_published = Signal(str)
    safe_close_published = Signal()

    @Slot(object)
    def publish_jobs(self, jobs: Iterable[object]) -> None:
        self.jobs_published.emit(tuple(_coerce_job(job) for job in jobs))

    @Slot(object)
    def publish_job(self, job: object) -> None:
        self.job_published.emit(_coerce_job(job))

    @Slot(object)
    def publish_active(self, active: object | None) -> None:
        if active is None:
            self.active_published.emit(None)
            return
        if isinstance(active, ActiveJobSnapshot):
            self.active_published.emit(active)
            return
        if isinstance(active, Mapping):
            self.active_published.emit(ActiveJobSnapshot.from_mapping(active))
            return
        raise TypeError("active must be ActiveJobSnapshot, mapping, or None")

    @Slot(bool)
    def publish_running(self, running: bool) -> None:
        self.running_published.emit(bool(running))

    @Slot(str)
    def publish_status_message(self, message: str) -> None:
        self.status_message_published.emit(message)

    @Slot(str)
    def publish_error(self, message: str) -> None:
        self.error_published.emit(message)

    @Slot()
    def allow_safe_close(self) -> None:
        self.safe_close_published.emit()

    def request_add_path(self, path: Path) -> bool:
        candidate = Path(path)
        if not str(candidate):
            return False
        self.add_videos_requested.emit((candidate,))
        return True

    def request_add_videos(self, paths: Iterable[Path]) -> bool:
        normalized = tuple(Path(path) for path in paths)
        if not normalized:
            return False
        self.add_videos_requested.emit(normalized)
        return True

    def request_start(self) -> None:
        self.start_transcription_requested.emit()

    def request_open_output_folder(self) -> None:
        self.open_output_folder_requested.emit()

    def request_close_action(self, action: str) -> None:
        self.close_action_requested.emit(action)

    def request_remove_job(self, job_id: str) -> None:
        self.remove_job_requested.emit(str(job_id))

    def request_clear_queue(self) -> None:
        self.clear_queue_requested.emit()


def _coerce_job(job: object) -> UiJob:
    if isinstance(job, UiJob):
        return job
    return UiJob.from_record(job)
