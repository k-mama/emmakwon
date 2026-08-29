from __future__ import annotations

import hashlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

try:
    from emma_video_transcriber.media import (
        FFmpegMediaPipeline,
        MediaProbeError,
        MissingAudioError,
    )
    MEDIA_AVAILABLE = True
except ImportError:
    MEDIA_AVAILABLE = False


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@unittest.skipUnless(MEDIA_AVAILABLE, "media lane not integrated on this branch")
class MediaPipelineAdversarialTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.chunks = self.root / "chunks"
        self.ffmpeg = shutil.which("ffmpeg")
        self.ffprobe = shutil.which("ffprobe")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_ffmpeg(self, *args: str) -> None:
        if not self.ffmpeg:
            self.skipTest("ffmpeg is not available for generated fixture tests")
        subprocess.run(
            [self.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", *args],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

    def make_av(self, name: str = "한글 긴 영상 (final)! #1.mp4") -> Path:
        path = self.root / name
        self.run_ffmpeg(
            "-f", "lavfi", "-i", "color=c=black:s=160x90:d=2.4",
            "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=16000:duration=2.4",
            "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
            str(path),
        )
        return path

    def make_video_only(self) -> Path:
        path = self.root / "no audio (1).mp4"
        self.run_ffmpeg(
            "-f", "lavfi", "-i", "color=c=black:s=160x90:d=1.0",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", str(path),
        )
        return path

    def pipeline(self) -> FFmpegMediaPipeline:
        if not self.ffprobe:
            self.skipTest("ffprobe is not available for generated fixture tests")
        return FFmpegMediaPipeline(
            ffmpeg_path=self.ffmpeg or "ffmpeg",
            ffprobe_path=self.ffprobe,
            temp_dir=self.chunks,
        )

    def test_missing_ffprobe_is_explicit_and_source_untouched(self) -> None:
        source = self.root / "source.mp4"
        source.write_bytes(b"not-important-for-missing-tool-test")
        before = sha256(source)
        pipeline = FFmpegMediaPipeline(
            ffprobe_path=str(self.root / "definitely-missing-ffprobe.exe"),
            temp_dir=self.chunks,
        )
        with self.assertRaises(MediaProbeError) as ctx:
            pipeline.probe(source)
        self.assertIn("not found", str(ctx.exception).lower())
        self.assertEqual(sha256(source), before)

    def test_unicode_spaces_punctuation_and_bounded_chunks(self) -> None:
        source = self.make_av()
        before = sha256(source)
        pipeline = self.pipeline()
        info = pipeline.probe(source)
        self.assertTrue(info.has_audio)
        self.assertEqual(info.path, source)
        chunks = []
        try:
            chunks = list(pipeline.iter_audio_chunks(source, start_ms=0, chunk_ms=1_000))
            self.assertGreaterEqual(len(chunks), 2)
            self.assertTrue(all(chunk.end_ms > chunk.start_ms for chunk in chunks))
            self.assertTrue(all(chunk.end_ms - chunk.start_ms <= 1_000 for chunk in chunks))
            self.assertEqual(chunks[0].start_ms, 0)
            self.assertEqual(chunks[-1].end_ms, info.duration_ms)
        finally:
            for chunk in chunks:
                pipeline.cleanup_chunk(chunk)
        self.assertEqual(sha256(source), before)
        self.assertFalse(list(self.chunks.glob("*.wav")))

    def test_no_audio_is_detected_and_extraction_rejected(self) -> None:
        source = self.make_video_only()
        pipeline = self.pipeline()
        info = pipeline.probe(source)
        self.assertFalse(info.has_audio)
        with self.assertRaises(MissingAudioError):
            list(pipeline.iter_audio_chunks(source, chunk_ms=1_000))

    def test_corrupted_source_fails_probe_without_modification(self) -> None:
        source = self.root / "corrupted source.mp4"
        source.write_bytes(b"not a media container\n")
        before = sha256(source)
        with self.assertRaises(MediaProbeError):
            self.pipeline().probe(source)
        self.assertEqual(sha256(source), before)


if __name__ == "__main__":
    unittest.main()
