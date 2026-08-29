from __future__ import annotations

import gc
from pathlib import Path
from typing import Any, Sequence

from emma_video_transcriber.contracts import AudioChunk, TranscriptSegment

from .diagnostics import EngineDiagnostics
from .errors import ModelInitializationError, TranscriptionRuntimeError
from .policy import (
    CPU_COMPUTE_PRIORITY,
    GPU_BATCH_SIZES,
    GPU_COMPUTE_PRIORITY,
    GPU_LOW_MEMORY_PRIORITY,
    LOW_MEMORY_BATCH_SIZES,
    default_cpu_threads,
    is_cuda_oom,
    is_cuda_runtime_failure,
    pick_alternate_compute_type,
    pick_compute_type,
    select_supported_model,
    short_error,
)
from .runtime import FasterWhisperRuntime
from .transcription import LoadedModel, load_model, map_segments, transcribe_loaded, validate_chunk


class FasterWhisperTranscriptionEngine:
    """Reusable local faster-whisper engine with automatic CUDA/CPU fallback."""

    def __init__(
        self,
        *,
        model_path: Path | None = None,
        device_index: int = 0,
        cpu_threads: int | None = None,
        _runtime: Any | None = None,
    ) -> None:
        self._device_index = device_index
        self._cpu_threads = cpu_threads or default_cpu_threads()
        self._model_path = self._validate_model_path(model_path)
        self._runtime = _runtime or FasterWhisperRuntime()
        self._model_name: str | None = (
            str(self._model_path) if self._model_path is not None else None
        )
        self._loaded: LoadedModel | None = None
        self._gpu_supported_types: set[str] = set()
        self._gpu_name: str | None = None
        self._planned_device: str | None = None
        self._planned_compute_type: str | None = None
        self._fallback_reason: str | None = None

    def transcribe_chunk(
        self,
        chunk: AudioChunk,
        *,
        language: str | None = None,
    ) -> list[TranscriptSegment]:
        validate_chunk(chunk)
        self._ensure_loaded()

        assert self._loaded is not None
        try:
            raw_segments = transcribe_loaded(
                self._loaded,
                chunk.path,
                language=language,
                batch_sizes=self._batch_sizes_for(self._loaded),
            )
        except Exception as exc:
            if self._loaded.device == "cuda" and is_cuda_oom(exc):
                raw_segments = self._recover_from_cuda_oom(
                    chunk.path,
                    language=language,
                    original_error=exc,
                )
            elif self._loaded.device == "cuda" and is_cuda_runtime_failure(exc):
                raw_segments = self._fallback_to_cpu_and_transcribe(
                    chunk.path,
                    language=language,
                    reason=f"CUDA runtime failure: {short_error(exc)}",
                    original_error=exc,
                )
            else:
                raise TranscriptionRuntimeError(
                    f"Transcription failed for '{chunk.path.name}': {short_error(exc)}",
                    cause=exc,
                ) from exc

        return map_segments(raw_segments, chunk)

    def get_diagnostics(self) -> EngineDiagnostics:
        self._prepare_plan()
        chosen_device = self._loaded.device if self._loaded else self._planned_device
        chosen_compute = self._loaded.compute_type if self._loaded else self._planned_compute_type
        assert chosen_device is not None
        assert chosen_compute is not None
        assert self._model_name is not None
        return EngineDiagnostics(
            gpu_name=self._gpu_name,
            chosen_device=chosen_device,
            chosen_compute_type=chosen_compute,
            model=self._model_name,
            fallback_reason=self._fallback_reason,
        )

    @staticmethod
    def _validate_model_path(model_path: Path | None) -> Path | None:
        if model_path is None:
            return None
        path = Path(model_path)
        try:
            if not path.exists():
                raise ModelInitializationError(
                    f"Explicit Whisper model path does not exist: {path}"
                )
            if not path.is_dir():
                raise ModelInitializationError(
                    f"Explicit Whisper model path is not a directory: {path}"
                )
        except OSError as exc:
            raise ModelInitializationError(
                f"Unable to access explicit Whisper model path '{path}': {short_error(exc)}",
                cause=exc,
            ) from exc
        return path

    def _prepare_plan(self) -> None:
        if self._model_name is None:
            self._model_name = select_supported_model(self._runtime.available_models())

        if self._planned_device is not None:
            return

        if self._runtime.cuda_device_count() > self._device_index:
            try:
                self._gpu_supported_types = self._runtime.supported_compute_types(
                    "cuda", self._device_index
                )
            except Exception as exc:
                self._gpu_supported_types = set()
                self._fallback_reason = (
                    "CUDA was detected but its compute capabilities could not be queried: "
                    f"{short_error(exc)}"
                )

            gpu_compute = pick_compute_type(self._gpu_supported_types, GPU_COMPUTE_PRIORITY)
            if gpu_compute is not None:
                self._planned_device = "cuda"
                self._planned_compute_type = gpu_compute
                self._gpu_name = self._runtime.gpu_name(self._device_index)
                return

            if self._fallback_reason is None:
                self._fallback_reason = (
                    "An NVIDIA CUDA device was detected, but no supported Whisper compute "
                    "type was available. Using CPU."
                )

        cpu_types = self._runtime.supported_compute_types("cpu", 0)
        cpu_compute = pick_compute_type(cpu_types, CPU_COMPUTE_PRIORITY)
        if cpu_compute is None:
            raise ModelInitializationError(
                "CTranslate2 reported no usable CPU compute type for transcription."
            )
        self._planned_device = "cpu"
        self._planned_compute_type = cpu_compute
        if self._fallback_reason is None and self._runtime.cuda_device_count() <= self._device_index:
            self._fallback_reason = "No usable CUDA device was detected. Using CPU."

    def _ensure_loaded(self) -> None:
        if self._loaded is not None:
            return
        self._prepare_plan()
        assert self._model_name is not None
        assert self._planned_device is not None
        assert self._planned_compute_type is not None

        if self._planned_device == "cuda":
            try:
                self._loaded = self._load_model("cuda", self._planned_compute_type)
                return
            except Exception as exc:
                self._fallback_reason = (
                    "CUDA model initialization failed; using CPU: "
                    f"{short_error(exc)}"
                )
                self._release_model()

        try:
            cpu_types = self._runtime.supported_compute_types("cpu", 0)
            cpu_compute = pick_compute_type(cpu_types, CPU_COMPUTE_PRIORITY)
            if cpu_compute is None:
                raise RuntimeError("No supported CPU compute type")
            self._planned_device = "cpu"
            self._planned_compute_type = cpu_compute
            self._loaded = self._load_model("cpu", cpu_compute)
        except Exception as exc:
            source = (
                f"explicit model directory '{self._model_name}'"
                if self._model_path is not None
                else "local Whisper model"
            )
            raise ModelInitializationError(
                f"Unable to initialize {source} on GPU or CPU: {short_error(exc)}",
                cause=exc,
            ) from exc

    def _load_model(self, device: str, compute_type: str) -> LoadedModel:
        assert self._model_name is not None
        return load_model(
            self._runtime,
            self._model_name,
            device=device,
            compute_type=compute_type,
            device_index=self._device_index,
            cpu_threads=self._cpu_threads,
        )

    def _recover_from_cuda_oom(
        self,
        audio_path: Path,
        *,
        language: str | None,
        original_error: BaseException,
    ) -> list[Any]:
        assert self._loaded is not None
        current_compute = self._loaded.compute_type
        low_memory_compute = pick_alternate_compute_type(
            self._gpu_supported_types,
            GPU_LOW_MEMORY_PRIORITY,
            current_compute,
        )

        if low_memory_compute is not None:
            self._fallback_reason = (
                f"CUDA ran out of memory with {current_compute}; retried with "
                f"{low_memory_compute}."
            )
            self._release_model()
            try:
                self._loaded = self._load_model("cuda", low_memory_compute)
                self._planned_compute_type = low_memory_compute
                return transcribe_loaded(
                    self._loaded,
                    audio_path,
                    language=language,
                    batch_sizes=LOW_MEMORY_BATCH_SIZES,
                )
            except Exception as exc:
                if not is_cuda_oom(exc) and not is_cuda_runtime_failure(exc):
                    raise TranscriptionRuntimeError(
                        "Low-memory CUDA retry failed during transcription: "
                        f"{short_error(exc)}",
                        cause=exc,
                    ) from exc
                original_error = exc

        return self._fallback_to_cpu_and_transcribe(
            audio_path,
            language=language,
            reason=(
                "CUDA ran out of memory after lower-memory retries; using CPU: "
                f"{short_error(original_error)}"
            ),
            original_error=original_error,
        )

    def _fallback_to_cpu_and_transcribe(
        self,
        audio_path: Path,
        *,
        language: str | None,
        reason: str,
        original_error: BaseException,
    ) -> list[Any]:
        self._fallback_reason = reason
        self._release_model()
        try:
            cpu_types = self._runtime.supported_compute_types("cpu", 0)
            cpu_compute = pick_compute_type(cpu_types, CPU_COMPUTE_PRIORITY)
            if cpu_compute is None:
                raise RuntimeError("No supported CPU compute type")
            self._planned_device = "cpu"
            self._planned_compute_type = cpu_compute
            self._loaded = self._load_model("cpu", cpu_compute)
            return transcribe_loaded(
                self._loaded,
                audio_path,
                language=language,
                batch_sizes=(1,),
            )
        except Exception as exc:
            raise TranscriptionRuntimeError(
                "CUDA transcription failed and CPU fallback also failed. "
                f"CUDA: {short_error(original_error)}; CPU: {short_error(exc)}",
                cause=exc,
            ) from exc

    def _release_model(self) -> None:
        self._loaded = None
        gc.collect()

    @staticmethod
    def _batch_sizes_for(loaded: LoadedModel) -> Sequence[int]:
        if loaded.device == "cuda" and loaded.batched_pipeline is not None:
            return GPU_BATCH_SIZES
        return (1,)
