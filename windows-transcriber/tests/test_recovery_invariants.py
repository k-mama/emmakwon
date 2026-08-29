from __future__ import annotations

import hashlib
import tempfile
import unittest
from dataclasses import dataclass
from pathlib import Path


@dataclass
class DurableState:
    output: str = ""
    checkpoint: int = 0


def append_flush_checkpoint(state: DurableState, chunk_index: int, text: str, crash_at: str | None = None) -> DurableState:
    """Test-only oracle for the locked append -> flush -> checkpoint ordering."""
    before = DurableState(state.output, state.checkpoint)
    candidate_output = before.output + text
    if crash_at == "before_flush":
        return before
    flushed = DurableState(candidate_output, before.checkpoint)
    if crash_at == "after_flush_before_checkpoint":
        return flushed
    return DurableState(flushed.output, chunk_index + 1)


def safe_resume(state: DurableState, chunk_texts: list[str]) -> DurableState:
    """Oracle: repair to committed prefix, then replay only uncommitted chunks."""
    committed_prefix = "".join(chunk_texts[: state.checkpoint])
    repaired = DurableState(committed_prefix, state.checkpoint)
    for idx in range(repaired.checkpoint, len(chunk_texts)):
        repaired = append_flush_checkpoint(repaired, idx, chunk_texts[idx])
    return repaired


class RecoveryInvariantTests(unittest.TestCase):
    def setUp(self) -> None:
        self.chunks = ["A\n", "B\n", "C\n", "D\n"]

    def test_crash_during_chunk_loses_only_uncommitted_chunk(self) -> None:
        state = append_flush_checkpoint(DurableState(), 0, self.chunks[0])
        crashed = append_flush_checkpoint(state, 1, self.chunks[1], "before_flush")
        resumed = safe_resume(crashed, self.chunks)
        self.assertEqual(resumed.output, "".join(self.chunks))
        self.assertEqual(resumed.checkpoint, len(self.chunks))

    def test_crash_after_txt_flush_never_duplicates_text_after_recovery(self) -> None:
        state = append_flush_checkpoint(DurableState(), 0, self.chunks[0])
        crashed = append_flush_checkpoint(state, 1, self.chunks[1], "after_flush_before_checkpoint")
        self.assertEqual(crashed.output, "A\nB\n")
        self.assertEqual(crashed.checkpoint, 1)
        resumed = safe_resume(crashed, self.chunks)
        self.assertEqual(resumed.output, "A\nB\nC\nD\n")
        self.assertEqual(resumed.output.count("B\n"), 1)

    def test_crash_after_checkpoint_keeps_committed_text(self) -> None:
        state = append_flush_checkpoint(DurableState(), 0, self.chunks[0], "after_checkpoint")
        resumed = safe_resume(state, self.chunks)
        self.assertTrue(resumed.output.startswith("A\n"))
        self.assertEqual(resumed.output, "".join(self.chunks))

    def test_every_crash_boundary_converges_to_same_final_output(self) -> None:
        expected = "".join(self.chunks)
        for crash_at in ("before_flush", "after_flush_before_checkpoint", "after_checkpoint", None):
            with self.subTest(crash_at=crash_at):
                state = append_flush_checkpoint(DurableState(), 0, self.chunks[0])
                state = append_flush_checkpoint(state, 1, self.chunks[1], crash_at)
                final = safe_resume(state, self.chunks)
                self.assertEqual(final.output, expected)
                self.assertEqual(final.checkpoint, len(self.chunks))

    def test_source_hash_oracle_detects_any_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            source = Path(td) / "원본 영상 (keep)! .mp4"
            source.write_bytes(b"immutable-source")
            before = hashlib.sha256(source.read_bytes()).hexdigest()
            after = hashlib.sha256(source.read_bytes()).hexdigest()
            self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
