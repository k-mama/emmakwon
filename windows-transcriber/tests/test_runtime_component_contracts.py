from __future__ import annotations

import hashlib
import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from emma_video_transcriber.contracts import AudioChunk, MediaInfo, TranscriptSegment


def _load_factory(env_name: str):
    spec = os.environ.get(env_name)
    if not spec:
        raise unittest.SkipTest(f"{env_name} is not configured")
    module_name, sep, callable_name = spec.partition(":")
    if not sep:
        raise RuntimeError(f"{env_name} must be module:function")
    module = importlib.import_module(module_name)
    return getattr(module, callable_name)


class RuntimeComponentContractTests(unittest.TestCase):
    def test_media_pipeline_handles_real_fixture_without_copying_source(self) -> None:
        source_env = os.environ.get("EMMA_QA_MEDIA_SOURCE")
        if not source_env:
            self.skipTest("EMMA_QA_MEDIA_SOURCE is not configured")
        source = Path(source_env)
        media = _load_factory("EMMA_QA_MEDIA_FACTORY")()
        before_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        before_stat = source.stat()
        info = media.probe(source)
        self.assertIsInstance(info, MediaInfo)
        self.assertEqual(info.path, source)
        self.assertGreaterEqual(info.duration_ms, 0)
        chunks = list(media.iter_audio_chunks(source, start_ms=0, chunk_ms=10_000))
        if info.has_audio and info.duration_ms > 0:
            self.assertTrue(chunks)
            self.assertTrue(all(isinstance(chunk, AudioChunk) for chunk in chunks))
            self.assertTrue(all(chunk.end_ms > chunk.start_ms for chunk in chunks))
            self.assertTrue(all(chunk.end_ms - chunk.start_ms <= 10_000 for chunk in chunks))
        after_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        after_stat = source.stat()
        self.assertEqual(before_hash, after_hash, "source bytes changed")
        self.assertEqual(before_stat.st_size, after_stat.st_size, "source size changed")

    def test_no_audio_fixture_reports_no_audio(self) -> None:
        source_env = os.environ.get("EMMA_QA_NO_AUDIO_SOURCE")
        if not source_env:
            self.skipTest("EMMA_QA_NO_AUDIO_SOURCE is not configured")
        media = _load_factory("EMMA_QA_MEDIA_FACTORY")()
        info = media.probe(Path(source_env))
        self.assertFalse(info.has_audio)

    def test_corrupted_source_fails_explicitly(self) -> None:
        source_env = os.environ.get("EMMA_QA_CORRUPT_SOURCE")
        if not source_env:
            self.skipTest("EMMA_QA_CORRUPT_SOURCE is not configured")
        media = _load_factory("EMMA_QA_MEDIA_FACTORY")()
        with self.assertRaises(Exception):
            media.probe(Path(source_env))

    def test_engine_returns_segments_for_audio_chunk(self) -> None:
        audio_env = os.environ.get("EMMA_QA_AUDIO_CHUNK")
        if not audio_env:
            self.skipTest("EMMA_QA_AUDIO_CHUNK is not configured")
        engine = _load_factory("EMMA_QA_ENGINE_FACTORY")()
        chunk_path = Path(audio_env)
        chunk = AudioChunk(chunk_path, 0, int(os.environ.get("EMMA_QA_AUDIO_CHUNK_MS", "10000")))
        segments = engine.transcribe_chunk(chunk)
        self.assertIsInstance(segments, list)
        self.assertTrue(all(isinstance(segment, TranscriptSegment) for segment in segments))
        self.assertTrue(all(segment.end_ms >= segment.start_ms for segment in segments))

    def test_job_store_roundtrip_supports_unicode(self) -> None:
        factory = _load_factory("EMMA_QA_STORE_FACTORY")
        with tempfile.TemporaryDirectory() as td:
            store = factory(Path(td) / "qa.sqlite3")
            from emma_video_transcriber.contracts import JobRecord
            job = JobRecord(
                job_id="qa-unicode",
                source_path=Path(r"C:\영상\긴 파일 (1)!.mp4"),
                output_path=Path(td) / "T001.txt",
                source_name="긴 파일 (1)!.mp4",
            )
            store.add(job)
            loaded = store.get(job.job_id)
            self.assertIsNotNone(loaded)
            self.assertEqual(loaded.source_path, job.source_path)
            self.assertEqual(loaded.output_path, job.output_path)


if __name__ == "__main__":
    unittest.main()
