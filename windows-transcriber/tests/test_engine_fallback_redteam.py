from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

try:
    from emma_video_transcriber.contracts import AudioChunk
    from emma_video_transcriber.engine import FasterWhisperTranscriptionEngine, ModelSelectionError
    ENGINE_AVAILABLE = True
except ImportError:
    ENGINE_AVAILABLE = False


class RawSegment:
    start = 0.0
    end = 0.5
    text = "hello"


class CpuModel:
    def transcribe(self, *args, **kwargs):
        return [RawSegment()]


class OomBatchedPipeline:
    def transcribe(self, *args, **kwargs):
        raise RuntimeError("CUDA_ERROR_OUT_OF_MEMORY failed to allocate")


class GoodBatchedPipeline:
    def transcribe(self, *args, **kwargs):
        return [RawSegment()]


class FakeRuntime:
    def __init__(self, *, cuda_count: int = 1, fail_cuda_init: bool = False, cuda_oom: bool = False, models=None):
        self.cuda_count_value = cuda_count
        self.fail_cuda_init = fail_cuda_init
        self.cuda_oom = cuda_oom
        self.models = ["turbo"] if models is None else models
        self.created: list[tuple[str, str]] = []

    def available_models(self):
        return list(self.models)

    def cuda_device_count(self):
        return self.cuda_count_value

    def supported_compute_types(self, device, device_index):
        if device == "cuda":
            return {"float16", "int8_float16"}
        return {"int8", "float32"}

    def gpu_name(self, device_index):
        return "QA Fake GPU"

    def create_model(self, model_name, *, device, compute_type, device_index, cpu_threads):
        self.created.append((device, compute_type))
        if device == "cuda" and self.fail_cuda_init:
            raise RuntimeError("CUDA driver initialization failed")
        return CpuModel()

    def create_batched_pipeline(self, model):
        return OomBatchedPipeline() if self.cuda_oom else GoodBatchedPipeline()

    def clear_cuda_cache(self):
        return None


@unittest.skipUnless(ENGINE_AVAILABLE, "engine lane not integrated on this branch")
class EngineFallbackRedTeamTests(unittest.TestCase):
    def chunk(self):
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.write(b"audio")
        tmp.close()
        self.addCleanup(lambda: Path(tmp.name).unlink(missing_ok=True))
        return AudioChunk(Path(tmp.name), 10_000, 11_000)

    def test_gpu_unavailable_plans_cpu_fallback(self) -> None:
        engine = FasterWhisperTranscriptionEngine(_runtime=FakeRuntime(cuda_count=0))
        diag = engine.get_diagnostics()
        self.assertEqual(diag.chosen_device, "cpu")
        self.assertIn("CPU", diag.fallback_reason)

    def test_gpu_initialization_failure_falls_back_to_cpu_and_transcribes(self) -> None:
        runtime = FakeRuntime(fail_cuda_init=True)
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        segments = engine.transcribe_chunk(self.chunk())
        self.assertEqual([s.text for s in segments], ["hello"])
        diag = engine.get_diagnostics()
        self.assertEqual(diag.chosen_device, "cpu")
        self.assertTrue(any(device == "cuda" for device, _ in runtime.created))
        self.assertTrue(any(device == "cpu" for device, _ in runtime.created))

    def test_temporary_cuda_oom_retries_then_falls_back_without_losing_segment(self) -> None:
        runtime = FakeRuntime(cuda_oom=True)
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        segments = engine.transcribe_chunk(self.chunk())
        self.assertEqual(len(segments), 1)
        self.assertEqual(segments[0].start_ms, 10_000)
        self.assertEqual(segments[0].text, "hello")
        diag = engine.get_diagnostics()
        self.assertEqual(diag.chosen_device, "cpu")
        self.assertIn("memory", diag.fallback_reason.lower())

    def test_model_unavailable_is_explicit_failure(self) -> None:
        engine = FasterWhisperTranscriptionEngine(_runtime=FakeRuntime(models=[]))
        with self.assertRaises(ModelSelectionError):
            engine.get_diagnostics()


if __name__ == "__main__":
    unittest.main()
