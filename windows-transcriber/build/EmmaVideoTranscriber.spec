# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path
import sys

from PyInstaller.utils.hooks import collect_dynamic_libs, collect_submodules

root = Path(SPECPATH).parent
src = root / "src"
build_dir = root / "build"
runtime_dir = root / "runtime"
sys.path.insert(0, str(src))

if not (runtime_dir / "ffmpeg" / "bin" / "ffmpeg.exe").is_file():
    raise SystemExit("Bundled FFmpeg is missing. Run: python build/provision_ffmpeg.py")
if not (runtime_dir / "ffmpeg" / "bin" / "ffprobe.exe").is_file():
    raise SystemExit("Bundled ffprobe is missing. Run: python build/provision_ffmpeg.py")

hiddenimports = sorted(
    set(
        collect_submodules("emma_video_transcriber")
        + collect_submodules("faster_whisper")
        + [
            "PySide6.QtCore",
            "PySide6.QtGui",
            "PySide6.QtWidgets",
            "ctranslate2",
            "huggingface_hub",
        ]
    )
)

binaries = collect_dynamic_libs("ctranslate2")
datas = [(str(runtime_dir / "ffmpeg"), "runtime/ffmpeg")]

a = Analysis(
    [str(build_dir / "entrypoint.py")],
    pathex=[str(src)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=1,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="EmmaVideoTranscriber",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="EmmaVideoTranscriber",
)
