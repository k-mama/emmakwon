from __future__ import annotations

import argparse
import hashlib
import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "runtime" / "ffmpeg"
CACHE = ROOT / "build" / ".cache"

# Immutable BtbN release tag. We use the LGPL build because the application only
# executes ffmpeg/ffprobe as separate processes; it does not link FFmpeg libraries.
RELEASE_TAG = "autobuild-2026-08-20-13-45"
ARCHIVE_NAME = "ffmpeg-n9.0.1-6-g9d4ca21220-win64-lgpl-9.0.zip"
BASE_URL = f"https://github.com/BtbN/FFmpeg-Builds/releases/download/{RELEASE_TAG}"
ARCHIVE_URL = f"{BASE_URL}/{ARCHIVE_NAME}"
CHECKSUM_URL = f"{BASE_URL}/checksums.sha256"
USER_AGENT = "EmmaVideoTranscriber-Build/0.1"


def _download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=120) as response, destination.open("wb") as output:
        shutil.copyfileobj(response, output, length=1024 * 1024)


def _expected_sha256(checksums: str, filename: str) -> str:
    for raw in checksums.splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split(maxsplit=1)
        if len(parts) != 2:
            continue
        digest, listed_name = parts
        listed_name = listed_name.lstrip("*")
        if Path(listed_name).name == filename:
            if len(digest) != 64:
                break
            return digest.lower()
    raise RuntimeError(f"No SHA256 entry found for {filename}")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _copy_member(archive: zipfile.ZipFile, member: zipfile.ZipInfo, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with archive.open(member) as source, destination.open("wb") as output:
        shutil.copyfileobj(source, output)


def provision(force: bool = False) -> Path:
    ffmpeg = DESTINATION / "bin" / "ffmpeg.exe"
    ffprobe = DESTINATION / "bin" / "ffprobe.exe"
    if not force and ffmpeg.is_file() and ffprobe.is_file():
        return DESTINATION

    CACHE.mkdir(parents=True, exist_ok=True)
    archive_path = CACHE / ARCHIVE_NAME
    checksum_path = CACHE / f"{RELEASE_TAG}-checksums.sha256"

    if force or not checksum_path.is_file():
        _download(CHECKSUM_URL, checksum_path)
    checksums = checksum_path.read_text(encoding="utf-8", errors="replace")
    expected = _expected_sha256(checksums, ARCHIVE_NAME)

    if force or not archive_path.is_file() or _sha256(archive_path) != expected:
        archive_path.unlink(missing_ok=True)
        _download(ARCHIVE_URL, archive_path)
    actual = _sha256(archive_path)
    if actual != expected:
        archive_path.unlink(missing_ok=True)
        raise RuntimeError(f"FFmpeg SHA256 mismatch: expected {expected}, got {actual}")

    with tempfile.TemporaryDirectory(prefix="emma-ffmpeg-") as temp_name:
        staged = Path(temp_name) / "ffmpeg"
        (staged / "bin").mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(archive_path) as archive:
            by_name: dict[str, zipfile.ZipInfo] = {}
            license_members: list[zipfile.ZipInfo] = []
            for member in archive.infolist():
                if member.is_dir():
                    continue
                base = Path(member.filename).name.lower()
                if base in {"ffmpeg.exe", "ffprobe.exe"}:
                    by_name[base] = member
                if base.startswith(("license", "copying")) and len(Path(member.filename).parts) <= 3:
                    license_members.append(member)

            missing = [name for name in ("ffmpeg.exe", "ffprobe.exe") if name not in by_name]
            if missing:
                raise RuntimeError(f"FFmpeg archive missing: {', '.join(missing)}")

            for name, member in by_name.items():
                _copy_member(archive, member, staged / "bin" / name)

            for member in license_members:
                _copy_member(archive, member, staged / "licenses" / Path(member.filename).name)

        (staged / "BUILD_INFO.txt").write_text(
            "\n".join(
                [
                    "EMMA VIDEO TRANSCRIBER bundled FFmpeg runtime",
                    f"Release tag: {RELEASE_TAG}",
                    f"Archive: {ARCHIVE_NAME}",
                    f"SHA256: {expected}",
                    f"Source: {BASE_URL}",
                    "License variant: LGPL build",
                    "",
                ]
            ),
            encoding="utf-8",
        )

        if DESTINATION.exists():
            shutil.rmtree(DESTINATION)
        shutil.copytree(staged, DESTINATION)

    return DESTINATION


def main() -> int:
    parser = argparse.ArgumentParser(description="Provision the pinned FFmpeg runtime for the Windows portable build.")
    parser.add_argument("--force", action="store_true", help="Redownload and replace the cached FFmpeg build")
    args = parser.parse_args()
    path = provision(force=args.force)
    print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
