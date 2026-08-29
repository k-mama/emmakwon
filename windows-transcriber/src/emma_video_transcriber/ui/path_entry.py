from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class PathEntryResult:
    accepted: bool
    path: Path | None = None
    message: str = ""


def clean_path_text(text: str) -> str:
    """Normalize pasted Windows path text without changing the stored source path."""
    value = text.strip()
    if len(value) >= 2 and value.startswith('"') and value.endswith('"'):
        value = value[1:-1].strip()
    return value


def path_identity(path: Path) -> str:
    """Return a stable comparison key; Windows comparison is case-insensitive."""
    normalized = os.path.abspath(os.path.normpath(str(path)))
    return os.path.normcase(normalized)


def validate_path_entry(text: str, existing_paths: Iterable[Path]) -> PathEntryResult:
    cleaned = clean_path_text(text)
    if not cleaned:
        return PathEntryResult(False, message="Paste the full video file path first.")

    candidate = Path(cleaned)
    if not candidate.is_file():
        return PathEntryResult(False, message="File not found. Check the path and try again.")

    candidate_key = path_identity(candidate)
    for existing in existing_paths:
        if path_identity(Path(existing)) == candidate_key:
            return PathEntryResult(False, message="This video is already in the queue.")

    return PathEntryResult(True, path=candidate)
