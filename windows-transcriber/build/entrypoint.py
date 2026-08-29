from __future__ import annotations

import importlib
import json
import sys
import traceback
from pathlib import Path

from emma_video_transcriber.infra import configure_runtime_environment, runtime_paths


def _show_fatal(message: str) -> None:
    try:
        import ctypes

        ctypes.windll.user32.MessageBoxW(0, message, "EMMA VIDEO TRANSCRIBER", 0x10)
    except Exception:
        print(message, file=sys.stderr)


def _self_check() -> int:
    state = configure_runtime_environment()
    paths = runtime_paths()
    result = {
        "ffmpeg": str(state.ffmpeg.ffmpeg),
        "ffprobe": str(state.ffmpeg.ffprobe),
        "ffmpeg_bundled": state.ffmpeg.bundled,
        "gpu_runtime": state.gpu.status,
        "app_data": str(paths.app_data),
        "models": str(paths.models),
        "temp": str(paths.temp),
    }
    # In a windowed PyInstaller build stdout is not visible, but returning 0 still
    # lets CI verify the packaged runtime. Source-mode runs can read this JSON.
    if sys.stdout is not None:
        print(json.dumps(result, ensure_ascii=False))
    return 0


def _launch_application() -> int:
    # Integration owns the final application entrypoint. These candidates keep the
    # packaging lane isolated while allowing the integrated package to be frozen
    # without editing engine/media/jobs/ui files here.
    candidates = (
        ("emma_video_transcriber.app", "main"),
        ("emma_video_transcriber.__main__", "main"),
        ("emma_video_transcriber.ui.app", "main"),
        ("emma_video_transcriber.ui.main", "main"),
    )
    errors: list[str] = []
    for module_name, function_name in candidates:
        try:
            module = importlib.import_module(module_name)
        except ModuleNotFoundError as exc:
            # Only treat absence of the candidate itself as a miss. A missing
            # dependency inside an existing candidate is a real packaging error.
            if exc.name == module_name or (exc.name and module_name.startswith(exc.name + ".")):
                errors.append(f"{module_name}: not present")
                continue
            raise
        entry = getattr(module, function_name, None)
        if callable(entry):
            result = entry()
            return int(result) if isinstance(result, int) else 0
        errors.append(f"{module_name}: no callable {function_name}()")

    raise RuntimeError(
        "No integrated application entrypoint is present yet. Packaging runtime is ready, "
        "but the integration lane must provide emma_video_transcriber.app.main() (preferred) "
        "or one of the documented fallback entrypoints.\n\n" + "\n".join(errors)
    )


def main() -> int:
    configure_runtime_environment()
    if "--self-check" in sys.argv:
        return _self_check()
    return _launch_application()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception as exc:
        paths = runtime_paths()
        log_path = Path(paths.logs) / "startup-error.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text(traceback.format_exc(), encoding="utf-8")
        _show_fatal(f"EMMA VIDEO TRANSCRIBER could not start.\n\n{exc}\n\nDetails: {log_path}")
        raise SystemExit(1)
