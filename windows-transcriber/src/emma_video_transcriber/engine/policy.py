from __future__ import annotations

import os
from typing import Sequence

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

PERFORMANCE_MODE_ENV = "EMMA_VIDEO_TRANSCRIBER_PERFORMANCE_MODE"
PERFORMANCE_BALANCED = "balanced"
PERFORMANCE_TURBO = "turbo"
SUPPORTED_PERFORMANCE_MODES = {PERFORMANCE_BALANCED, PERFORMANCE_TURBO}

# Kept as the conservative retry policy after OOM regardless of selected mode.
LOW_MEMORY_BATCH_SIZES: tuple[int, ...] = (1,)
# Backwards-compatible balanced constant for tests/importers. Runtime selection
# should use performance_gpu_batch_sizes().
GPU_BATCH_SIZES: tuple[int, ...] = (2, 1)


def normalize_performance_mode(value: str | None) -> str:
    mode = (value or PERFORMANCE_BALANCED).strip().lower()
    return mode if mode in SUPPORTED_PERFORMANCE_MODES else PERFORMANCE_BALANCED


def current_performance_mode() -> str:
    return normalize_performance_mode(os.environ.get(PERFORMANCE_MODE_ENV))


def performance_gpu_batch_sizes(mode: str | None = None) -> tuple[int, ...]:
    """Return the GPU batch policy for the selected desktop performance mode."""
    selected = normalize_performance_mode(mode or current_performance_mode())
    if selected == PERFORMANCE_TURBO:
        return (4, 2, 1)
    return GPU_BATCH_SIZES


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
    return next((item for item in priority if item in supported and item != current), None)


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


def default_cpu_threads(mode: str | None = None) -> int:
    """Choose helper CPU parallelism without changing recognition quality.

    Balanced reserves substantial desktop headroom. Turbo restores the older,
    throughput-first policy for times when the user is not actively using the PC.
    """
    logical = os.cpu_count() or 8
    selected = normalize_performance_mode(mode or current_performance_mode())
    if selected == PERFORMANCE_TURBO:
        return min(12, max(4, logical - 2))
    return min(6, max(2, logical // 4))
