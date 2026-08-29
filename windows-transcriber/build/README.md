# EMMA VIDEO TRANSCRIBER — Windows packaging

This directory owns packaging/runtime only. It intentionally does not implement transcription, media chunking, queueing, or UI logic.

## Build

From `windows-transcriber` on Windows 11 with Python 3.11 available:

```powershell
powershell -ExecutionPolicy Bypass -File .\build\build_windows.ps1
```

The script creates its own build virtual environment, installs pinned build dependencies, downloads and verifies the pinned LGPL FFmpeg build, runs PyInstaller, executes a packaged runtime self-check, and creates:

- `dist/EmmaVideoTranscriber/EmmaVideoTranscriber.exe`
- `dist/EmmaVideoTranscriber-portable.zip`

The owner/end user does not run this script. The intended release flow is to download the portable ZIP built by GitHub Actions, extract it, and run `EmmaVideoTranscriber.exe`.

## Runtime layout

Writable state never belongs in the repository or beside source media. By default it is stored under:

`%LOCALAPPDATA%\EmmaKwon\EmmaVideoTranscriber\`

Subdirectories include model cache, Hugging Face cache, NVIDIA runtime, bounded temporary audio, and logs. QA can override the root with `EMMA_VIDEO_TRANSCRIBER_DATA_DIR`.

## FFmpeg

`build/provision_ffmpeg.py` downloads a pinned BtbN Windows x64 LGPL FFmpeg release, verifies the archive against the SHA256 file from the same immutable GitHub release tag, and copies only `ffmpeg.exe`, `ffprobe.exe`, build metadata, and license material into `runtime/ffmpeg`. PyInstaller bundles this runtime into the portable directory. No end-user FFmpeg installation or PATH editing is required.

## Whisper model

The model is not bundled. `ModelManager` downloads the managed `turbo` CTranslate2 model once into the application-data model directory and reuses it. Its callback state is deliberately UI-neutral: `missing`, `downloading` with progress, `ready`, or `failure`.

## NVIDIA GPU runtime

An NVIDIA display driver alone is not considered a complete CUDA runtime. `infra.gpu_runtime` separately detects the driver and the application-owned CUDA runtime. When requested, it downloads pinned official NVIDIA PyPI Windows wheels for CUDA runtime, cuBLAS, and cuDNN 9, verifies SHA256, extracts runtime DLLs into the application-data GPU directory, and activates that directory for the process.

The GPU payload is intentionally not in the portable ZIP because cuBLAS + cuDNN alone are well over 1 GB. If download, DLL loading, driver compatibility, or CTranslate2 CUDA validation fails, integration code must use CPU mode. The helper reports failure without disabling the application.

GitHub-hosted Windows runners do not have the target RTX GPU; CI only proves packaging and CPU-safe startup/runtime discovery. It must not be interpreted as a CUDA execution pass.

## Integration contract

At startup, integration may call:

- `configure_runtime_environment()`
- `locate_ffmpeg()` / `activate_ffmpeg_path()`
- `ModelManager().state()` / `ensure_model(progress=...)`
- `gpu_runtime_state()` / `ensure_gpu_runtime(progress=...)`
- `select_compute_backend(provision=...)`
- `job_temp_dir(job_id)`

The preferred final application callable is `emma_video_transcriber.app.main()`. `build/entrypoint.py` also accepts documented fallback UI main modules to avoid forcing another lane to edit packaging files.
