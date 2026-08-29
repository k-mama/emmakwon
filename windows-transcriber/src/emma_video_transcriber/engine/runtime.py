from __future__ import annotations

import subprocess
from typing import Any, Sequence

from .errors import EngineDependencyError


class FasterWhisperRuntime:
    """Adapter around optional faster-whisper/CTranslate2 runtime dependencies."""

    def __init__(self) -> None:
        try:
            import ctranslate2  # type: ignore
            import faster_whisper  # type: ignore
        except ImportError as exc:
            raise EngineDependencyError(
                "The local transcription runtime is not installed. "
                "Install faster-whisper and CTranslate2 before starting transcription.",
                cause=exc,
            ) from exc

        self.ctranslate2 = ctranslate2
        self.faster_whisper = faster_whisper

    def available_models(self) -> Sequence[str]:
        available = getattr(self.faster_whisper, "available_models", None)
        if available is None:
            raise EngineDependencyError(
                "This faster-whisper build cannot report supported models. "
                "Upgrade faster-whisper instead of guessing a model identifier."
            )
        return tuple(available())

    def cuda_device_count(self) -> int:
        try:
            return int(self.ctranslate2.get_cuda_device_count())
        except Exception:
            return 0

    def supported_compute_types(self, device: str, device_index: int) -> set[str]:
        try:
            return set(self.ctranslate2.get_supported_compute_types(device, device_index))
        except TypeError:
            return set(self.ctranslate2.get_supported_compute_types(device))

    def create_model(
        self,
        model_name: str,
        *,
        device: str,
        compute_type: str,
        device_index: int,
        cpu_threads: int,
    ) -> Any:
        model_class = getattr(self.faster_whisper, "WhisperModel", None)
        if model_class is None:
            raise EngineDependencyError("faster-whisper does not expose WhisperModel.")
        return model_class(
            model_name,
            device=device,
            device_index=device_index,
            compute_type=compute_type,
            cpu_threads=cpu_threads,
            num_workers=1,
            local_files_only=True,
        )

    def create_batched_pipeline(self, model: Any) -> Any | None:
        pipeline_class = getattr(self.faster_whisper, "BatchedInferencePipeline", None)
        if pipeline_class is None:
            return None
        return pipeline_class(model=model)

    def gpu_name(self, device_index: int) -> str | None:
        """Best-effort name lookup; failure never prevents GPU use."""
        try:
            completed = subprocess.run(
                [
                    "nvidia-smi",
                    f"--id={device_index}",
                    "--query-gpu=name",
                    "--format=csv,noheader",
                ],
                check=False,
                capture_output=True,
                text=True,
                timeout=2,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
        except (OSError, subprocess.SubprocessError):
            return None
        if completed.returncode != 0:
            return None
        names = completed.stdout.strip().splitlines()
        return names[0].strip() if names else None
