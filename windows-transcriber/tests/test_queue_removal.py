from __future__ import annotations

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
from emma_video_transcriber.jobs import QueueRunner, SqliteJobStore
from emma_video_transcriber.output import Utf8TranscriptWriter

_TEST_APPDATA_DIR: tempfile.TemporaryDirectory | None = None
_TEST_APPDATA_ENV_PREVIOUS: str | None = None


def setUpModule() -> None:
    """QueueRunner writes best-effort diagnostics into the real user's AppData
    by default. Tests must never do that -- redirect to an isolated temp
    directory for the lifetime of this module's tests."""
    global _TEST_APPDATA_DIR, _TEST_APPDATA_ENV_PREVIOUS
    _TEST_APPDATA_DIR = tempfile.TemporaryDirectory(prefix="emma-test-appdata-")
    _TEST_APPDATA_ENV_PREVIOUS = os.environ.get("EMMA_VIDEO_TRANSCRIBER_DATA_DIR")
    os.environ["EMMA_VIDEO_TRANSCRIBER_DATA_DIR"] = _TEST_APPDATA_DIR.name


def tearDownModule() -> None:
    global _TEST_APPDATA_DIR, _TEST_APPDATA_ENV_PREVIOUS
    if _TEST_APPDATA_ENV_PREVIOUS is None:
        os.environ.pop("EMMA_VIDEO_TRANSCRIBER_DATA_DIR", None)
    else:
        os.environ["EMMA_VIDEO_TRANSCRIBER_DATA_DIR"] = _TEST_APPDATA_ENV_PREVIOUS
    if _TEST_APPDATA_DIR is not None:
        _TEST_APPDATA_DIR.cleanup()


class FakeMedia:
    """Same shape as the adversarial-suite fake: bounded, deterministic chunks."""

    def __init__(self, temp_dir: Path, *, duration_ms: int = 3_000):
        self.temp_dir = temp_dir
        self.duration_ms = duration_ms

    def probe(self, source: Path):
        return MediaInfo(source, self.duration_ms, source.stat().st_size, True, "aac")

    def iter_audio_chunks(self, source: Path, start_ms: int = 0, chunk_ms: int = 600_000):
        cursor = start_ms
        while cursor < self.duration_ms:
            end = min(cursor + chunk_ms, self.duration_ms)
            p = self.temp_dir / f"chunk-{cursor}-{end}.wav"
            p.write_bytes(b"audio")
            yield AudioChunk(p, cursor, end)
            cursor = end


class FakeEngine:
    def transcribe_chunk(self, chunk: AudioChunk, *, language: str | None = None):
        return [TranscriptSegment(chunk.start_ms, chunk.end_ms, f"{chunk.start_ms}-{chunk.end_ms}")]


