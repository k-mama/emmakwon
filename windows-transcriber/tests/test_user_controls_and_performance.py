from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

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

    def test_environment_mode_is_normalized(self) -> None:
        old = os.environ.get(PERFORMANCE_MODE_ENV)
        try:
            os.environ[PERFORMANCE_MODE_ENV] = "TURBO"
            self.assertEqual(normalize_performance_mode(os.environ[PERFORMANCE_MODE_ENV]), PERFORMANCE_TURBO)
        finally:
            if old is None:
                os.environ.pop(PERFORMANCE_MODE_ENV, None)
            else:
                os.environ[PERFORMANCE_MODE_ENV] = old


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
