from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from pathlib import Path

from .engine import FasterWhisperTranscriptionEngine
from .infra import (
    ModelManager,
    configure_runtime_environment,
    configure_windows_crash_dumps,
    enable_crash_diagnostics,
    ensure_gpu_runtime,
    record_stage,
    runtime_paths,
)
from .jobs import QueueEvent, QueueRunner, SqliteJobStore
from .media import MediaPipeline
from .output import Utf8TranscriptWriter


def _write_status(path: Path, **payload: object) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix(path.suffix + ".tmp")
        temp.write_text(json.dumps(payload, ensure_ascii=False, sort_keys=True), encoding="utf-8")
        os.replace(temp, path)
    except Exception:
        pass


def _event_payload(event: QueueEvent) -> dict[str, object]:
    return {
        "stage": event.kind,
        "job_id": event.job_id,
        "message": event.message,
        "error": event.error,
        "current_ms": event.current_ms,
        "duration_ms": event.duration_ms,
        "progress_percent": event.progress_percent,
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--db", required=True)
    parser.add_argument("--job", required=True)
    parser.add_argument("--status-file", required=True)
    parser.add_argument("--control-file", required=True)
    parser.add_argument("--force-cpu", action="store_true")
    return parser


def self_check() -> int:
    """Packaging-only check that the isolated-worker module is importable."""
    configure_runtime_environment()
    configure_windows_crash_dumps()
    if sys.stdout is not None:
        print("ISOLATED_WORKER_IMPORT_PASS")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    status_file = Path(args.status_file)
    control_file = Path(args.control_file)
    if args.force_cpu:
        os.environ["EMMA_VIDEO_TRANSCRIBER_FORCE_CPU"] = "1"

    configure_runtime_environment()
    paths = runtime_paths()
    enable_crash_diagnostics()
    configure_windows_crash_dumps()
    record_stage(
        "isolated_worker_start",
        job_id=args.job,
        force_cpu=bool(args.force_cpu),
        worker_pid=os.getpid(),
    )
    _write_status(
        status_file,
        stage="worker_start",
        job_id=args.job,
        message="Starting isolated transcription worker…",
        force_cpu=bool(args.force_cpu),
    )

    try:
        _write_status(status_file, stage="model_prepare", job_id=args.job, message="Preparing local transcription model…")
        model_path = ModelManager().ensure_model(
            progress=lambda state: _write_status(
                status_file,
                stage=f"model_{getattr(state, 'status', 'progress')}",
                job_id=args.job,
                message=str(getattr(state, "message", "Preparing model")),
                progress=int(getattr(state, "progress", 0) or 0),
            )
        )

        if not args.force_cpu:
            _write_status(status_file, stage="gpu_prepare", job_id=args.job, message="Preparing GPU acceleration…")
            gpu_state = ensure_gpu_runtime(
                progress=lambda state: _write_status(
                    status_file,
                    stage=f"gpu_{getattr(state, 'status', 'progress')}",
                    job_id=args.job,
                    message=str(getattr(state, "message", "Preparing GPU")),
                    progress=int(getattr(state, "progress", 0) or 0),
                )
            )
            if gpu_state.status != "ready":
                os.environ["EMMA_VIDEO_TRANSCRIBER_FORCE_CPU"] = "1"

        engine = FasterWhisperTranscriptionEngine(model_path=model_path)
        diagnostics = engine.get_diagnostics()
        _write_status(
            status_file,
            stage="engine_ready",
            job_id=args.job,
            message=(
                "CPU fallback active after isolated worker recovery."
                if diagnostics.chosen_device == "cpu" and args.force_cpu
                else f"{diagnostics.chosen_device.upper()} transcription worker ready."
            ),
            device=diagnostics.chosen_device,
            compute_type=diagnostics.chosen_compute_type,
        )

        media = MediaPipeline(
            ffmpeg_path=str(configure_runtime_environment().ffmpeg.ffmpeg),
            ffprobe_path=str(configure_runtime_environment().ffmpeg.ffprobe),
            temp_dir=paths.temp / "audio-chunks",
        )
        store = SqliteJobStore(Path(args.db))
        writer = Utf8TranscriptWriter()

        def on_event(event: QueueEvent) -> None:
            payload = _event_payload(event)
            payload["device"] = diagnostics.chosen_device
            payload["compute_type"] = diagnostics.chosen_compute_type
            _write_status(status_file, **payload)

        runner = QueueRunner(
            media=media,
            engine=engine,
            writer=writer,
            store=store,
            callback=on_event,
            default_chunk_ms=600_000,
            cleanup_chunks=True,
            control_file=control_file,
        )
        runner.run_one(args.job, resume_paused=True)
        final_job = store.get(args.job)
        final_status = final_job.status if final_job is not None else "removed"
        _write_status(
            status_file,
            stage="worker_finished",
            job_id=args.job,
            message=f"Worker finished: {final_status}",
            final_status=final_status,
        )
        record_stage("isolated_worker_end", job_id=args.job, final_status=final_status, worker_pid=os.getpid())
        return 0
    except Exception as exc:
        error_text = " ".join(str(exc).split())[:1000] or exc.__class__.__name__
        record_stage(
            "isolated_worker_python_failure",
            job_id=args.job,
            error=error_text,
            worker_pid=os.getpid(),
        )
        _write_status(
            status_file,
            stage="fatal_python_error",
            job_id=args.job,
            message=error_text,
            error=error_text,
            traceback=traceback.format_exc(),
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