class QueueRemovalTests(unittest.TestCase):
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

    # ---- basic status-gated removal --------------------------------------

    def test_queued_job_is_removable(self) -> None:
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("a.mp4"), self.output_dir)
        store.remove(job.job_id)
        self.assertIsNone(store.get(job.job_id))

    def test_paused_job_is_removable(self) -> None:
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("a.mp4"), self.output_dir, metadata={"chunk_ms": "1000"})
        job.status = "paused"
        job.current_ms = 1000
        store.update(job)
        store.remove(job.job_id)
        self.assertIsNone(store.get(job.job_id))

    def test_failed_job_is_removable(self) -> None:
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("a.mp4"), self.output_dir)
        job.status = "failed"
        job.error = "boom"
        store.update(job)
        store.remove(job.job_id)
        self.assertIsNone(store.get(job.job_id))

    def test_completed_job_is_removable(self) -> None:
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("a.mp4"), self.output_dir)
        job.status = "completed"
        job.duration_ms = 1000
        job.current_ms = 1000
        store.update(job)
        store.remove(job.job_id)
        self.assertIsNone(store.get(job.job_id))

    def test_processing_job_cannot_be_removed(self) -> None:
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("a.mp4"), self.output_dir)
        job.status = "processing"
        store.update(job)
        with self.assertRaises(ValueError):
            store.remove(job.job_id)
        self.assertIsNotNone(store.get(job.job_id))

    def test_removing_an_already_removed_job_is_idempotent(self) -> None:
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("a.mp4"), self.output_dir)
        store.remove(job.job_id)
        store.remove(job.job_id)  # must not raise

    # ---- removal must never touch source video or real transcript content --

    def test_removal_never_touches_source_video(self) -> None:
        store = SqliteJobStore(self.db)
        source = self.source("keep-me.mp4")
        job = store.enqueue(source, self.output_dir)
        store.remove(job.job_id)
        self.assertEqual(source.read_bytes(), b"immutable-source")

    def test_removal_deletes_only_empty_placeholder_output(self) -> None:
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("a.mp4"), self.output_dir)
        self.assertTrue(job.output_path.exists())
        self.assertEqual(job.output_path.stat().st_size, 0)
        store.remove(job.job_id)
        self.assertFalse(job.output_path.exists())

    def test_removal_preserves_a_transcript_with_real_committed_content(self) -> None:
        store = SqliteJobStore(self.db)
        source = self.source("partial.mp4")
        job = store.enqueue(source, self.output_dir, metadata={"chunk_ms": "1000"})
        runner = None

        def callback(event):
            if event.kind == "chunk_committed":
                runner.request_stop()  # stop after the very first safe chunk boundary

        runner = QueueRunner(FakeMedia(self.chunk_dir), FakeEngine(), Utf8TranscriptWriter(), store, callback=callback)
        runner.run()
        loaded = store.get(job.job_id)
        self.assertEqual(loaded.status, "paused")
        self.assertGreater(job.output_path.stat().st_size, 0)
        real_text = job.output_path.read_text(encoding="utf-8")

        store.remove(job.job_id)

        self.assertIsNone(store.get(job.job_id))
        self.assertTrue(job.output_path.exists(), "a transcript with real content must survive removal")
        self.assertEqual(job.output_path.read_text(encoding="utf-8"), real_text)

    def test_removal_clears_a_stray_journal_sidecar(self) -> None:
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("a.mp4"), self.output_dir)
        from emma_video_transcriber.output.journal import AppendJournal, journal_path, write_journal

        write_journal(
            AppendJournal(
                job_id=job.job_id,
                output_path=str(job.output_path),
                safe_offset=0,
                chunk_start_ms=0,
                chunk_end_ms=1000,
            )
        )
        self.assertTrue(journal_path(job.output_path).exists())
        store.remove(job.job_id)
        self.assertFalse(journal_path(job.output_path).exists())

    # ---- durability across restart ----------------------------------------

    def test_removed_record_does_not_return_after_restart(self) -> None:
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("a.mp4"), self.output_dir)
        store.remove(job.job_id)
        reopened = SqliteJobStore(self.db)
        self.assertIsNone(reopened.get(job.job_id))
        self.assertEqual(reopened.list_all(), [])

    # ---- T-number reuse is safe, never collides with real content ---------

    def test_freed_t_number_is_reused_only_after_a_clean_empty_removal(self) -> None:
        store = SqliteJobStore(self.db)
        job1 = store.enqueue(self.source("a.mp4"), self.output_dir)
        self.assertEqual(job1.output_path.name, "T001.txt")
        store.remove(job1.job_id)
        job2 = store.enqueue(self.source("b.mp4"), self.output_dir)
        self.assertEqual(job2.output_path.name, "T001.txt")

    def test_t_number_with_real_content_is_never_reused_after_removal(self) -> None:
        store = SqliteJobStore(self.db)
        source = self.source("partial.mp4")
        job1 = store.enqueue(source, self.output_dir, metadata={"chunk_ms": "1000"})
        runner = None

        def callback(event):
            if event.kind == "chunk_committed":
                runner.request_stop()

        runner = QueueRunner(FakeMedia(self.chunk_dir), FakeEngine(), Utf8TranscriptWriter(), store, callback=callback)
        runner.run()
        self.assertGreater(job1.output_path.stat().st_size, 0)

        store.remove(job1.job_id)
        job2 = store.enqueue(self.source("b.mp4"), self.output_dir)

        # T001.txt still holds real content on disk, so the next reservation
        # must skip past it rather than colliding with it.
        self.assertNotEqual(job2.output_path.name, "T001.txt")
        self.assertEqual(job2.output_path.name, "T002.txt")

    # ---- CLEAR QUEUE semantics (exercised at the store level; the app.py
    # ApplicationController.clear_queue() slot is a thin loop over these) ----

    def test_clear_queue_removes_all_non_processing_and_keeps_processing(self) -> None:
        store = SqliteJobStore(self.db)
        queued = store.enqueue(self.source("q.mp4"), self.output_dir)
        paused = store.enqueue(self.source("p.mp4"), self.output_dir)
        paused.status = "paused"
        store.update(paused)
        processing = store.enqueue(self.source("proc.mp4"), self.output_dir)
        processing.status = "processing"
        store.update(processing)

        removed = 0
        for job in store.list_all():
            if job.status == "processing":
                continue
            store.remove(job.job_id)
            removed += 1

        self.assertEqual(removed, 2)
        remaining = store.list_all()
        self.assertEqual([job.job_id for job in remaining], [processing.job_id])
        self.assertIsNone(store.get(queued.job_id))
        self.assertIsNone(store.get(paused.job_id))

    # ---- queue order remains deterministic after removal -------------------

    def test_queue_order_remains_deterministic_after_removing_a_middle_item(self) -> None:
        store = SqliteJobStore(self.db)
        jobs = [store.enqueue(self.source(f"{i}.mp4"), self.output_dir) for i in range(5)]
        store.remove(jobs[2].job_id)
        remaining_ids = [job.job_id for job in store.list_all()]
        expected_ids = [job.job_id for i, job in enumerate(jobs) if i != 2]
        self.assertEqual(remaining_ids, expected_ids)

    # ---- runner safely handles a job removed while queued ------------------

    def test_runner_skips_a_job_removed_before_its_turn_without_crashing_the_queue(self) -> None:
        store = SqliteJobStore(self.db)
        first = store.enqueue(self.source("first.mp4"), self.output_dir, metadata={"chunk_ms": "3000"})
        second = store.enqueue(self.source("second.mp4"), self.output_dir, metadata={"chunk_ms": "3000"})
        third = store.enqueue(self.source("third.mp4"), self.output_dir, metadata={"chunk_ms": "3000"})

        events: list[str] = []

        def callback(event):
            events.append(event.kind)
            # Simulate the user removing the still-queued "second" job while
            # "first" is actively processing, mirroring the real UI race.
            if event.kind == "job_started" and event.job_id == first.job_id:
                store.remove(second.job_id)

        runner = QueueRunner(FakeMedia(self.chunk_dir), FakeEngine(), Utf8TranscriptWriter(), store, callback=callback)
        runner.run()  # must not raise

        self.assertIn("job_skipped", events)
        self.assertEqual(store.get(first.job_id).status, "completed")
        self.assertIsNone(store.get(second.job_id))
        self.assertEqual(store.get(third.job_id).status, "completed")


if __name__ == "__main__":
    unittest.main()
