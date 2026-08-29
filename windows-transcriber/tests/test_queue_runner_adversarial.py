from __future__ import annotations

import errno
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

try:
    from emma_video_transcriber.contracts import AudioChunk, MediaInfo, TranscriptSegment
    from emma_video_transcriber.jobs import QueueRunner, SqliteJobStore
    from emma_video_transcriber.output import Utf8TranscriptWriter
    QUEUE_AVAILABLE = True
except ImportError:
    QUEUE_AVAILABLE = False


class SimulatedProcessCrash(BaseException):
    pass


class FakeMedia:
    def __init__(self, temp_dir: Path, *, duration_ms: int = 3_000, has_audio: bool = True, fail_after_ms: int | None = None):
        self.temp_dir = temp_dir
        self.duration_ms = duration_ms
        self.has_audio = has_audio
        self.fail_after_ms = fail_after_ms
        self.calls: list[tuple[str, int, int]] = []

    def probe(self, source: Path):
        if not source.exists():
            raise FileNotFoundError(source)
        return MediaInfo(source, self.duration_ms, source.stat().st_size, self.has_audio, "aac" if self.has_audio else None)

    def iter_audio_chunks(self, source: Path, start_ms: int = 0, chunk_ms: int = 600_000):
        cursor = start_ms
        while cursor < self.duration_ms:
            if self.fail_after_ms is not None and cursor >= self.fail_after_ms:
                raise FileNotFoundError("source removed mid-job")
            end = min(cursor + chunk_ms, self.duration_ms)
            p = self.temp_dir / f"chunk-{cursor}-{end}.wav"
            p.write_bytes(b"audio")
            self.calls.append((source.name, cursor, end))
            yield AudioChunk(p, cursor, end)
            cursor = end


class FakeEngine:
    def __init__(self, *, crash_at_ms: int | None = None):
        self.crash_at_ms = crash_at_ms

    def transcribe_chunk(self, chunk: AudioChunk, *, language: str | None = None):
        if self.crash_at_ms is not None and chunk.start_ms == self.crash_at_ms:
            raise SimulatedProcessCrash("power loss during transcription")
        return [TranscriptSegment(chunk.start_ms, chunk.end_ms, f"{chunk.start_ms}-{chunk.end_ms}")]


class CrashOnCheckpointStore:
    def __init__(self, inner, crash_at_ms: int):
        self.inner = inner
        self.crash_at_ms = crash_at_ms
        self.armed = True

    def add(self, job):
        return self.inner.add(job)

    def get(self, job_id):
        return self.inner.get(job_id)

    def list_all(self):
        return self.inner.list_all()

    def update(self, job):
        if self.armed and job.status == "processing" and job.current_ms == self.crash_at_ms:
            self.armed = False
            raise SimulatedProcessCrash("power loss after TXT fsync before checkpoint")
        return self.inner.update(job)


class FailingWriter:
    def __init__(self, error_number: int, message: str):
        self.error_number = error_number
        self.message = message

    def append_segments(self, output_path: Path, segments: list[TranscriptSegment]) -> None:
        raise OSError(self.error_number, self.message, str(output_path))


