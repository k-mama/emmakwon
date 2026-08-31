from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from emma_video_transcriber.contracts import AudioChunk, MediaInfo, TranscriptSegment
from emma_video_transcriber.jobs import QueueRunner, SqliteJobStore
from emma_video_transcriber.output import Utf8TranscriptWriter


class _Media:
    def __init__(self, root: Path, control: Path | None = None) -> None:
        self.root = root
        self.control = control

    def probe(self, source: Path) -> MediaInfo:
        return MediaInfo(source, duration_ms=2000, size_bytes=source.stat().st_size, has_audio=True)

    def iter_audio_chunks(self, source: Path, start_ms: int = 0, chunk_ms: int = 600_000):
        for start in range(start_ms, 2000, 1000):
            path = self.root / f"{source.stem}-{start}.wav"
            path.write_bytes(b"wav")
            yield AudioChunk(path=path, start_ms=start, end_ms=start + 1000)


class _Engine:
    def __init__(self, control: Path | None = None) -> None:
        self.control = control
        self.calls = 0

    def transcribe_chunk(self, chunk: AudioChunk, *, language: str | None = None):
        self.calls += 1
        if self.control is not None and self.calls == 1:
            self.control.write_text("pause", encoding="utf-8")
        return [TranscriptSegment(chunk.start_ms, chunk.end_ms, f"chunk-{self.calls}")]

    def reset_after_job(self) -> None:
        return None


class IsolatedWorkerBoundaryTests(unittest.TestCase):
    def test_run_one_only_processes_selected_job(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source1 = root / "one.mp4"
            source2 = root / "two.mp4"
            source1.write_bytes(b"1")
            source2.write_bytes(b"2")
            store = SqliteJobStore(root / "jobs.sqlite3")
            out = root / "out"
            first = store.enqueue(source1, out)
            second = store.enqueue(source2, out)
            runner = QueueRunner(_Media(root), _Engine(), Utf8TranscriptWriter(), store)

            runner.run_one(first.job_id)

            self.assertEqual(store.get(first.job_id).status, "completed")
            self.assertEqual(store.get(second.job_id).status, "queued")

    def test_external_control_file_pauses_at_committed_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "one.mp4"
            source.write_bytes(b"1")
            control = root / "worker.control"
            store = SqliteJobStore(root / "jobs.sqlite3")
            job = store.enqueue(source, root / "out")
            runner = QueueRunner(
                _Media(root, control),
                _Engine(control),
                Utf8TranscriptWriter(),
                store,
                control_file=control,
            )

            runner.run_one(job.job_id)

            saved = store.get(job.job_id)
            self.assertEqual(saved.status, "paused")
            self.assertEqual(saved.current_ms, 1000)
            self.assertIn("chunk-1", saved.output_path.read_text(encoding="utf-8"))

    def test_windows_exit_code_is_rendered_as_unsigned_hex(self) -> None:
        try:
            from emma_video_transcriber.isolated_worker import TranscriptionWorker
        except ModuleNotFoundError as exc:
            if exc.name == "PySide6":
                self.skipTest("PySide6 is not installed in this source-only environment")
            raise
        self.assertEqual(TranscriptionWorker._format_exit_code(-1073741819), "0xC0000005")
        self.assertEqual(TranscriptionWorker._format_exit_code(1), "0x00000001")


if __name__ == "__main__":
    unittest.main()
