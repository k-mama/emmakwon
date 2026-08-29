from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from ..contracts import JobRecord
from ..output.naming import reserve_short_output

STATUSES = ("queued", "processing", "paused", "completed", "failed")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class SqliteJobStore:
    """Durable stdlib-sqlite queue/checkpoint store compatible with JobStore."""

    def __init__(self, db_path: Path) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path, timeout=30.0)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 30000")
        connection.execute("PRAGMA synchronous = FULL")
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.execute("PRAGMA synchronous = FULL")
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    queue_seq INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT NOT NULL UNIQUE,
                    source_path TEXT NOT NULL,
                    source_name TEXT NOT NULL,
                    output_path TEXT NOT NULL UNIQUE,
                    duration_ms INTEGER NOT NULL DEFAULT -1,
                    current_ms INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL CHECK(status IN ('queued','processing','paused','completed','failed')),
                    error TEXT,
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_jobs_status_created
                    ON jobs(status, created_at, queue_seq);
                """
            )

    def add(self, job: JobRecord) -> None:
        self._validate(job)
        now = _utc_now()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO jobs (
                    job_id, source_path, source_name, output_path,
                    duration_ms, current_ms, status, error, metadata_json,
                    created_at, updated_at, started_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job.job_id,
                    str(job.source_path),
                    job.source_name,
                    str(job.output_path),
                    job.duration_ms,
                    job.current_ms,
                    job.status,
                    job.error,
                    json.dumps(job.metadata, ensure_ascii=False, sort_keys=True),
                    now,
                    now,
                    now if job.status == "processing" else None,
                    now if job.status == "completed" else None,
                ),
            )

    def update(self, job: JobRecord) -> None:
        self._validate(job)
        now = _utc_now()
        with self._connect() as connection:
            row = connection.execute(
                "SELECT started_at, completed_at FROM jobs WHERE job_id = ?", (job.job_id,)
            ).fetchone()
            if row is None:
                raise KeyError(f"unknown job_id: {job.job_id}")
            started_at = row["started_at"]
            completed_at = row["completed_at"]
            if job.status == "processing" and started_at is None:
                started_at = now
            if job.status == "completed":
                completed_at = completed_at or now
            elif job.status != "completed":
                completed_at = None
            connection.execute(
                """
                UPDATE jobs SET
                    source_path = ?, source_name = ?, output_path = ?,
                    duration_ms = ?, current_ms = ?, status = ?, error = ?,
                    metadata_json = ?, updated_at = ?, started_at = ?, completed_at = ?
                WHERE job_id = ?
                """,
                (
                    str(job.source_path),
                    job.source_name,
                    str(job.output_path),
                    job.duration_ms,
                    job.current_ms,
                    job.status,
                    job.error,
                    json.dumps(job.metadata, ensure_ascii=False, sort_keys=True),
                    now,
                    started_at,
                    completed_at,
                    job.job_id,
                ),
            )

    def get(self, job_id: str) -> JobRecord | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
        return self._row_to_job(row) if row is not None else None

    def list_all(self) -> list[JobRecord]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM jobs ORDER BY queue_seq").fetchall()
        return [self._row_to_job(row) for row in rows]

    def enqueue(
        self,
        source_path: Path,
        output_dir: Path,
        *,
        metadata: dict[str, str] | None = None,
        job_id: str | None = None,
    ) -> JobRecord:
        source_path = Path(source_path)
        with self._connect() as connection:
            reserved = [
                Path(row["output_path"])
                for row in connection.execute("SELECT output_path FROM jobs")
            ]
        output_path = reserve_short_output(Path(output_dir), reserved_paths=reserved)
        job = JobRecord(
            job_id=job_id or uuid.uuid4().hex,
            source_path=source_path,
            output_path=output_path,
            source_name=source_path.name,
            metadata=dict(metadata or {}),
        )
        try:
            self.add(job)
        except Exception:
            if output_path.exists() and output_path.stat().st_size == 0:
                output_path.unlink(missing_ok=True)
            raise
        return job

    def timestamps(self, job_id: str) -> dict[str, str | None]:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT created_at, updated_at, started_at, completed_at FROM jobs WHERE job_id = ?",
                (job_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"unknown job_id: {job_id}")
        return {key: row[key] for key in row.keys()}

    @staticmethod
    def _validate(job: JobRecord) -> None:
        if job.status not in STATUSES:
            raise ValueError(f"invalid job status: {job.status}")
        if job.current_ms < 0:
            raise ValueError("current_ms must be >= 0")
        if job.duration_ms >= 0 and job.current_ms > job.duration_ms:
            raise ValueError("current_ms cannot exceed duration_ms")

    @staticmethod
    def _row_to_job(row: sqlite3.Row) -> JobRecord:
        metadata = json.loads(row["metadata_json"] or "{}")
        return JobRecord(
            job_id=row["job_id"],
            source_path=Path(row["source_path"]),
            output_path=Path(row["output_path"]),
            source_name=row["source_name"],
            duration_ms=int(row["duration_ms"]),
            current_ms=int(row["current_ms"]),
            status=row["status"],
            error=row["error"],
            metadata={str(key): str(value) for key, value in metadata.items()},
        )
