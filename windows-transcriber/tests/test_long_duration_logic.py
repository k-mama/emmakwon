from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from emma_video_transcriber.contracts import AudioChunk


def virtual_chunks(duration_ms: int, start_ms: int = 0, chunk_ms: int = 600_000):
    """Test-only duration model. It creates no long media fixture."""
    if duration_ms < 0 or start_ms < 0 or chunk_ms <= 0:
        raise ValueError("invalid duration arguments")
    cursor = min(start_ms, duration_ms)
    index = 0
    while cursor < duration_ms:
        end_ms = min(cursor + chunk_ms, duration_ms)
        yield cursor, end_ms, index
        cursor = end_ms
        index += 1


class LongDurationLogicTests(unittest.TestCase):
    def test_twenty_hour_job_is_bounded_to_ten_minute_windows(self) -> None:
        duration_ms = 20 * 60 * 60 * 1_000
        windows = list(virtual_chunks(duration_ms))
        self.assertEqual(len(windows), 120)
        self.assertEqual(windows[0][:2], (0, 600_000))
        self.assertEqual(windows[-1][:2], (71_400_000, 72_000_000))
        self.assertTrue(all((end - start) <= 600_000 for start, end, _ in windows))

    def test_resume_at_committed_boundary_does_not_repeat_prior_window(self) -> None:
        duration_ms = 20 * 60 * 60 * 1_000
        committed_ms = 37 * 600_000
        windows = list(virtual_chunks(duration_ms, start_ms=committed_ms))
        self.assertEqual(windows[0][0], committed_ms)
        self.assertTrue(all(start >= committed_ms for start, _, _ in windows))

    def test_non_divisible_duration_has_exact_final_boundary(self) -> None:
        duration_ms = 72_000_123
        windows = list(virtual_chunks(duration_ms))
        self.assertEqual(windows[-1][1], duration_ms)
        self.assertGreater(windows[-1][1], windows[-1][0])

    def test_chunk_contract_carries_absolute_timestamps(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "chunk.wav"
            p.write_bytes(b"x")
            chunk = AudioChunk(path=p, start_ms=3_600_000, end_ms=4_200_000)
            self.assertEqual(chunk.end_ms - chunk.start_ms, 600_000)
            self.assertEqual(chunk.start_ms, 3_600_000)


if __name__ == "__main__":
    unittest.main()
