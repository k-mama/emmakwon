from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate tiny adversarial media fixtures with FFmpeg.")
    parser.add_argument("--out", type=Path, default=Path("qa-fixtures"))
    parser.add_argument("--seconds", type=float, default=3.0)
    args = parser.parse_args()
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("ffmpeg is not on PATH")
    args.out.mkdir(parents=True, exist_ok=True)
    normal = args.out / "short speech-like tone.mp4"
    unicode_path = args.out / "한글 파일 (1)! # test.mp4"
    no_audio = args.out / "no audio.mp4"
    corrupt = args.out / "corrupted source.mp4"
    common = ["-hide_banner", "-loglevel", "error", "-y"]
    run([ffmpeg, *common, "-f", "lavfi", "-i", f"color=c=black:s=320x180:d={args.seconds}", "-f", "lavfi", "-i", f"sine=frequency=440:sample_rate=16000:duration={args.seconds}", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(normal)])
    shutil.copy2(normal, unicode_path)
    run([ffmpeg, *common, "-f", "lavfi", "-i", f"color=c=black:s=320x180:d={args.seconds}", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(no_audio)])
    corrupt.write_bytes(b"not a media container\n")
    print(normal)
    print(unicode_path)
    print(no_audio)
    print(corrupt)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
