# EMMA VIDEO TRANSCRIBER — V0.1 PARALLEL DEVELOPMENT CONTRACT

## Mission
Build the fastest practical Windows desktop app for extracting plain-text transcripts from very long local video files. Target user hardware: Windows 11, Intel Core i9-13900H, 64 GB RAM, NVIDIA RTX 4070 Laptop GPU 8 GB.

## Product laws
1. Local-first. Never upload the original video.
2. Plain TXT is the primary output.
3. Multiple videos can be queued and processed sequentially.
4. Output names are short and obvious: T001.txt, T002.txt, ...
5. Original media is read-only and never modified.
6. Long jobs must survive app close/restart through checkpoints.
7. GPU acceleration is automatic when usable; CPU fallback must exist.
8. The UI hides CUDA, compute type, batch size, codecs, and other expert settings by default.
9. Do not create one giant WAV for a 10–20 hour source. Use bounded temporary chunks or streaming and delete temporary audio promptly.
10. No paid API is required for V0.1.

## Locked technical direction
- Python 3.11+
- PySide6 desktop UI
- faster-whisper / CTranslate2 for speech recognition
- NVIDIA CUDA path preferred on the target PC
- FFmpeg/ffprobe for media probing and bounded audio extraction
- SQLite via Python stdlib sqlite3 for queue/checkpoints
- PyInstaller packaging for the first portable Windows build
- Whisper multilingual turbo-class model as the normal fast default, with engine-level fallback if VRAM is insufficient
- VAD enabled where practical to skip silence

## Shared source root
`windows-transcriber/src/emma_video_transcriber/`

## Shared interfaces
`contracts.py` is owned by the integration room. Worker lanes must consume it and must not redesign or edit it unless they report an integration blocker.

## Lane ownership
- ENGINE: `src/emma_video_transcriber/engine/**`
- MEDIA: `src/emma_video_transcriber/media/**`
- QUEUE/RECOVERY: `src/emma_video_transcriber/jobs/**` and `src/emma_video_transcriber/output/**`
- UI: `src/emma_video_transcriber/ui/**`
- PACKAGING: `src/emma_video_transcriber/infra/**`, `build/**`, dependency/build files, Windows workflow files
- QA/PERF: `tests/**`, `tools/**`, QA reports only
- INTEGRATION: `contracts.py`, package entrypoint, composition/wiring, final merge, release decision

## V0.1 golden path
1. Add one or many local video files.
2. App assigns T001.txt, T002.txt, ... and displays source-to-output mapping.
3. Press one large Start button.
4. Probe media without copying the original.
5. Read/extract bounded audio chunks.
6. Transcribe with RTX GPU automatically when available.
7. Append text to TXT after every completed chunk.
8. Persist checkpoint after the text has been flushed safely.
9. Delete temporary audio chunk.
10. Continue to next source automatically.
11. If interrupted, reopen and continue from the last committed checkpoint instead of starting from zero.

## V0.1 non-goals
No SRT, translation, metadata generation, video compression, editor timeline, cloud upload, social publishing, diarization UI, or elaborate settings. First make long-video TXT extraction fast and reliable.

## Integration rules
- Do not edit files owned by another lane.
- Do not edit the website outside `windows-transcriber/`.
- Add focused tests for your lane where feasible.
- Commit all work to your assigned branch.
- Final handoff must report: commit SHA, changed files, tests run/results, known blockers, exact callable interfaces, and any runtime dependency the packaging lane must know about.
- Prefer a small production-ready implementation over architectural expansion.
