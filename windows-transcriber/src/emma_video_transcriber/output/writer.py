from __future__ import annotations

import os
from pathlib import Path

from ..contracts import TranscriptSegment


class Utf8TranscriptWriter:
    """Append plain readable UTF-8 transcript text and fsync every chunk."""

    def append_segments(self, output_path: Path, segments: list[TranscriptSegment]) -> None:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        lines = [segment.text.strip() for segment in segments if segment.text.strip()]
        if not lines:
            return
        payload = "\n".join(lines) + "\n"
        with output_path.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
