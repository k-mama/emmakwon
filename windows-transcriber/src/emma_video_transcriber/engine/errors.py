from __future__ import annotations


class TranscriptionEngineError(RuntimeError):
    """Base error surfaced by the local speech-recognition engine."""

    code = "transcription_engine_error"
    retryable = False

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause


class EngineDependencyError(TranscriptionEngineError):
    code = "engine_dependency_error"


class ModelSelectionError(TranscriptionEngineError):
    code = "model_selection_error"


class ModelInitializationError(TranscriptionEngineError):
    code = "model_initialization_error"
    retryable = True


class AudioInputError(TranscriptionEngineError):
    code = "audio_input_error"


class TranscriptionRuntimeError(TranscriptionEngineError):
    code = "transcription_runtime_error"
    retryable = True