@unittest.skipUnless(QUEUE_AVAILABLE, "queue/output lane not integrated on this branch")
class QueueRunnerAdversarialTests(unittest.TestCase):
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

    def test_multiple_jobs_continue_sequentially(self) -> None:
        store = SqliteJobStore(self.db)
        sources = [self.source("A.mp4"), self.source("한글 B (1)!.mp4"), self.source("C.mp4")]
        jobs = [store.enqueue(source, self.output_dir, metadata={"chunk_ms": "1000"}) for source in sources]
        events = []
        runner = QueueRunner(FakeMedia(self.chunk_dir), FakeEngine(), Utf8TranscriptWriter(), store, callback=events.append)
        runner.run()
        loaded = [store.get(job.job_id) for job in jobs]
        self.assertEqual([job.status for job in loaded], ["completed", "completed", "completed"])
        started = [event.job_id for event in events if event.kind == "job_started"]
        self.assertEqual(started, [job.job_id for job in jobs])
        self.assertEqual([job.output_path.name for job in jobs], ["T001.txt", "T002.txt", "T003.txt"])

    def test_existing_t001_is_never_overwritten(self) -> None:
        self.output_dir.mkdir()
        existing = self.output_dir / "T001.txt"
        existing.write_text("KEEP ME", encoding="utf-8")
        store = SqliteJobStore(self.db)
        job = store.enqueue(self.source("video.mp4"), self.output_dir)
        self.assertEqual(job.output_path.name, "T002.txt")
        self.assertEqual(existing.read_text(encoding="utf-8"), "KEEP ME")

    def test_crash_during_second_chunk_resumes_without_duplicate(self) -> None:
        store = SqliteJobStore(self.db)
        source = self.source("long.mp4")
        job = store.enqueue(source, self.output_dir, metadata={"chunk_ms": "1000"})
        first = QueueRunner(FakeMedia(self.chunk_dir), FakeEngine(crash_at_ms=1000), Utf8TranscriptWriter(), store)
        with self.assertRaises(SimulatedProcessCrash):
            first.run()
        persisted = store.get(job.job_id)
        self.assertEqual(persisted.current_ms, 1000)
        second = QueueRunner(FakeMedia(self.chunk_dir), FakeEngine(), Utf8TranscriptWriter(), store)
        second.run()
        text = job.output_path.read_text(encoding="utf-8")
        self.assertEqual(text, "0-1000\n1000-2000\n2000-3000\n")
        self.assertEqual(text.count("0-1000\n"), 1)
        self.assertEqual(store.get(job.job_id).status, "completed")

    def test_crash_after_txt_flush_before_checkpoint_is_repaired(self) -> None:
        real_store = SqliteJobStore(self.db)
        source = self.source("flush-crash.mp4")
        job = real_store.enqueue(source, self.output_dir, metadata={"chunk_ms": "1000"})
        crash_store = CrashOnCheckpointStore(real_store, crash_at_ms=1000)
        first = QueueRunner(FakeMedia(self.chunk_dir), FakeEngine(), Utf8TranscriptWriter(), crash_store)
        with self.assertRaises(SimulatedProcessCrash):
            first.run()
        self.assertEqual(job.output_path.read_text(encoding="utf-8"), "0-1000\n")
        persisted = real_store.get(job.job_id)
        self.assertEqual(persisted.current_ms, 0)
        self.assertEqual(persisted.status, "processing")
        second = QueueRunner(FakeMedia(self.chunk_dir), FakeEngine(), Utf8TranscriptWriter(), real_store)
        second.run()
        text = job.output_path.read_text(encoding="utf-8")
        self.assertEqual(text, "0-1000\n1000-2000\n2000-3000\n")
        self.assertEqual(text.count("0-1000\n"), 1)
        self.assertEqual(real_store.get(job.job_id).status, "completed")

    def test_source_removed_mid_job_preserves_committed_prefix_and_fails_safely(self) -> None:
        store = SqliteJobStore(self.db)
        source = self.source("remove-me.mp4")
        job = store.enqueue(source, self.output_dir, metadata={"chunk_ms": "1000"})
        runner = QueueRunner(FakeMedia(self.chunk_dir, fail_after_ms=1000), FakeEngine(), Utf8TranscriptWriter(), store)
        runner.run()
        loaded = store.get(job.job_id)
        self.assertEqual(loaded.status, "failed")
        self.assertEqual(loaded.current_ms, 1000)
        self.assertEqual(job.output_path.read_text(encoding="utf-8"), "0-1000\n")
        self.assertEqual(source.read_bytes(), b"immutable-source")

    def test_no_audio_fails_without_touching_source(self) -> None:
        store = SqliteJobStore(self.db)
        source = self.source("silent.mp4")
        job = store.enqueue(source, self.output_dir)
        QueueRunner(FakeMedia(self.chunk_dir, has_audio=False), FakeEngine(), Utf8TranscriptWriter(), store).run()
        loaded = store.get(job.job_id)
        self.assertEqual(loaded.status, "failed")
        self.assertEqual(loaded.current_ms, 0)
        self.assertEqual(source.read_bytes(), b"immutable-source")

    def test_output_write_permission_failure_does_not_advance_checkpoint(self) -> None:
        store = SqliteJobStore(self.db)
        source = self.source("permission.mp4")
        job = store.enqueue(source, self.output_dir, metadata={"chunk_ms": "1000"})
        runner = QueueRunner(
            FakeMedia(self.chunk_dir),
            FakeEngine(),
            FailingWriter(errno.EACCES, "permission denied"),
            store,
        )
        runner.run()
        loaded = store.get(job.job_id)
        self.assertEqual(loaded.status, "failed")
        self.assertEqual(loaded.current_ms, 0)
        self.assertIn("permission denied", (loaded.error or "").lower())
        self.assertEqual(source.read_bytes(), b"immutable-source")

    def test_disk_full_does_not_advance_checkpoint_or_touch_source(self) -> None:
        store = SqliteJobStore(self.db)
        source = self.source("disk-full.mp4")
        job = store.enqueue(source, self.output_dir, metadata={"chunk_ms": "1000"})
        runner = QueueRunner(
            FakeMedia(self.chunk_dir),
            FakeEngine(),
            FailingWriter(errno.ENOSPC, "no space left on device"),
            store,
        )
        runner.run()
        loaded = store.get(job.job_id)
        self.assertEqual(loaded.status, "failed")
        self.assertEqual(loaded.current_ms, 0)
        self.assertIn("space", (loaded.error or "").lower())
        self.assertEqual(source.read_bytes(), b"immutable-source")

    def test_request_stop_pauses_only_after_safe_chunk_commit(self) -> None:
        store = SqliteJobStore(self.db)
        source = self.source("stop.mp4")
        job = store.enqueue(source, self.output_dir, metadata={"chunk_ms": "1000"})
        runner = None

        def callback(event):
            if event.kind == "chunk_committed" and event.current_ms == 1000:
                runner.request_stop()

        runner = QueueRunner(FakeMedia(self.chunk_dir), FakeEngine(), Utf8TranscriptWriter(), store, callback=callback)
        runner.run()
        loaded = store.get(job.job_id)
        self.assertEqual(loaded.status, "paused")
        self.assertEqual(loaded.current_ms, 1000)
        self.assertEqual(job.output_path.read_text(encoding="utf-8"), "0-1000\n")


if __name__ == "__main__":
    unittest.main()
