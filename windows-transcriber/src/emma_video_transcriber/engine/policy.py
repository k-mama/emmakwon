from __future__ import annotations

from typing import Sequence

from ..performance import (
    PERFORMANCE_BALANCED,
    PERFORMANCE_MODE_ENV,
    PERFORMANCE_TURBO,
    SUPPORTED_PERFORMANCE_MODES,
    current_performance_mode,
    default_cpu_threads,
    gpu_batch_sizes,
    normalize_performance_mode,
)
from .errors import ModelSelectionError


MODEL_PRIORITY: tuple[str, ...] = (
    "turbo",
    "large-v3-turbo",
    "distil-large-v3.5",
    "distil-large-v3",
    "large-v3",
    "large",
)
GPU_COMPUTE_PRIORITY: tuple[str, ...] = (
    "float16",
    "int8_float16",
    "int8",
    "float32",
)
GPU_LOW_MEMORY_PRIORITY: tuple[str, ...] = (
    "int8_float16",
    "int8",
    "float16",
    "float32",
)
CPU_COMPUTE_PRIORITY: tuple[str, ...] = (
    "int8",
    "int8_float32",
    "float32",
)

# The child worker receives PERFORMANCE_MODE_ENV before Python starts.
GPU_BATCH_SIZES: tuple[int, ...] = gpu_batch_sizes()
LOW_MEMORY_BATCH_SIZES: tuple[int, ...] = (1,)


def performance_gpu_batch_sizes(mode: str | None = None) -> tuple[int, ...]:
    return gpu_batch_sizes(mode)


def select_supported_model(available_models: Sequence[str]) -> str:
    supported = set(available_models)
    for candidate in MODEL_PRIORITY:
        if candidate in supported:
            return candidate
    raise ModelSelectionError(
        "The installed faster-whisper version does not expose a supported fast "
        "multilingual model. Upgrade faster-whisper. Available models: "
        + ", ".join(sorted(supported))
    )


def pick_compute_type(supported: set[str], priority: Sequence[str]) -> str | None:
    return next((item for item in priority if item in supported), None)


def pick_alternate_compute_type(
    supported: set[str],
    priority: Sequence[str],
    current: str,
) -> str | None:
    return next(
        (item for item in priority if item in supported and item != current),
        None,
    )


def is_cuda_oom(exc: BaseException) -> bool:
    message = str(exc).lower()
    return any(
        token in message
        for token in (
            "out of memory",
            "cuda_error_out_of_memory",
            "cublas_status_alloc_failed",
            "failed to allocate",
        )
    )


def is_cuda_runtime_failure(exc: BaseException) -> bool:
    message = str(exc).lower()
    return any(
        token in message
        for token in (
            "cuda",
            "cudnn",
            "cublas",
            "nvidia",
            "driver",
            "compute capability",
        )
    )


def short_error(exc: BaseException) -> str:
    text = " ".join(str(exc).split())
    return text[:300] or exc.__class__.__name__


__all__ = [
    "CPU_COMPUTE_PRIORITY",
    "GPU_BATCH_SIZES",
    "GPU_COMPUTE_PRIORITY",
    "GPU_LOW_MEMORY_PRIORITY",
    "LOW_MEMORY_BATCH_SIZES",
    "MODEL_PRIORITY",
    "PERFORMANCE_BALANCED",
    "PERFORMANCE_MODE_ENV",
    "PERFORMANCE_TURBO",
    "SUPPORTED_PERFORMANCE_MODES",
    "current_performance_mode",
    "default_cpu_threads",
    "is_cuda_oom",
    "is_cuda_runtime_failure",
    "normalize_performance_mode",
    "performance_gpu_batch_sizes",
    "pick_alternate_compute_type",
    "pick_compute_type",
    "select_supported_model",
    "short_error",
]
