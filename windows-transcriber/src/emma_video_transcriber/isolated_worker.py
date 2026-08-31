from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path

from PySide6.QtCore import QObject, Signal, Slot

from .infra import (
    configure_runtime_environment,
    recent_windows_application_error,
    record_stage,
    runtime_paths,
)
from .infra.process_lifetime import bind_child_to_parent_lifetime, release_parent_lifetime_job
from .jobs import QueueEvent, SqliteJobStore


class TranscriptionWorker(QObject):
    """Run every transcription job in a separate OS process.

    QThread is only a coordinator. It never probes NVIDIA/CUDA. The child process
    owns GPU runtime setup, CTranslate2, faster-whisper, FFmpeg chunking and TXT
    writes. On Windows each child is bound to the UI lifetime with a Job Object.
    """

    queue_event = Signal(object)
    status_message = Signal(str)
    error = Signal(str)
    finished = Signal()

    def __init__(self, db_path: Path) -> None:
        super().__init__()
        self.db_path = Path(db_path)
        self._pause_requested = threading.Event()
        self._process: subprocess.Popen[bytes] | None = None
        self._control_file: Path | None = None
        self._lifetime_job_handle: int | None = None

    def request_pause(self) -> None:
        self._pause_requested.set()
        control = self._control_file
        if control is not None:
            try:
                control.parent.mkdir(parents=True, exist_ok=True)
                control.write_text("pause", encoding="utf-8")
            except OSError:
                pass

    @Slot()
    def run(self) -> None:
        try:
            # This object still lives inside the Qt parent process even though it
            # runs on a QThread. Never load/probe GPU-native libraries here.
            configure_runtime_environment(probe_gpu=False)
            store = SqliteJobStore(self.db_path)
            candidates = [
                job for job in store.list_all() if job.status in {"queued", "paused", "failed"}
            ]
            self.queue_event.emit(QueueEvent("queue_status", message=f"{len(candidates)} job(s) ready"))

            for candidate in candidates:
                if self._pause_requested.is_set():
                    break
                job = store.get(candidate.job_id)
                if job is None:
                    self.queue_event.emit(
                        QueueEvent("job_skipped", job_id=candidate.job_id, message="removed before start")
                    )
                    continue
                if job.status not in {"queued", "paused", "failed"}:
                    continue

                result = self._run_isolated_job(store, job.job_id, force_cpu=False)
                if result[0] != 0 and not result[1]:
                    crash_code = self._format_exit_code(result[0])
                    latest = store.get(job.job_id)
                    if latest is not None:
                        if latest.status == "processing":
                            latest.status = "paused"
                        latest.error = None
                        latest.metadata["isolated_native_crash"] = crash_code
                        latest.metadata["force_cpu_retry"] = "1"
                        store.update(latest)
                    windows_event = recent_windows_application_error()
                    record_stage(
                        "isolated_worker_native_crash",
                        job_id=job.job_id,
                        exit_code=crash_code,
                        windows_application_error=windows_event,
                    )
                    self.status_message.emit(
                        f"The GPU/native worker crashed ({crash_code}), but the app stayed open. "
                        "Retrying this video safely on CPU from the last saved point…"
                    )
                    result = self._run_isolated_job(store, job.job_id, force_cpu=True)
                    if result[0] != 0:
                        latest = store.get(job.job_id)
                        if latest is not None:
                            latest.status = "failed"
                            latest.error = (
                                "Isolated transcription worker failed on GPU/native path and CPU retry "
                                f"also exited ({self._format_exit_code(result[0])})."
                            )
                            store.update(latest)
                        self.error.emit(
                            "This video could not be completed even after the isolated CPU recovery. "
                            "Crash evidence was preserved in the app logs."
                        )
                elif result[0] != 0 and result[1]:
                    latest = store.get(job.job_id)
                    if latest is not None and latest.status == "processing":
                        latest.status = "failed"
                        latest.error = result[2] or "Isolated worker failed."
                        store.update(latest)
                    if result[2]:
                        self.error.emit(result[2])

                latest = store.get(job.job_id)
                if latest is None:
                    continue
                self._emit_terminal_snapshot(latest)
                if latest.status == "paused" or self._pause_requested.is_set():
                    break

            self.queue_event.emit(QueueEvent("queue_completed", message="queue run finished"))
        except Exception as exc:
            self.error.emit(str(exc))
        finally:
            self._process = None
            self._control_file = None
            release_parent_lifetime_job(self._lifetime_job_handle)
            self._lifetime_job_handle = None
            self.finished.emit()

    def _run_isolated_job(
        self,
        store: SqliteJobStore,
        job_id: str,
        *,
        force_cpu: bool,
    ) -> tuple[int, bool, str | None]:
        paths = runtime_paths()
        control_dir = paths.temp / "isolated-workers"
        control_dir.mkdir(parents=True, exist_ok=True)
        token = uuid.uuid4().hex
        status_file = control_dir / f"{token}.status.json"
        control_file = control_dir / f"{token}.control"
        self._control_file = control_file

        args = [
            "--db", str(self.db_path),
            "--job", job_id,
            "--status-file", str(status_file),
            "--control-file", str(control_file),
        ]
        if force_cpu:
            args.append("--force-cpu")
        if getattr(sys, "frozen", False):
            command = [sys.executable, "--job-worker", *args]
        else:
            command = [sys.executable, "-m", "emma_video_transcriber.worker_process", *args]

        env = os.environ.copy()
        if force_cpu:
            env["EMMA_VIDEO_TRANSCRIBER_FORCE_CPU"] = "1"
        else:
            env.pop("EMMA_VIDEO_TRANSCRIBER_FORCE_CPU", None)

        # The worker is compute-heavy by design, but the desktop UI and the rest
        # of Windows should win CPU scheduling contests. GPU load is separately
        # bounded by the balanced batch policy. BELOW_NORMAL does not change
        # inference correctness; it only gives foreground apps scheduling headroom.
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        if os.name == "nt":
            creationflags |= getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0)

        record_stage(
            "isolated_worker_spawn",
            job_id=job_id,
            force_cpu=force_cpu,
            priority="below_normal" if os.name == "nt" else "default",
        )
        process = subprocess.Popen(
            command,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags,
        )
        self._process = process
        lifetime_job_handle: int | None = None
        try:
            try:
                if os.name == "nt":
                    process_handle = int(getattr(process, "_handle"))
                    lifetime_job_handle = bind_child_to_parent_lifetime(process_handle)
                    self._lifetime_job_handle = lifetime_job_handle
                    record_stage(
                        "isolated_worker_parent_lifetime_bound",
                        job_id=job_id,
                        worker_pid=process.pid,
                        force_cpu=force_cpu,
                    )
            except Exception as exc:
                record_stage(
                    "isolated_worker_parent_lifetime_bind_failed",
                    job_id=job_id,
                    worker_pid=process.pid,
                    error=str(exc),
                )
                try:
                    process.terminate()
                    process.wait(timeout=5)
                except Exception:
                    try:
                        process.kill()
                    except Exception:
                        pass
                raise RuntimeError(
                    "Could not establish safe worker lifetime containment. "
                    "The transcription was not started so no orphan worker can be left behind."
                ) from exc

            last_current = -1
            last_status: str | None = None
            last_message: str | None = None
            structured_failure = False
            structured_error: str | None = None

            while process.poll() is None:
                if self._pause_requested.is_set():
                    try:
                        control_file.write_text("pause", encoding="utf-8")
                    except OSError:
                        pass

                payload = self._read_status(status_file)
                if payload:
                    message = str(payload.get("message") or "")
                    if message and message != last_message:
                        self.status_message.emit(message)
                        last_message = message
                    if payload.get("stage") == "fatal_python_error":
                        structured_failure = True
                        structured_error = str(payload.get("error") or message or "Worker failed")

                current = store.get(job_id)
                if current is not None:
                    if current.status == "processing" and last_status != "processing":
                        self.queue_event.emit(self._event_for_job("job_started", current))
                    if current.current_ms != last_current and current.current_ms > 0:
                        self.queue_event.emit(self._event_for_job("chunk_committed", current))
                        self.queue_event.emit(self._event_for_job("progress", current))
                    last_current = current.current_ms
                    last_status = current.status
                time.sleep(0.25)

            exit_code = int(process.returncode or 0)
            payload = self._read_status(status_file)
            if payload and payload.get("stage") == "fatal_python_error":
                structured_failure = True
                structured_error = str(payload.get("error") or payload.get("message") or "Worker failed")
            record_stage(
                "isolated_worker_exit",
                job_id=job_id,
                force_cpu=force_cpu,
                exit_code=self._format_exit_code(exit_code),
                structured_failure=structured_failure,
            )
            return exit_code, structured_failure, structured_error
        finally:
            self._process = None
            self._control_file = None
            release_parent_lifetime_job(lifetime_job_handle)
            if self._lifetime_job_handle == lifetime_job_handle:
                self._lifetime_job_handle = None
            for path in (control_file, status_file):
                try:
                    path.unlink(missing_ok=True)
                except OSError:
                    pass

    @staticmethod
    def _read_status(path: Path) -> dict[str, object] | None:
        try:
            if not path.is_file():
                return None
            data = json.loads(path.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else None
        except (OSError, json.JSONDecodeError):
            return None

    @staticmethod
    def _format_exit_code(code: int) -> str:
        return f"0x{(int(code) & 0xFFFFFFFF):08X}"

    @staticmethod
    def _event_for_job(kind: str, job: object) -> QueueEvent:
        current_ms = int(getattr(job, "current_ms", 0) or 0)
        duration_ms = int(getattr(job, "duration_ms", -1) or -1)
        percent = None
        if duration_ms > 0:
            percent = min(100, int(current_ms * 100 / duration_ms))
        return QueueEvent(
            kind,
            job_id=str(getattr(job, "job_id", "")),
            source_path=Path(getattr(job, "source_path")),
            output_path=Path(getattr(job, "output_path")),
            current_ms=current_ms,
            duration_ms=duration_ms,
            progress_percent=percent,
            error=getattr(job, "error", None),
        )

    def _emit_terminal_snapshot(self, job: object) -> None:
        status = str(getattr(job, "status", ""))
        mapping = {
            "completed": "job_completed",
            "failed": "job_failed",
            "paused": "job_paused",
        }
        kind = mapping.get(status)
        if kind:
            self.queue_event.emit(self._event_for_job(kind, job))


__all__ = ["TranscriptionWorker"]
