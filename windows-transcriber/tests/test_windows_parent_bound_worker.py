from __future__ import annotations

import os
import subprocess
import sys
import time
import unittest

from emma_video_transcriber.infra.process_lifetime import (
    bind_child_to_parent_lifetime,
    release_parent_lifetime_job,
)


@unittest.skipUnless(os.name == "nt", "Windows Job Object behavior is Windows-specific")
class WindowsParentBoundWorkerTests(unittest.TestCase):
    def test_closing_parent_job_handle_terminates_child(self) -> None:
        process = subprocess.Popen(
            [sys.executable, "-c", "import time; time.sleep(60)"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        job_handle: int | None = None
        try:
            self.assertIsNone(process.poll())
            job_handle = bind_child_to_parent_lifetime(int(getattr(process, "_handle")))
            self.assertIsNotNone(job_handle)

            # KILL_ON_JOB_CLOSE is the exact invariant we need if the UI process
            # disappears: once its OS handles close, no orphan transcription EXE
            # may survive to keep writing SQLite/output files or block relaunch.
            release_parent_lifetime_job(job_handle)
            job_handle = None

            deadline = time.monotonic() + 5.0
            while process.poll() is None and time.monotonic() < deadline:
                time.sleep(0.05)
            self.assertIsNotNone(process.poll(), "child survived KILL_ON_JOB_CLOSE")
        finally:
            if job_handle is not None:
                release_parent_lifetime_job(job_handle)
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)


if __name__ == "__main__":
    unittest.main()
