from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from emma_video_transcriber.isolated_worker import TranscriptionWorker
from emma_video_transcriber.performance import (
    PERFORMANCE_BALANCED,
    PERFORMANCE_MODE_ENV,
    PERFORMANCE_TURBO,
    default_cpu_threads,
    gpu_batch_sizes,
    normalize_performance_mode,
)
from emma_video_transcriber.ui.bridge import UiEventBridge


class PerformanceModeTests(unittest.TestCase):
    def test_invalid_mode_fails_safe_to_balanced(self) -> None:
        self.assertEqual(normalize_performance_mode("anything"), PERFORMANCE_BALANCED)
        self.assertEqual(normalize_performance_mode(None), PERFORMANCE_BALANCED)

    def test_balanced_and_turbo_have_distinct_gpu_policies(self) -> None:
        self.assertEqual(gpu_batch_sizes(PERFORMANCE_BALANCED), (2, 1))
        self.assertEqual(gpu_batch_sizes(PERFORMANCE_TURBO), (4, 2, 1))

    def test_turbo_allows_more_cpu_helpers_than_balanced(self) -> None:
        with patch("emma_video_transcriber.performance.os.cpu_count", return_value=20):
            balanced = default_cpu_threads(PERFORMANCE_BALANCED)
            turbo = default_cpu_threads(PERFORMANCE_TURBO)
        self.assertEqual(balanced, 5)
        self.assertEqual(turbo, 12)
        self.assertGreater(turbo, balanced)

    def test_fresh_turbo_worker_import_selects_turbo_engine_batch(self) -> None:
        env = os.environ.copy()
        env[PERFORMANCE_MODE_ENV] = PERFORMANCE_TURBO
        completed = subprocess.run(
            [
                sys.executable,
                "-c",
                "from emma_video_transcriber.engine.policy import GPU_BATCH_SIZES; print(','.join(map(str, GPU_BATCH_SIZES)))",
            ],
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.stdout.strip(), "4,2,1")


class _FakeLiveProcess:
    def __init__(self) -> None:
        self.returncode: int | None = None
        self.terminated = False

    def poll(self) -> int | None:
        return self.returncode

    def terminate(self) -> None:
        self.terminated = True
        self.returncode = 1


class WorkerControlTests(unittest.TestCase):
    def test_stop_request_terminates_live_child_and_is_not_just_pause(self) -> None:
        worker = TranscriptionWorker(Path("jobs.sqlite3"), performance_mode="turbo")
        fake = _FakeLiveProcess()
        worker._process = fake  # type: ignore[assignment]

        worker.request_stop()

        self.assertTrue(worker._stop_requested.is_set())
        self.assertFalse(worker._pause_requested.is_set())
        self.assertTrue(fake.terminated)
        self.assertEqual(worker.performance_mode, PERFORMANCE_TURBO)


class UiControlBridgeTests(unittest.TestCase):
    def test_pause_stop_and_mode_requests_are_real_signals(self) -> None:
        bridge = UiEventBridge()
        seen: list[tuple[str, str | None]] = []
        bridge.pause_transcription_requested.connect(lambda: seen.append(("pause", None)))
        bridge.stop_transcription_requested.connect(lambda: seen.append(("stop", None)))
        bridge.performance_mode_requested.connect(lambda mode: seen.append(("mode", mode)))

        bridge.request_pause()
        bridge.request_stop()
        bridge.request_performance_mode("turbo")

        self.assertEqual(
            seen,
            [("pause", None), ("stop", None), ("mode", "turbo")],
        )


if __name__ == "__main__":
    unittest.main()
