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

    Integration/worker -> UI publication slots:
      * publish_jobs(iterable[JobRecord | UiJob])
      * publish_job(JobRecord | UiJob)
      * publish_active(ActiveJobSnapshot | mapping | None)
      * publish_running(bool)
      * publish_status_message(str)
      * publish_error(str)
      * allow_safe_close()

    Worker QObjects should connect their signals to the publication slots. They must
    never call QWidget methods directly. Qt will queue cross-thread signal delivery.
    """

    # UI -> integration
    add_videos_requested = Signal(object)
    start_transcription_requested = Signal()
    open_output_folder_requested = Signal()
    close_action_requested = Signal(str)

    # Integration -> UI
    jobs_published = Signal(object)
    job_published = Signal(object)
    active_published = Signal(object)
    running_published = Signal(bool)
    status_message_published = Signal(str)
    error_published = Signal(str)
    safe_close_published = Signal()

    @Slot(object)
    def publish_jobs(self, jobs: Iterable[object]) -> None:
        snapshots = tuple(_coerce_job(job) for job in jobs)
        self.jobs_published.emit(snapshots)

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
        """Integration calls this only after an active job is safely paused/checkpointed."""
        self.safe_close_published.emit()

    def request_add_videos(self, paths: Iterable[Path]) -> None:
        normalized = tuple(Path(path) for path in paths)
        if normalized:
            self.add_videos_requested.emit(normalized)

    def request_start(self) -> None:
        self.start_transcription_requested.emit()

    def request_open_output_folder(self) -> None:
        self.open_output_folder_requested.emit()

    def request_close_action(self, action: str) -> None:
        self.close_action_requested.emit(action)


def _coerce_job(job: object) -> UiJob:
    if isinstance(job, UiJob):
        return job
    return UiJob.from_record(job)
