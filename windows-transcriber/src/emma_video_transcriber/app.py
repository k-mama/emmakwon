from __future__ import annotations

import os
import threading
import time
from datetime import datetime
from pathlib import Path

from PySide6.QtCore import QObject, QThread, Signal, Slot
from PySide6.QtWidgets import QApplication

from .engine import FasterWhisperTranscriptionEngine
from .infra import (
    ModelManager,
    begin_session,
    configure_runtime_environment,
    enable_crash_diagnostics,
    end_session,
    ensure_gpu_runtime,
    runtime_paths,
)
from .jobs import QueueEvent, QueueRunner, SqliteJobStore
from .media import MediaPipeline
from .output import Utf8TranscriptWriter, recover_output
from .ui import MainWindow, UiEventBridge


def default_output_dir() -> Path:
    """Return the user-visible transcript folder without touching source media."""
    home = Path(os.environ.get("USERPROFILE") or Path.home())
    output = home / "Downloads" / "EmmaVideoTranscriber"
    output.mkdir(parents=True, exist_ok=True)
    return output


def _path_identity(path: Path) -> str:
    return os.path.normcase(os.path.abspath(os.path.normpath(str(path))))


def _recover_interrupted_jobs(store: SqliteJobStore) -> None:
    """Repair a pending append journal and make stale processing jobs resumable."""
    for job in store.list_all():
        try:
            recover_output(job.output_path, committed_ms=job.current_ms, job_id=job.job_id)
        except Exception as exc:
            job.status = "failed"
            job.error = f"recovery failed: {exc}"
            store.update(job)
            continue
        if job.status == "processing":
            job.status = "paused"
            job.error = None
            job.metadata["interrupted_recovery"] = "1"
            store.update(job)


def _format_eta(seconds: float | None) -> str | None:
    if seconds is None or seconds < 0:
        return None
    total = int(round(seconds))
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours:d}h {minutes:02d}m"
    if minutes:
        return f"{minutes:d}m {secs:02d}s"
    return f"{secs:d}s"


class TranscriptionWorker(QObject):
    """Own first-use preparation and QueueRunner execution on a dedicated QThread."""

    queue_event = Signal(object)
    status_message = Signal(str)
    error = Signal(str)
    finished = Signal()

    def __init__(self, db_path: Path) -> None:
        super().__init__()
        self.db_path = Path(db_path)
        self._runner: QueueRunner | None = None
        self._pause_requested = threading.Event()

    def request_pause(self) -> None:
        """Thread-safe: QueueRunner itself uses threading.Event for pause requests."""
        self._pause_requested.set()
        runner = self._runner
        if runner is not None:
            runner.request_pause()

    @Slot()
    def run(self) -> None:
        try:
            bootstrap = configure_runtime_environment()
            paths = runtime_paths()

            self.status_message.emit("Preparing the local transcription model…")
            model_path = ModelManager().ensure_model(progress=self._on_model_progress)

            if self._pause_requested.is_set():
                self.status_message.emit("Transcription start cancelled safely.")
                return

            gpu_state = ensure_gpu_runtime(progress=self._on_gpu_progress)
            if gpu_state.status == "ready":
                self.status_message.emit("GPU acceleration ready.")
            elif gpu_state.status in {"not_available", "failure"}:
                self.status_message.emit("GPU acceleration is unavailable. Using CPU.")

            if self._pause_requested.is_set():
                self.status_message.emit("Transcription start cancelled safely.")
                return

            engine = FasterWhisperTranscriptionEngine(model_path=model_path)
            diagnostics = engine.get_diagnostics()
            if diagnostics.chosen_device == "cuda":
                self.status_message.emit("GPU acceleration ready. Starting transcription…")
            else:
                self.status_message.emit("Using CPU. Starting transcription…")

            media = MediaPipeline(
                ffmpeg_path=str(bootstrap.ffmpeg.ffmpeg),
                ffprobe_path=str(bootstrap.ffmpeg.ffprobe),
                temp_dir=paths.temp / "audio-chunks",
            )
            store = SqliteJobStore(self.db_path)
            writer = Utf8TranscriptWriter()
            runner = QueueRunner(
                media=media,
                engine=engine,
                writer=writer,
                store=store,
                callback=self.queue_event.emit,
                default_chunk_ms=600_000,
                cleanup_chunks=True,
            )
            self._runner = runner

            # The UI intentionally treats failed jobs as actionable. START retries
            # them from their last durable checkpoint before processing the queue.
            for job in store.list_all():
                if job.status != "failed":
                    continue
                try:
                    runner.retry_failed(job.job_id)
                except Exception:
                    # A retry that cannot be repaired remains failed; other jobs
                    # should still be allowed to run.
                    continue

            if self._pause_requested.is_set():
                self.status_message.emit("Transcription start cancelled safely.")
                return

            runner.run(resume_paused=True)
        except Exception as exc:
            self.error.emit(str(exc))
        finally:
            self._runner = None
            self.finished.emit()

    def _on_model_progress(self, state: object) -> None:
        status = str(getattr(state, "status", ""))
        progress = int(getattr(state, "progress", 0) or 0)
        message = str(getattr(state, "message", "Preparing transcription model"))
        if status == "downloading":
            self.status_message.emit(f"{message}… {progress}%")
        elif status == "ready":
            self.status_message.emit("Transcription model ready.")
        elif status == "failure":
            self.status_message.emit("Transcription model download failed.")

    def _on_gpu_progress(self, state: object) -> None:
        status = str(getattr(state, "status", ""))
        progress = int(getattr(state, "progress", 0) or 0)
        message = str(getattr(state, "message", "Preparing GPU acceleration"))
        if status == "downloading":
            self.status_message.emit(f"{message}… {progress}%")
        elif status == "ready":
            self.status_message.emit("GPU acceleration ready.")
        elif status == "failure":
            self.status_message.emit("GPU setup failed. CPU mode remains available.")


