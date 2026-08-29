from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class AppendJournal:
    job_id: str
    output_path: str
    safe_offset: int
    chunk_start_ms: int
    chunk_end_ms: int


def journal_path(output_path: Path) -> Path:
    output_path = Path(output_path)
    return output_path.with_name(f".{output_path.name}.emma-journal")


def write_journal(entry: AppendJournal) -> Path:
    path = journal_path(Path(entry.output_path))
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    payload = json.dumps(asdict(entry), ensure_ascii=False, sort_keys=True)
    with temp.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(payload)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp, path)
    return path


def read_journal(output_path: Path) -> AppendJournal | None:
    path = journal_path(output_path)
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return AppendJournal(
        job_id=str(data["job_id"]),
        output_path=str(data["output_path"]),
        safe_offset=int(data["safe_offset"]),
        chunk_start_ms=int(data["chunk_start_ms"]),
        chunk_end_ms=int(data["chunk_end_ms"]),
    )


def clear_journal(output_path: Path) -> None:
    journal_path(output_path).unlink(missing_ok=True)


def recover_output(output_path: Path, *, committed_ms: int, job_id: str) -> str:
    """Recover a pending append. Returns 'none', 'kept', or 'truncated'."""
    entry = read_journal(output_path)
    if entry is None:
        return "none"
    if entry.job_id != job_id or Path(entry.output_path) != Path(output_path):
        raise RuntimeError(f"journal mismatch for {output_path}")
    if committed_ms >= entry.chunk_end_ms:
        clear_journal(output_path)
        return "kept"
    output_path = Path(output_path)
    if not output_path.exists():
        raise RuntimeError(f"journaled transcript is missing: {output_path}")
    current_size = output_path.stat().st_size
    if current_size < entry.safe_offset:
        raise RuntimeError(
            f"transcript is shorter than safe journal offset ({current_size} < {entry.safe_offset})"
        )
    with output_path.open("r+b") as handle:
        handle.truncate(entry.safe_offset)
        handle.flush()
        os.fsync(handle.fileno())
    clear_journal(output_path)
    return "truncated"
