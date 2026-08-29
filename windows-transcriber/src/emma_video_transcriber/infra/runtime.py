from __future__ import annotations

import os
from dataclasses import dataclass

from .ffmpeg import FFmpegRuntime, activate_ffmpeg_path
from .gpu_runtime import GpuRuntimeState, activate_gpu_runtime, gpu_runtime_state
from .paths import runtime_paths


@dataclass(frozen=True)
class RuntimeBootstrapState:
    ffmpeg: FFmpegRuntime
    gpu: GpuRuntimeState


def configure_runtime_environment() -> RuntimeBootstrapState:
    """Configure deterministic writable caches and bundled executables.

    This function is safe to call at app startup. It does not download the model or
    NVIDIA libraries. Integration code can call ModelManager.ensure_model() and
    ensure_gpu_runtime() when the first transcription starts.
    """
    paths = runtime_paths()

    # These are process-local overrides. They keep every cache/temp write owned by
    # this application under LOCALAPPDATA instead of inheriting an arbitrary shell
    # setting or ever drifting beside the user's source media.
    os.environ["HF_HOME"] = str(paths.cache / "huggingface")
    os.environ["HF_HUB_CACHE"] = str(paths.cache / "huggingface" / "hub")
    os.environ["TMP"] = str(paths.temp)
    os.environ["TEMP"] = str(paths.temp)

    ffmpeg = activate_ffmpeg_path()
    gpu = gpu_runtime_state()
    if gpu.status == "ready":
        activate_gpu_runtime()
    return RuntimeBootstrapState(ffmpeg=ffmpeg, gpu=gpu)
