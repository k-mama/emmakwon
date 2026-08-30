from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from emma_video_transcriber.contracts import AudioChunk
from emma_video_transcriber.engine import (
    FasterWhisperTranscriptionEngine,
    TranscriptionRuntimeError,
)

from fakes import FakeRuntime


class FallbackTests(unittest.TestCase):
    def setUp(self) -> None:
        temp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp.close()
        self.audio_path = Path(temp.name)

    def tearDown(self) -> None:
        self.audio_path.unlink(missing_ok=True)

    def chunk(self) -> AudioChunk:
        return AudioChunk(path=self.audio_path, start_ms=0, end_ms=10_000)

    def test_cpu_fallback_when_cuda_initialization_fails(self) -> None:
        runtime = FakeRuntime(cuda=True, fail_cuda_init=True)
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        engine.transcribe_chunk(self.chunk())
        diagnostics = engine.get_diagnostics()
        self.assertEqual("cpu", diagnostics.chosen_device)
        self.assertEqual("int8", diagnostics.chosen_compute_type)
        self.assertIn("CUDA model initialization failed", diagnostics.fallback_reason or "")
        self.assertEqual(["cuda", "cpu"], [item.device for item in runtime.creations])

    def test_oom_retries_smaller_batches_before_model_reload(self) -> None:
        runtime = FakeRuntime(cuda=True)
        runtime.pipeline_plan = [
            RuntimeError("CUDA out of memory"),
            [SimpleNamespace(start=0.0, end=1.0, text=" recovered ")],
        ]
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        segments = engine.transcribe_chunk(self.chunk())
        self.assertEqual("recovered", segments[0].text)
        self.assertEqual([4, 2], runtime.batch_sizes)
        self.assertEqual(1, len(runtime.creations))

    def test_oom_reloads_low_memory_gpu_then_falls_back_to_cpu(self) -> None:
        runtime = FakeRuntime(cuda=True)
        runtime.pipeline_plan = [RuntimeError("CUDA out of memory")] * 6
        runtime.standard_plan = [[SimpleNamespace(start=0.0, end=1.0, text=" cpu ")]]
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        segments = engine.transcribe_chunk(self.chunk())
        diagnostics = engine.get_diagnostics()
        self.assertEqual("cpu", segments[0].text)
        self.assertEqual("cpu", diagnostics.chosen_device)
        self.assertEqual(
            [("cuda", "float16"), ("cuda", "int8_float16"), ("cpu", "int8")],
            [(item.device, item.compute_type) for item in runtime.creations],
        )

    def test_runtime_failure_is_wrapped_in_typed_error(self) -> None:
        runtime = FakeRuntime(cuda=False)
        runtime.standard_plan = [ValueError("decoder broke")]
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        with self.assertRaises(TranscriptionRuntimeError) as caught:
            engine.transcribe_chunk(self.chunk())
        self.assertIn("decoder broke", str(caught.exception))
        self.assertEqual("transcription_runtime_error", caught.exception.code)


if __name__ == "__main__":
    unittest.main()
