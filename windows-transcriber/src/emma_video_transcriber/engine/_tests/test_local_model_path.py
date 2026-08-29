from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from emma_video_transcriber.contracts import AudioChunk
from emma_video_transcriber.engine import (
    FasterWhisperTranscriptionEngine,
    ModelInitializationError,
)
from emma_video_transcriber.engine.runtime import FasterWhisperRuntime

from fakes import FakeRuntime


class LocalModelPathTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        self.model_path = root / "managed-whisper-model"
        self.model_path.mkdir()
        self.audio_path = root / "chunk.wav"
        self.audio_path.write_bytes(b"test")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def chunk(self) -> AudioChunk:
        return AudioChunk(path=self.audio_path, start_ms=0, end_ms=10_000)

    def test_explicit_path_bypasses_named_model_selection_and_reaches_runtime(self) -> None:
        runtime = FakeRuntime(cuda=True, models=("tiny",))
        engine = FasterWhisperTranscriptionEngine(
            model_path=self.model_path,
            _runtime=runtime,
        )

        engine.transcribe_chunk(self.chunk())

        self.assertEqual(0, runtime.available_models_calls)
        self.assertEqual(str(self.model_path), runtime.creations[0].model_source)
        self.assertEqual(str(self.model_path), engine.get_diagnostics().model)

    def test_explicit_path_preserves_cuda_selection(self) -> None:
        runtime = FakeRuntime(cuda=True)
        engine = FasterWhisperTranscriptionEngine(
            model_path=self.model_path,
            _runtime=runtime,
        )

        engine.transcribe_chunk(self.chunk())
        diagnostics = engine.get_diagnostics()

        self.assertEqual("cuda", diagnostics.chosen_device)
        self.assertEqual("float16", diagnostics.chosen_compute_type)
        self.assertEqual(str(self.model_path), runtime.creations[0].model_source)

    def test_explicit_path_preserves_cpu_fallback(self) -> None:
        runtime = FakeRuntime(cuda=True, fail_cuda_init=True)
        engine = FasterWhisperTranscriptionEngine(
            model_path=self.model_path,
            _runtime=runtime,
        )

        engine.transcribe_chunk(self.chunk())
        diagnostics = engine.get_diagnostics()

        self.assertEqual("cpu", diagnostics.chosen_device)
        self.assertEqual(
            [str(self.model_path), str(self.model_path)],
            [creation.model_source for creation in runtime.creations],
        )
        self.assertEqual(["cuda", "cpu"], [creation.device for creation in runtime.creations])

    def test_invalid_explicit_paths_raise_typed_model_error(self) -> None:
        missing = Path(self.temp_dir.name) / "missing-model"
        file_path = Path(self.temp_dir.name) / "not-a-directory.bin"
        file_path.write_bytes(b"not a model directory")

        for invalid in (missing, file_path):
            with self.subTest(path=invalid):
                with self.assertRaises(ModelInitializationError):
                    FasterWhisperTranscriptionEngine(
                        model_path=invalid,
                        _runtime=FakeRuntime(cuda=False),
                    )

    def test_unopenable_explicit_model_directory_is_typed_failure(self) -> None:
        class BrokenRuntime(FakeRuntime):
            def create_model(self, model_source: str, **kwargs):
                raise RuntimeError(f"cannot open model: {model_source}")

        engine = FasterWhisperTranscriptionEngine(
            model_path=self.model_path,
            _runtime=BrokenRuntime(cuda=False),
        )

        with self.assertRaises(ModelInitializationError) as caught:
            engine.transcribe_chunk(self.chunk())

        self.assertIn(str(self.model_path), str(caught.exception))

    def test_runtime_keeps_local_files_only_enabled_for_path_source(self) -> None:
        captured: dict[str, object] = {}

        def whisper_model(source: str, **kwargs):
            captured["source"] = source
            captured.update(kwargs)
            return object()

        runtime = FasterWhisperRuntime.__new__(FasterWhisperRuntime)
        runtime.faster_whisper = SimpleNamespace(WhisperModel=whisper_model)

        runtime.create_model(
            self.model_path,
            device="cpu",
            compute_type="int8",
            device_index=0,
            cpu_threads=4,
        )

        self.assertEqual(str(self.model_path), captured["source"])
        self.assertIs(True, captured["local_files_only"])

    def test_no_model_path_keeps_named_model_selection_behavior(self) -> None:
        runtime = FakeRuntime(cuda=False, models=("tiny", "large-v3"))
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)

        engine.transcribe_chunk(self.chunk())

        self.assertEqual(1, runtime.available_models_calls)
        self.assertEqual("large-v3", runtime.creations[0].model_source)
        self.assertEqual("large-v3", engine.get_diagnostics().model)


if __name__ == "__main__":
    unittest.main()
