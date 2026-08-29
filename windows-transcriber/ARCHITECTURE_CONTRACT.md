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
11. The primary source-input model is FULL LOCAL FILE PATH ENTRY, not uploading or copying a video into the app.
12. Adding an item only records the local source path and output mapping. It must not copy, import, upload, or pre-decode the source.
13. Primary output location is the current Windows user's Downloads folder, under `EmmaVideoTranscriber`, unless integration explicitly changes it later.

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

## Locked V0.1 source-entry UX
The user does not conceptually "put a video into" the program. The program receives a reference to a video that already exists on the PC or an attached drive.

Main input row:

`[ C:\path\to\video-file.mp4                                      ] [ + ]`

Behavior:
1. User pastes or types the COMPLETE local file path including the filename.
2. Pressing the `+` button validates the path and adds it as one queue item.
3. The text field clears so another source can be entered immediately.
4. Repeat for as many videos as desired.
5. Support paths pasted from Windows `Copy as path`; trim surrounding quotes and harmless whitespace automatically.
6. A Browse button/file picker may exist as an optional convenience, but manual/paste full-path entry is the primary V0.1 interaction and must not be removed.
7. Do not copy the source into application storage when an item is added.
8. If the same exact normalized path is already queued, warn or ignore the duplicate rather than silently adding it twice.
9. Before processing, missing/inaccessible paths must be shown clearly without destroying the rest of the queue.

Queue example:

`1. D:\VIDEO\lecture01.mp4  →  T001.txt`
`2. E:\Archive\interview long.mp4  →  T002.txt`
`3. C:\Users\...\movie.mp4  →  T003.txt`

The full source path remains stored in the job record even if the visible UI shortens it for readability.

## Output location
Primary V0.1 output folder:

`%USERPROFILE%\Downloads\EmmaVideoTranscriber\`

Examples:

`%USERPROFILE%\Downloads\EmmaVideoTranscriber\T001.txt`
`%USERPROFILE%\Downloads\EmmaVideoTranscriber\T002.txt`

The app must show the mapping between the original source path/name and the short TXT filename. Never overwrite an existing TXT accidentally.

## V0.1 golden path
1. Paste/type a full local video path including filename into the long source field.
2. Press `+` to add that source as one queue item.
3. Repeat to build the desired queue.
4. App assigns T001.txt, T002.txt, ... and displays source-to-output mapping.
5. Press one large Start Transcription button.
6. Validate/probe each source without copying the original.
7. Read/extract bounded audio chunks.
8. Transcribe with RTX GPU automatically when available.
9. Append text to the assigned TXT in the Downloads output folder after every completed chunk.
10. Persist checkpoint after the text has been flushed safely.
11. Delete temporary audio chunk.
12. Continue to the next source automatically.
13. If interrupted, reopen and continue from the last committed checkpoint instead of starting from zero.

## V0.1 non-goals
No SRT, translation, metadata generation, video compression, editor timeline, cloud upload, social publishing, diarization UI, or elaborate settings. First make long-video TXT extraction fast and reliable.

## Integration rules
- Do not edit files owned by another lane.
- Do not edit the website outside `windows-transcriber/`.
- Add focused tests for your lane where feasible.
- Commit all work to your assigned branch.
- Final handoff must report: commit SHA, changed files, tests run/results, known blockers, exact callable interfaces, and any runtime dependency the packaging lane must know about.
- Prefer a small production-ready implementation over architectural expansion.
