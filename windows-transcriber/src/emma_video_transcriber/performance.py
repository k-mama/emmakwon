from __future__ import annotations

import os


PERFORMANCE_MODE_ENV = "EMMA_VIDEO_TRANSCRIBER_PERFORMANCE_MODE"
PERFORMANCE_BALANCED = "balanced"
PERFORMANCE_TURBO = "turbo"
SUPPORTED_PERFORMANCE_MODES = {PERFORMANCE_BALANCED, PERFORMANCE_TURBO}


def normalize_performance_mode(value: str | None) -> str:
    mode = (value or PERFORMANCE_BALANCED).strip().lower()
    return mode if mode in SUPPORTED_PERFORMANCE_MODES else PERFORMANCE_BALANCED


def current_performance_mode() -> str:
    return normalize_performance_mode(os.environ.get(PERFORMANCE_MODE_ENV))


def default_cpu_threads(mode: str | None = None) -> int:
    """Choose CPU helper parallelism without changing recognition quality."""
    logical = os.cpu_count() or 8
    selected = normalize_performance_mode(mode or current_performance_mode())
    if selected == PERFORMANCE_TURBO:
        return min(12, max(4, logical - 2))
    return min(6, max(2, logical // 4))


def gpu_batch_sizes(mode: str | None = None) -> tuple[int, ...]:
    selected = normalize_performance_mode(mode or current_performance_mode())
    return (4, 2, 1) if selected == PERFORMANCE_TURBO else (2, 1)


__all__ = [
    "PERFORMANCE_MODE_ENV",
    "PERFORMANCE_BALANCED",
    "PERFORMANCE_TURBO",
    "SUPPORTED_PERFORMANCE_MODES",
    "current_performance_mode",
    "default_cpu_threads",
    "gpu_batch_sizes",
    "normalize_performance_mode",
]