class ApplicationController(QObject):
    """Wire UI requests to durable queue/media/engine services."""

    def __init__(self, bridge: UiEventBridge) -> None:
        super().__init__(bridge)
        self.bridge = bridge
        configure_runtime_environment()
        paths = runtime_paths()
        self.db_path = paths.app_data / "jobs.sqlite3"
        self.output_dir = default_output_dir()
        self.store = SqliteJobStore(self.db_path)
        _recover_interrupted_jobs(self.store)

        self._thread: QThread | None = None
        self._worker: TranscriptionWorker | None = None
        self._close_after_pause = False
        self._active_job_id: str | None = None
        self._active_started_at = 0.0
        self._active_start_ms = 0
        self._last_checkpoint_text: str | None = None

        bridge.add_videos_requested.connect(self.add_paths)
        bridge.start_transcription_requested.connect(self.start_transcription)
        bridge.open_output_folder_requested.connect(self.open_output_folder)
        bridge.close_action_requested.connect(self.handle_close_action)
        bridge.remove_job_requested.connect(self.remove_job)
        bridge.clear_queue_requested.connect(self.clear_queue)

    def publish_initial_state(self) -> None:
        self.bridge.publish_jobs(self.store.list_all())
        self.bridge.publish_running(False)
        self.bridge.publish_status_message("Ready. Paste a complete video path above, then press +.")

    @Slot(object)
    def add_paths(self, paths: object) -> None:
        try:
            requested = tuple(Path(path) for path in paths)  # type: ignore[arg-type]
        except Exception:
            self.bridge.publish_error("Could not read the selected video path.")
            return
        if not requested:
            return

        existing = {_path_identity(job.source_path) for job in self.store.list_all()}
        added = 0
        for source in requested:
            if not source.is_file():
                self.bridge.publish_error(f"File not found: {source}")
                continue
            key = _path_identity(source)
            if key in existing:
                self.bridge.publish_error("This video is already in the queue.")
                continue
            try:
                job = self.store.enqueue(source, self.output_dir)
            except Exception as exc:
                self.bridge.publish_error(f"Could not add this video to the queue: {exc}")
                continue
            existing.add(key)
            added += 1
            self.bridge.publish_job(job)

        if added:
            self.bridge.publish_status_message(
                f"Added {added} video{'s' if added != 1 else ''}. Ready to transcribe."
            )

    @Slot()
    def start_transcription(self) -> None:
        if self._thread is not None and self._thread.isRunning():
            return

        candidates = [
            job for job in self.store.list_all() if job.status in {"queued", "paused", "failed"}
        ]
        if not candidates:
            self.bridge.publish_status_message("There are no queued videos to transcribe.")
            return

        self._close_after_pause = False
        self.bridge.publish_running(True)
        self.bridge.publish_status_message("Preparing local transcription…")

        thread = QThread(self)
        worker = TranscriptionWorker(self.db_path)
        worker.moveToThread(thread)

        thread.started.connect(worker.run)
        worker.queue_event.connect(self._handle_queue_event)
        worker.status_message.connect(self.bridge.publish_status_message)
        worker.error.connect(self.bridge.publish_error)
        worker.finished.connect(thread.quit)
        worker.finished.connect(worker.deleteLater)
        thread.finished.connect(self._worker_thread_finished)
        thread.finished.connect(thread.deleteLater)

        self._thread = thread
        self._worker = worker
        thread.start()

    @Slot(object)
    def _handle_queue_event(self, event: QueueEvent) -> None:
        job = self.store.get(event.job_id) if event.job_id else None
        if job is not None:
            self.bridge.publish_job(job)

        if event.kind == "queue_status":
            if event.message:
                self.bridge.publish_status_message(event.message)
            return

        if event.kind == "job_started":
            self._active_job_id = event.job_id
            self._active_started_at = time.monotonic()
            self._active_start_ms = int(event.current_ms or 0)
            self._last_checkpoint_text = None
            self._publish_active(event)
            return

        if event.kind == "chunk_committed":
            self._last_checkpoint_text = datetime.now().strftime("%H:%M:%S")
            self._publish_active(event)
            return

        if event.kind == "progress":
            self._publish_active(event)
            return

        if event.kind == "job_completed":
            name = event.output_path.name if event.output_path else "TXT"
            self.bridge.publish_status_message(f"Completed. Saved as {name}.")
            return

        if event.kind == "job_failed":
            self.bridge.publish_status_message(event.error or "A transcription job failed.")
            return

        if event.kind == "job_paused":
            self.bridge.publish_status_message("Paused at the latest safe save point.")
            return

        if event.kind == "job_skipped":
            self.bridge.publish_jobs(self.store.list_all())
            return

        if event.kind == "recovery" and event.message:
            self.bridge.publish_status_message(f"Recovered previous work: {event.message}")
            return

        if event.kind == "queue_completed":
            self.bridge.publish_jobs(self.store.list_all())
            self.bridge.publish_status_message("Queue finished.")

    def _publish_active(self, event: QueueEvent) -> None:
        if not event.job_id:
            return
        current_ms = int(event.current_ms or 0)
        duration_ms = int(event.duration_ms or -1)
        elapsed = max(0.0, time.monotonic() - self._active_started_at)
        processed_seconds = max(0, current_ms - self._active_start_ms) / 1000
        speed: float | None = None
        eta_seconds: float | None = None
        if elapsed > 0.5 and processed_seconds > 0:
            speed = processed_seconds / elapsed
            if speed > 0 and duration_ms > current_ms:
                eta_seconds = ((duration_ms - current_ms) / 1000) / speed

        self.bridge.publish_active(
            {
                "job_id": event.job_id,
                "source_path": str(event.source_path or ""),
                "output_name": event.output_path.name if event.output_path else "",
                "current_ms": current_ms,
                "duration_ms": duration_ms,
                "percent": event.progress_percent,
                "speed_text": f"{speed:.1f}× realtime" if speed is not None else None,
                "eta_text": _format_eta(eta_seconds),
                "checkpoint_text": self._last_checkpoint_text or "Waiting for first safe save",
            }
        )

    @Slot()
    def _worker_thread_finished(self) -> None:
        self.bridge.publish_jobs(self.store.list_all())
        self.bridge.publish_active(None)
        self.bridge.publish_running(False)
        self._worker = None
        self._thread = None
        if self._close_after_pause:
            self._close_after_pause = False
            self.bridge.allow_safe_close()

    @Slot(str)
    def handle_close_action(self, action: str) -> None:
        if action == "pause_and_close":
            self._close_after_pause = True
            worker = self._worker
            thread = self._thread
            if worker is not None and thread is not None and thread.isRunning():
                worker.request_pause()
                self.bridge.publish_status_message("Finishing the current safe segment…")
            else:
                self._close_after_pause = False
                self.bridge.allow_safe_close()
            return
        # keep_running and cancel intentionally require no backend mutation.

    @Slot(str)
    def remove_job(self, job_id: str) -> None:
        try:
            self.store.remove(job_id)
        except ValueError as exc:
            self.bridge.publish_error(str(exc))
            return
        self.bridge.publish_jobs(self.store.list_all())
        self.bridge.publish_status_message("Removed from the queue.")

    @Slot()
    def clear_queue(self) -> None:
        removed = 0
        for job in self.store.list_all():
            if job.status == "processing":
                continue
            try:
                self.store.remove(job.job_id)
                removed += 1
            except ValueError:
                continue
        self.bridge.publish_jobs(self.store.list_all())
        if removed:
            self.bridge.publish_status_message(
                f"Cleared {removed} item{'s' if removed != 1 else ''} from the queue."
            )
        else:
            self.bridge.publish_status_message("Nothing to clear.")

    @Slot()
    def open_output_folder(self) -> None:
        try:
            self.output_dir.mkdir(parents=True, exist_ok=True)
            if os.name == "nt":
                os.startfile(str(self.output_dir))  # type: ignore[attr-defined]
            else:
                self.bridge.publish_status_message(str(self.output_dir))
        except Exception as exc:
            self.bridge.publish_error(f"Could not open the output folder: {exc}")


def main() -> int:
    configure_runtime_environment()
    enable_crash_diagnostics()
    previous_session = begin_session()

    app = QApplication.instance() or QApplication([])
    app.setApplicationName("EMMA VIDEO TRANSCRIBER")
    app.setOrganizationName("EmmaKwon")

    bridge = UiEventBridge()
    controller = ApplicationController(bridge)
    window = MainWindow(bridge)
    controller.publish_initial_state()
    if previous_session and previous_session.get("last_job_id"):
        source = previous_session.get("last_source") or "a previous job"
        stage = previous_session.get("last_stage") or "an earlier stage"
        bridge.publish_status_message(
            f"The previous session did not close cleanly while working on {source} "
            f"(last recorded stage: {stage}). Already-saved text is preserved; "
            "affected jobs are resumable from the queue."
        )
    window.show()
    app.aboutToQuit.connect(end_session)

    # Keep strong references for the lifetime of the Qt event loop.
    window._emma_controller = controller  # type: ignore[attr-defined]
    return int(app.exec())


__all__ = ["ApplicationController", "TranscriptionWorker", "default_output_dir", "main"]
