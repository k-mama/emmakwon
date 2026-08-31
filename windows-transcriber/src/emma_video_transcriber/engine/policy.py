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

# Desktop-first balanced defaults.
#
# This application is normally left running while the user continues using the
# same Windows PC. A batch size of 4 produced excellent throughput on RTX 4070
# class hardware, but it also made the whole desktop noticeably less responsive.
# The native worker/process isolation already removed the need to chase maximum
# throughput for reliability. Start with 2 and retain 1 as the conservative
# retry. A future explicit Turbo mode can opt back into larger batches.
GPU_BATCH_SIZES: tuple[int, ...] = (2, 1)
LOW_MEMORY_BATCH_SIZES: tuple[int, ...] = (1,)


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
    """Keep enough CPU capacity free for normal desktop use.

    CTranslate2's CPU helpers are useful even on the CUDA path. The previous
    policy used up to 12 logical threads, which was appropriate for a dedicated
    batch machine but too aggressive for an interactive Windows workstation.
    Roughly one quarter of logical CPUs, capped at six, leaves substantial
    scheduling headroom for browsers, editors and the OS without crippling the
    fallback CPU path.
    """
    logical = os.cpu_count() or 8
    return min(6, max(2, logical // 4))
