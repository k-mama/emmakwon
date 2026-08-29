from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from emma_video_transcriber.media import (
    AudioExtractionError,
    FFmpegMediaPipeline,
    MediaProbeError,
    MissingAudioError,
    cleanup_orphaned_chunks,
    cleanup_temp_chunk,
)


class FFmpegMediaPipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.media = self.root / "긴 이름 [테스트] Emma's 영상.mp4"
        self.media.write_bytes(b"media-bytes")
        self.chunk_dir = self.root / "chunks"
        self.pipeline = FFmpegMediaPipeline(temp_dir=self.chunk_dir)

    def tearDown(self) -> None:
        self.temp.cleanup()

    @staticmethod
    def _completed(payload: dict | None = None) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(
            args=[], returncode=0, stdout=json.dumps(payload or {}), stderr=""
        )

    def test_probe_reports_duration_size_audio_codec_and_preserves_unicode_path(self) -> None:
        payload = {
            "format": {"duration": "36000.125"},
            "streams": [
                {"index": 0, "codec_type": "video", "codec_name": "hevc"},
                {"index": 1, "codec_type": "audio", "codec_name": "aac"},
            ],
        }
        with patch("subprocess.run", return_value=self._completed(payload)) as run:
            info = self.pipeline.probe(self.media)

        self.assertEqual(info.path, self.media)
        self.assertEqual(info.duration_ms, 36_000_125)
        self.assertEqual(info.size_bytes, len(b"media-bytes"))
        self.assertTrue(info.has_audio)
        self.assertEqual(info.audio_codec, "aac")
        args, kwargs = run.call_args
        self.assertIn(os.fspath(self.media), args[0])
        self.assertIs(kwargs["shell"], False)

    def test_probe_without_audio_reports_presence_false(self) -> None:
        payload = {
            "format": {"duration": "12.0"},
            "streams": [{"codec_type": "video", "codec_name": "h264"}],
        }
        with patch("subprocess.run", return_value=self._completed(payload)):
            info = self.pipeline.probe(self.media)
        self.assertFalse(info.has_audio)
        self.assertIsNone(info.audio_codec)

    def test_iter_audio_chunks_raises_clear_error_for_missing_audio(self) -> None:
        payload = {
            "format": {"duration": "12.0"},
            "streams": [{"codec_type": "video", "codec_name": "h264"}],
        }
        with patch("subprocess.run", return_value=self._completed(payload)):
            with self.assertRaisesRegex(MissingAudioError, "no audio track"):
                list(self.pipeline.iter_audio_chunks(self.media))

    def test_resume_starts_at_requested_offset_and_chunks_are_bounded(self) -> None:
        payload = {
            "format": {"duration": "1500.0"},
            "streams": [{"codec_type": "audio", "codec_name": "aac"}],
        }
        commands: list[list[str]] = []

        def fake_run(command: list[str], **kwargs):
            commands.append(command)
            if command[0] == "ffprobe":
                return self._completed(payload)
            output = Path(command[-1])
            output.write_bytes(b"R" * 128)
            return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

        with patch("subprocess.run", side_effect=fake_run):
            chunks = list(
                self.pipeline.iter_audio_chunks(
                    self.media,
                    start_ms=120_000,
                    chunk_ms=600_000,
                )
            )

        self.assertEqual(
            [(chunk.start_ms, chunk.end_ms) for chunk in chunks],
            [(120_000, 720_000), (720_000, 1_320_000), (1_320_000, 1_500_000)],
        )
        ffmpeg_commands = [command for command in commands if command[0] == "ffmpeg"]
        self.assertEqual(ffmpeg_commands[0][ffmpeg_commands[0].index("-ss") + 1], "120.000")
        self.assertEqual(
            [command[command.index("-t") + 1] for command in ffmpeg_commands],
            ["600.000", "600.000", "180.000"],
        )
        for command in ffmpeg_commands:
            self.assertIn("-vn", command)
            self.assertEqual(command[command.index("-ac") + 1], "1")
            self.assertEqual(command[command.index("-ar") + 1], "16000")
            self.assertEqual(command[command.index("-c:a") + 1], "pcm_s16le")
            self.assertIn(os.fspath(self.media), command)

    def test_start_at_or_past_end_produces_no_chunks(self) -> None:
        payload = {
            "format": {"duration": "10.0"},
            "streams": [{"codec_type": "audio", "codec_name": "aac"}],
        }
        with patch("subprocess.run", return_value=self._completed(payload)) as run:
            chunks = list(self.pipeline.iter_audio_chunks(self.media, start_ms=10_000))
        self.assertEqual(chunks, [])
        self.assertEqual(run.call_count, 1)

    def test_failed_extraction_removes_partial_chunk_and_surfaces_stderr(self) -> None:
        payload = {
            "format": {"duration": "60.0"},
            "streams": [{"codec_type": "audio", "codec_name": "aac"}],
        }

        def fake_run(command: list[str], **kwargs):
            if command[0] == "ffprobe":
                return self._completed(payload)
            Path(command[-1]).write_bytes(b"partial")
            raise subprocess.CalledProcessError(
                1, command, output="", stderr="decoder exploded"
            )

        with patch("subprocess.run", side_effect=fake_run):
            with self.assertRaisesRegex(AudioExtractionError, "decoder exploded"):
                list(self.pipeline.iter_audio_chunks(self.media))

        self.assertEqual(list(self.chunk_dir.glob("*.wav")), [])

    def test_probe_uses_stream_duration_when_container_duration_is_missing(self) -> None:
        payload = {
            "format": {"duration": "N/A"},
            "streams": [
                {"codec_type": "video", "duration": "20.0"},
                {"codec_type": "audio", "codec_name": "flac", "duration": "19.5"},
            ],
        }
        with patch("subprocess.run", return_value=self._completed(payload)):
            info = self.pipeline.probe(self.media)
        self.assertEqual(info.duration_ms, 20_000)
        self.assertEqual(info.audio_codec, "flac")

    def test_invalid_probe_json_has_useful_error(self) -> None:
        completed = subprocess.CompletedProcess([], 0, stdout="not-json", stderr="")
        with patch("subprocess.run", return_value=completed):
            with self.assertRaisesRegex(MediaProbeError, "invalid JSON"):
                self.pipeline.probe(self.media)

    def test_cleanup_helpers_remove_only_target_chunks(self) -> None:
        self.chunk_dir.mkdir()
        old_chunk = self.chunk_dir / "emma-audio-old.wav"
        fresh_chunk = self.chunk_dir / "emma-audio-fresh.wav"
        unrelated = self.chunk_dir / "keep.wav"
        old_chunk.write_bytes(b"old")
        fresh_chunk.write_bytes(b"fresh")
        unrelated.write_bytes(b"keep")
        os.utime(old_chunk, (100.0, 100.0))
        os.utime(fresh_chunk, (950.0, 950.0))

        removed = cleanup_orphaned_chunks(
            self.chunk_dir,
            older_than_seconds=100,
            now=1000.0,
        )

        self.assertEqual(removed, [old_chunk])
        self.assertFalse(old_chunk.exists())
        self.assertTrue(fresh_chunk.exists())
        self.assertTrue(unrelated.exists())
        self.assertTrue(cleanup_temp_chunk(fresh_chunk))
        self.assertFalse(cleanup_temp_chunk(fresh_chunk))

    def test_argument_validation_happens_before_ffmpeg(self) -> None:
        with self.assertRaises(ValueError):
            list(self.pipeline.iter_audio_chunks(self.media, start_ms=-1))
        with self.assertRaises(ValueError):
            list(self.pipeline.iter_audio_chunks(self.media, chunk_ms=0))


if __name__ == "__main__":
    unittest.main()
