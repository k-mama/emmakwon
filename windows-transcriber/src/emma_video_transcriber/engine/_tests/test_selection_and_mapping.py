from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from emma_video_transcriber.contracts import AudioChunk
from emma_video_transcriber.engine import FasterWhisperTranscriptionEngine

from fakes import FakeRuntime


class SelectionAndMappingTests(unittest.TestCase):
    def setUp(self) -> None:
        temp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp.close()
        self.audio_path = Path(temp.name)

    def tearDown(self) -> None:
        self.audio_path.unlink(missing_ok=True)

    def chunk(self, start_ms: int = 0, end_ms: int = 10_000) -> AudioChunk:
        return AudioChunk(path=self.audio_path, start_ms=start_ms, end_ms=end_ms)

    def test_prefers_cuda_and_reports_diagnostics(self) -> None:
        runtime = FakeRuntime(cuda=True)
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        segments = engine.transcribe_chunk(self.chunk())
        diagnostics = engine.get_diagnostics()
        self.assertEqual("cuda", diagnostics.chosen_device)
        self.assertEqual("float16", diagnostics.chosen_compute_type)
        self.assertEqual("turbo", diagnostics.model)
        self.assertEqual("Fake RTX 4070", diagnostics.gpu_name)
        self.assertEqual("hello", segments[0].text)

    def test_model_name_is_selected_only_from_available_models(self) -> None:
        runtime = FakeRuntime(cuda=False, models=("tiny", "large-v3"))
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        engine.transcribe_chunk(self.chunk())
        self.assertEqual("large-v3", engine.get_diagnostics().model)

    def test_timestamp_mapping_adds_chunk_offset(self) -> None:
        runtime = FakeRuntime(cuda=True)
        runtime.pipeline_plan = [[SimpleNamespace(start=1.25, end=2.5, text=" 안녕하세요 ")]]
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        segments = engine.transcribe_chunk(self.chunk(600_000, 610_000), language="ko")
        self.assertEqual(601_250, segments[0].start_ms)
        self.assertEqual(602_500, segments[0].end_ms)
        self.assertEqual("안녕하세요", segments[0].text)

    def test_blank_and_silent_segments_are_removed(self) -> None:
        runtime = FakeRuntime(cuda=True)
        runtime.pipeline_plan = [[
            SimpleNamespace(start=0.0, end=0.3, text=" "),
            SimpleNamespace(start=0.4, end=0.8, text=""),
        ]]
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        self.assertEqual([], engine.transcribe_chunk(self.chunk()))

    def test_model_is_reused_between_chunks(self) -> None:
        runtime = FakeRuntime(cuda=True)
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime)
        engine.transcribe_chunk(self.chunk())
        engine.transcribe_chunk(self.chunk(10_000, 20_000))
        self.assertEqual(1, len(runtime.creations))


if __name__ == "__main__":
    unittest.main()
