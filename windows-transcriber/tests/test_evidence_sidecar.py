from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from emma_video_transcriber.contracts import JobRecord, TranscriptSegment
from emma_video_transcriber.output.evidence import (
    commit_evidence_chunk,
    complete_evidence,
    evidence_path,
    reconcile_evidence,
)


class EvidenceSidecarTests(unittest.TestCase):
    def make_job(self, root: Path) -> JobRecord:
        source = root / "source.mp4"
        source.write_bytes(b"source")
        return JobRecord(
            job_id="job-1",
            source_path=source,
            output_path=root / "T001.txt",
            source_name=source.name,
            duration_ms=10_000,
            current_ms=0,
        )

    def load(self, job: JobRecord) -> dict:
        return json.loads(evidence_path(job.output_path).read_text(encoding="utf-8"))

    def test_new_evidence_is_partial_until_full_job_completion(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            job = self.make_job(Path(directory))
            reconcile_evidence(job)
            value = self.load(job)
            self.assertEqual(value["producer"], "emma-video-transcriber")
            self.assertEqual(value["status"], "partial")
            self.assertEqual(value["committedMs"], 0)
            self.assertEqual(value["segments"], [])

            commit_evidence_chunk(
                job,
                0,
                5_000,
                [TranscriptSegment(start_ms=500, end_ms=1_500, text="hello")],
            )
            value = self.load(job)
            self.assertEqual(value["status"], "partial")
            self.assertEqual(value["committedMs"], 5_000)
            self.assertEqual(value["segments"][0]["text"], "hello")

            job.current_ms = 10_000
            commit_evidence_chunk(
                job,
                5_000,
                10_000,
                [TranscriptSegment(start_ms=6_000, end_ms=7_000, text="world")],
            )
            complete_evidence(job)
            value = self.load(job)
            self.assertEqual(value["producer"], "emma-video-transcriber")
            self.assertEqual(value["status"], "completed")
            self.assertEqual(value["committedMs"], 10_000)
            self.assertEqual([item["text"] for item in value["segments"]], ["hello", "world"])
            self.assertEqual(value["kind"], "emma-transcript-evidence")
            self.assertEqual(value["schemaVersion"], 1)

    def test_retry_replaces_current_chunk_instead_of_duplicating_it(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            job = self.make_job(Path(directory))
            reconcile_evidence(job)
            segment = TranscriptSegment(start_ms=1_000, end_ms=2_000, text="same")
            commit_evidence_chunk(job, 0, 5_000, [segment])
            commit_evidence_chunk(job, 0, 5_000, [segment])
            value = self.load(job)
            self.assertEqual(len(value["segments"]), 1)

    def test_reconcile_rewinds_evidence_to_durable_job_checkpoint(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            job = self.make_job(Path(directory))
            reconcile_evidence(job)
            commit_evidence_chunk(
                job,
                0,
                5_000,
                [TranscriptSegment(start_ms=1_000, end_ms=2_000, text="first")],
            )
            job.current_ms = 5_000
            commit_evidence_chunk(
                job,
                5_000,
                10_000,
                [TranscriptSegment(start_ms=6_000, end_ms=7_000, text="second")],
            )

            # Simulate a crash after evidence write but before the second checkpoint became durable.
            job.current_ms = 5_000
            reconcile_evidence(job)
            value = self.load(job)
            self.assertEqual(value["status"], "partial")
            self.assertEqual(value["committedMs"], 5_000)
            self.assertEqual([item["text"] for item in value["segments"]], ["first"])

    def test_completion_is_refused_when_checkpoint_is_not_full_duration(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            job = self.make_job(Path(directory))
            reconcile_evidence(job)
            job.current_ms = 5_000
            with self.assertRaises(RuntimeError):
                complete_evidence(job)

    def test_segment_outside_committed_chunk_is_refused(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            job = self.make_job(Path(directory))
            reconcile_evidence(job)
            with self.assertRaises(RuntimeError):
                commit_evidence_chunk(
                    job,
                    0,
                    5_000,
                    [TranscriptSegment(start_ms=4_500, end_ms=5_500, text="escaped")],
                )

    def test_existing_sidecar_from_another_producer_is_refused(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            job = self.make_job(Path(directory))
            reconcile_evidence(job)
            path = evidence_path(job.output_path)
            value = self.load(job)
            value["producer"] = "other-transcriber"
            path.write_text(json.dumps(value), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "producer"):
                reconcile_evidence(job)


if __name__ == "__main__":
    unittest.main()
