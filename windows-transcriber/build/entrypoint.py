from __future__ import annotations

import importlib
import json
import os
import sys
import traceback
from pathlib import Path

from emma_video_transcriber.infra import configure_runtime_environment, runtime_paths

_DEVNULL_STREAMS: list[object] = []


def _ensure_standard_streams() -> None:
    """Provide writable stdio for third-party libraries in console=False builds."""
    if sys.stdout is None:
        stream = open(os.devnull, "w", encoding="utf-8")
        _DEVNULL_STREAMS.append(stream)
        sys.stdout = stream
    if sys.stderr is None:
        stream = open(os.devnull, "w", encoding="utf-8")
        _DEVNULL_STREAMS.append(stream)
        sys.stderr = stream


def _show_fatal(message: str) -> None:
    try:
        import ctypes

        ctypes.windll.user32.MessageBoxW(0, message, "EMMA VIDEO TRANSCRIBER", 0x10)
    except Exception:
        if sys.stderr is not None:
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
    if sys.stdout is not None:
        print(json.dumps(result, ensure_ascii=False))
    return 0


def _launch_application() -> int:
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
    _ensure_standard_streams()
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
