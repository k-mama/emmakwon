from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest import mock

from emma_video_transcriber.infra.ffmpeg import FFmpegRuntime
from emma_video_transcriber.infra.runtime import configure_runtime_environment


class UiGpuIsolationTests(unittest.TestCase):
    def test_probe_gpu_false_never_calls_nvidia_probe_or_activation(self) -> None:
        fake_ffmpeg = FFmpegRuntime(Path("ffmpeg"), Path("ffprobe"), True)
        with tempfile.TemporaryDirectory() as temp_dir, mock.patch.dict(
            "os.environ",
            {"EMMA_VIDEO_TRANSCRIBER_DATA_DIR": temp_dir},
            clear=False,
        ), mock.patch(
            "emma_video_transcriber.infra.runtime.activate_ffmpeg_path",
            return_value=fake_ffmpeg,
        ), mock.patch(
            "emma_video_transcriber.infra.runtime.gpu_runtime_state"
        ) as gpu_probe, mock.patch(
            "emma_video_transcriber.infra.runtime.activate_gpu_runtime"
        ) as gpu_activate:
            state = configure_runtime_environment(probe_gpu=False)

        self.assertEqual(state.gpu.message, "GPU probing deferred to isolated transcription worker")
        gpu_probe.assert_not_called()
        gpu_activate.assert_not_called()


if __name__ == "__main__":
    unittest.main()
