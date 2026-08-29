from __future__ import annotations

import os
from typing import Sequence

from .errors import ModelSelectionError


# Candidate names are never used blindly. select_supported_model validates them against
# faster_whisper.available_models() from the installed package first.
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
GPU_BATCH_SIZES: tuple[int, ...] = (8, 4, 2)
LOW_MEMORY_BATCH_SIZES: tuple[int, ...] = (4, 2, 1)


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


def default_cpu_threads() -> int:
    logical = os.cpu_count() or 8
    return min(12, max(4, logical - 2))
