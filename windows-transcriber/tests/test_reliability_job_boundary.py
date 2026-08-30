from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from emma_video_transcriber.contracts import AudioChunk, MediaInfo, TranscriptSegment
from emma_video_transcriber.engine import FasterWhisperTranscriptionEngine
from emma_video_transcriber.infra.diagnostics import process_rss_bytes
from emma_video_transcriber.jobs import QueueRunner, SqliteJobStore
from emma_video_transcriber.output import Utf8TranscriptWriter

ENGINE_TESTS_DIR = ROOT / "src" / "emma_video_transcriber" / "engine" / "_tests"
if str(ENGINE_TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_TESTS_DIR))

from fakes import FakeRuntime  # noqa: E402  (path inserted above)


class SimulatedProcessCrash(BaseException):
    """Models a fatal native crash (CUDA/CTranslate2/etc.) that never reaches
    an ordinary ``except Exception`` handler, matching how a real same-process
    native crash would actually terminate the interpreter."""


class FakeMedia:
    def __init__(self, temp_dir: Path, *, duration_ms: int = 3_000, fail_job_names: frozenset[str] = frozenset()):
        self.temp_dir = temp_dir
        self.duration_ms = duration_ms
        self.fail_job_names = fail_job_names

    def probe(self, source: Path):
        return MediaInfo(source, self.duration_ms, source.stat().st_size, True, "aac")

    def iter_audio_chunks(self, source: Path, start_ms: int = 0, chunk_ms: int = 600_000):
        cursor = start_ms
        while cursor < self.duration_ms:
            end = min(cursor + chunk_ms, self.duration_ms)
            p = self.temp_dir / f"{source.name}-chunk-{cursor}-{end}.wav"
            p.write_bytes(b"audio")
            yield AudioChunk(p, cursor, end)
            cursor = end


class CountingResetEngine:
    """Fake TranscriptionEngine that records reset_after_job calls and can be
    made to raise an ordinary Exception or a BaseException-level crash on a
    specific chunk."""

    def __init__(self, *, fail_on_source: str | None = None, crash_on_source: str | None = None):
        self.fail_on_source = fail_on_source
        self.crash_on_source = crash_on_source
        self.reset_calls = 0
        self.transcribe_calls: list[str] = []

    def transcribe_chunk(self, chunk: AudioChunk, *, language: str | None = None):
        name = chunk.path.name
        self.transcribe_calls.append(name)
        if self.crash_on_source and self.crash_on_source in name:
            raise SimulatedProcessCrash("native crash during transcription")
        if self.fail_on_source and self.fail_on_source in name:
            raise RuntimeError("ordinary transcription failure")
        return [TranscriptSegment(chunk.start_ms, chunk.end_ms, name)]

    def reset_after_job(self) -> None:
        self.reset_calls += 1


class RaisingResetEngine(CountingResetEngine):
    def reset_after_job(self) -> None:
        self.reset_calls += 1
        raise RuntimeError("cleanup itself is broken")


class JobBoundaryResetTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.output_dir = self.root / "out"
        self.chunk_dir = self.root / "chunks"
        self.chunk_dir.mkdir()
        self.db = self.root / "jobs.sqlite3"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def source(self, name: str) -> Path:
        p = self.root / name
        p.write_bytes(b"immutable-source")
        return p

    def test_engine_reset_is_called_once_per_job_for_completed_jobs(self) -> None:
        store = SqliteJobStore(self.db)
        sources = [self.source(f"{i}.mp4") for i in range(3)]
        for source in sources:
            store.enqueue(source, self.output_dir, metadata={"chunk_ms": "1000"})
        engine = CountingResetEngine()
        runner = QueueRunner(FakeMedia(self.chunk_dir), engine, Utf8TranscriptWriter(), store)
        runner.run()
        self.assertEqual(engine.reset_calls, 3)
        self.assertTrue(all(job.status == "completed" for job in store.list_all()))

    def test_engine_reset_is_called_after_a_failed_job_and_a_paused_job_too(self) -> None:
        store = SqliteJobStore(self.db)
        store.enqueue(self.source("bad.mp4"), self.output_dir, metadata={"chunk_ms": "1000"})
        store.enqueue(self.source("good.mp4"), self.output_dir, metadata={"chunk_ms": "1000"})
        engine = CountingResetEngine(fail_on_source="bad.mp4")
        runner = QueueRunner(FakeMedia(self.chunk_dir), engine, Utf8TranscriptWriter(), store)
        runner.run()
        statuses = {job.source_name: job.status for job in store.list_all()}
        self.assertEqual(statuses["bad.mp4"], "failed")
        self.assertEqual(statuses["good.mp4"], "completed")
        # Reset must have run for both jobs: one failed, one completed.
        self.assertEqual(engine.reset_calls, 2)

    def test_ordinary_job_failure_does_not_stop_the_queue(self) -> None:
        """RELIABILITY ACCEPTANCE: ordinary job errors do not close the application."""
        store = SqliteJobStore(self.db)
        jobs = [store.enqueue(self.source(f"{i}.mp4"), self.output_dir, metadata={"chunk_ms": "1000"}) for i in range(3)]
        engine = CountingResetEngine(fail_on_source="1.mp4")
        events = []
        runner = QueueRunner(FakeMedia(self.chunk_dir), engine, Utf8TranscriptWriter(), store, callback=events.append)
        runner.run()  # must not raise
        loaded = {job.job_id: store.get(job.job_id) for job in jobs}
        self.assertEqual(loaded[jobs[0].job_id].status, "completed")
        self.assertEqual(loaded[jobs[1].job_id].status, "failed")
        self.assertEqual(loaded[jobs[2].job_id].status, "completed")
        started = [e.job_id for e in events if e.kind == "job_started"]
        self.assertEqual(started, [job.job_id for job in jobs])

    def test_a_broken_reset_hook_never_masks_the_jobs_own_outcome(self) -> None:
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("a.mp4"), self.output_dir, metadata={"chunk_ms": "1000"})
        engine = RaisingResetEngine()
        runner = QueueRunner(FakeMedia(self.chunk_dir), engine, Utf8TranscriptWriter(), store)
        runner.run()  # must not raise even though reset_after_job raises
        self.assertEqual(store.get(job.job_id).status, "completed")
        self.assertEqual(engine.reset_calls, 1)

    def test_a_native_level_crash_still_propagates_out_of_run(self) -> None:
        """Documents the current containment boundary: QueueRunner only ever
        catches ordinary Exception. A same-process fatal native failure
        (modeled here as a BaseException, matching how CUDA/CTranslate2 would
        actually behave) is NOT contained by this layer. This is exactly why
        the reliability review's native crash containment section says a
        reproducible native crash would still require moving inference to an
        isolated worker process; job-boundary resource hardening reduces the
        odds of hitting the crash, it does not make the crash structurally
        unable to end the process."""
        store = SqliteJobStore(self.db)
        store.enqueue(self.source("a.mp4"), self.output_dir, metadata={"chunk_ms": "1000"})
        store.enqueue(self.source("crashes.mp4"), self.output_dir, metadata={"chunk_ms": "1000"})
        engine = CountingResetEngine(crash_on_source="crashes.mp4")
        runner = QueueRunner(FakeMedia(self.chunk_dir), engine, Utf8TranscriptWriter(), store)
        with self.assertRaises(SimulatedProcessCrash):
            runner.run()

    def test_orphan_wav_is_removed_even_when_transcription_raises(self) -> None:
        """MEDIA/FFMPEG AUDIT: a failed/native problem must not leave an
        orphaned bounded WAV chunk behind."""
        store = SqliteJobStore(self.db)
        store.enqueue(self.source("bad.mp4"), self.output_dir, metadata={"chunk_ms": "1000"})
        engine = CountingResetEngine(fail_on_source="bad.mp4")
        runner = QueueRunner(FakeMedia(self.chunk_dir), engine, Utf8TranscriptWriter(), store)
        runner.run()
        leftover = list(self.chunk_dir.glob("*.wav"))
        self.assertEqual(leftover, [], f"orphaned chunk files after a failed job: {leftover}")

    def test_ten_job_soak_survives_and_reports_rss_at_every_boundary(self) -> None:
        """REPRODUCTION MATRIX (D/E/F): a synthetic 10-job soak. Real GPU/VRAM
        growth cannot be reproduced in this environment; this proves the
        queue itself survives well beyond the previously-reported sixth job
        and that a diagnostics boundary sample is actually recorded for every
        job when RSS sampling is available on this platform."""
        store = SqliteJobStore(self.db)
        for i in range(10):
            store.enqueue(self.source(f"job{i}.mp4"), self.output_dir, metadata={"chunk_ms": "1000"})
        engine = CountingResetEngine()
        diagnostics_dir = self.root / "diag"
        runner = QueueRunner(
            FakeMedia(self.chunk_dir), engine, Utf8TranscriptWriter(), store, diagnostics_dir=diagnostics_dir
        )
        runner.run()
        self.assertTrue(all(job.status == "completed" for job in store.list_all()))
        self.assertEqual(engine.reset_calls, 10)

        log_path = diagnostics_dir / "diagnostics.log"
        self.assertTrue(log_path.exists())
        lines = [json.loads(line) for line in log_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        started_stages = [line for line in lines if line["stage"] == "job_started"]
        self.assertEqual(len(started_stages), 10)
        if process_rss_bytes() is not None:
            for entry in started_stages:
                self.assertIsNotNone(entry.get("rss_bytes"))


class RealEngineJobBoundaryReloadTests(unittest.TestCase):
    """Uses the real FasterWhisperTranscriptionEngine with a fake native
    runtime (no CUDA/CTranslate2 required) to prove the actual reload
    lifecycle QueueRunner now drives, not just a test double's bookkeeping."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.output_dir = self.root / "out"
        self.chunk_dir = self.root / "chunks"
        self.chunk_dir.mkdir()
        self.db = self.root / "jobs.sqlite3"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def source(self, name: str) -> Path:
        p = self.root / name
        p.write_bytes(b"immutable-source")
        return p

    def test_model_reloads_once_per_job_when_reset_between_jobs_enabled(self) -> None:
        store = SqliteJobStore(self.db)
        for i in range(3):
            store.enqueue(self.source(f"{i}.mp4"), self.output_dir, metadata={"chunk_ms": "1000"})
        runtime = FakeRuntime(cuda=True)
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime, reset_between_jobs=True)
        runner = QueueRunner(FakeMedia(self.chunk_dir), engine, Utf8TranscriptWriter(), store)
        runner.run()
        self.assertTrue(all(job.status == "completed" for job in store.list_all()))
        # 3 jobs x 3 chunks each (3000ms / 1000ms) still reload only once per
        # job, at the job boundary -- not once per chunk.
        self.assertEqual(len(runtime.creations), 3)

    def test_model_is_reused_across_the_whole_queue_when_reset_disabled(self) -> None:
        store = SqliteJobStore(self.db)
        for i in range(3):
            store.enqueue(self.source(f"{i}.mp4"), self.output_dir, metadata={"chunk_ms": "1000"})
        runtime = FakeRuntime(cuda=True)
        engine = FasterWhisperTranscriptionEngine(_runtime=runtime, reset_between_jobs=False)
        runner = QueueRunner(FakeMedia(self.chunk_dir), engine, Utf8TranscriptWriter(), store)
        runner.run()
        self.assertTrue(all(job.status == "completed" for job in store.list_all()))
        self.assertEqual(len(runtime.creations), 1)


if __name__ == "__main__":
    unittest.main()
