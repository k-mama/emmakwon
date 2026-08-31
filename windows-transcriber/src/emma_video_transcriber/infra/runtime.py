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


def configure_runtime_environment(*, probe_gpu: bool = True) -> RuntimeBootstrapState:
    """Configure deterministic writable caches and bundled executables.

    ``probe_gpu=False`` is the strict UI-process mode. It configures paths and
    FFmpeg but deliberately does not call NVIDIA driver/runtime APIs. The isolated
    transcription worker performs the real GPU probe/provisioning later. Keeping
    that native boundary out of the Qt process means a CUDA/driver failure cannot
    take the application window down merely because the UI bootstrapped runtime
    paths.
    """
    paths = runtime_paths()

    os.environ["HF_HOME"] = str(paths.cache / "huggingface")
    os.environ["HF_HUB_CACHE"] = str(paths.cache / "huggingface" / "hub")
    os.environ["TMP"] = str(paths.temp)
    os.environ["TEMP"] = str(paths.temp)

    ffmpeg = activate_ffmpeg_path()
    if not probe_gpu:
        gpu = GpuRuntimeState(
            "not_available",
            0,
            "GPU probing deferred to isolated transcription worker",
            path=None,
        )
        return RuntimeBootstrapState(ffmpeg=ffmpeg, gpu=gpu)

    gpu = gpu_runtime_state()
    if gpu.status == "ready":
        activate_gpu_runtime()
    return RuntimeBootstrapState(ffmpeg=ffmpeg, gpu=gpu)
