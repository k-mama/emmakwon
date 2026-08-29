from __future__ import annotations

import dataclasses
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from emma_video_transcriber.contracts import AudioChunk, JobRecord, MediaInfo, TranscriptSegment


class ContractBaselineTests(unittest.TestCase):
    def test_media_info_preserves_unicode_and_punctuation_path(self) -> None:
        path = Path(r"C:\영상 보관함\긴 영상 (final)! #1.mp4")
        info = MediaInfo(path=path, duration_ms=1_234, size_bytes=99, has_audio=True, audio_codec="aac")
        self.assertEqual(info.path, path)
        self.assertEqual(info.duration_ms, 1_234)
        self.assertTrue(info.has_audio)

    def test_frozen_transfer_objects_reject_mutation(self) -> None:
        for obj, field_name in (
            (MediaInfo(Path("a.mp4"), 1, 2, True, "aac"), "duration_ms"),
            (AudioChunk(Path("chunk.wav"), 0, 1_000), "end_ms"),
            (TranscriptSegment(0, 1_000, "hello"), "text"),
        ):
            with self.subTest(type=type(obj).__name__):
                with self.assertRaises(dataclasses.FrozenInstanceError):
                    setattr(obj, field_name, "mutated")

    def test_job_record_recovery_defaults_are_safe(self) -> None:
        job = JobRecord(
            job_id="j1",
            source_path=Path("source.mp4"),
            output_path=Path("T001.txt"),
            source_name="source.mp4",
        )
        self.assertEqual(job.current_ms, 0)
        self.assertEqual(job.status, "queued")
        self.assertIsNone(job.error)
        self.assertEqual(job.metadata, {})

    def test_job_metadata_is_not_shared_between_records(self) -> None:
        a = JobRecord("a", Path("a"), Path("T001.txt"), "a")
        b = JobRecord("b", Path("b"), Path("T002.txt"), "b")
        a.metadata["x"] = "1"
        self.assertNotIn("x", b.metadata)


if __name__ == "__main__":
    unittest.main()
