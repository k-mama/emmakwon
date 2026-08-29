from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EngineDiagnostics:
    gpu_name: str | None
    chosen_device: str
    chosen_compute_type: str
    model: str
    fallback_reason: str | None = None
