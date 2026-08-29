from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable


def _path_key(path: Path) -> str:
    return os.path.normcase(os.path.abspath(Path(path)))


def reserve_short_output(
    output_dir: Path,
    *,
    prefix: str = "T",
    width: int = 3,
    reserved_paths: Iterable[Path] = (),
) -> Path:
    """Atomically reserve the next T001.txt-style output without overwriting files."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    reserved = {_path_key(path) for path in reserved_paths}
    index = 1
    while True:
        candidate = output_dir / f"{prefix}{index:0{width}d}.txt"
        if _path_key(candidate) in reserved:
            index += 1
            continue
        try:
            with candidate.open("x", encoding="utf-8", newline="\n"):
                pass
            return candidate
        except FileExistsError:
            index += 1
