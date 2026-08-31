# EMMA VIDEO TRANSCRIBER — SOURCE REVIEW HANDOFF

Product: EMMA VIDEO TRANSCRIBER
Repository: k-mama/emmakwon
Source branch under review: fix/transcriber-queue-removal-and-reliability-v1
Exact authoritative application source SHA: e2a925c650cf6d1cc9c9d5a885741feaa9441bd5
PR #14 merged: NO

## Purpose

Independent architecture, reliability, Windows packaging, GPU/CPU runtime, faster-whisper/CTranslate2, VAD, FFmpeg/media pipeline, queue/SQLite, crash recovery, performance, security, maintainability, and UX review.

## Known real-world incident

A historical real queue run completed jobs 1 through 5, then the application stopped making progress on job 6. The actual job 6 file was a real approximately 5.7-hour video and the durable database remained stuck at 6,600,000 ms. Old orphan WAV chunks were also found after that incident.

Do NOT describe the historical root cause as confirmed. The strongest current hypothesis is cumulative same-process native-resource pressure/lifecycle behavior across sequential jobs, but W3 position-6 reproduction and a 10+ real-media soak were not executed in the final certification session.

## Current reliability mitigation in this source

- durable queue item removal and CLEAR QUEUE behavior
- active processing job protected from destructive removal
- runner safely skips a queued job removed before its turn
- explicit job-boundary engine reset after completed, failed, and paused jobs
- safer CUDA batch sequence 4, 2, 1 instead of 8, 4, 2
- bounded WAV cleanup moved to finally paths
- crash diagnostics and durable last-stage/session markers
- best-effort RSS and GPU VRAM diagnostics
- automated-test AppData isolation so tests do not write into the user's real diagnostics directory

## Real Windows evidence

W1 REAL PROBLEM FILE ALONE: PASS

- Same historical 5.7-hour problem file
- Real Windows 11 target machine
- NVIDIA GeForce RTX 4070 Laptop GPU, 8 GB VRAM
- CUDA selected
- float16 selected
- 34 chunks
- 100 percent completion
- wall time: 573.9 seconds
- successfully passed the former 6,600,000 ms crash/stall point
- output transcript produced
- source SHA256 remained unchanged
- GPU VRAM observed at about 2307 MB at completion and returned to 0 MiB after the job-boundary reset

## What remains NOT TESTED in that certification session

- W2 problem file at queue position 3
- W3 problem file at queue position 6
- W4 10+ real-media sequential soak
- W5 through W10 full real-EXE queue removal, crash/resume, and failure-containment acceptance matrix where not otherwise covered by automated tests

Therefore overall final certification was BLOCKED/INCOMPLETE, not FAIL. The W1 real-media result itself was PASS.

## Important architecture gap to review

Same-process native inference containment remains open. If CUDA/CTranslate2/ONNX/native code causes a fatal process crash, QueueRunner's Python Exception boundary cannot protect the Qt UI process. Review whether process-isolated inference should become the next reliability architecture after evidence warrants it:

Qt UI/controller process -> isolated transcription worker process -> durable SQLite/checkpoint boundary.

Do not assume a full rewrite is desirable. Preserve strong existing properties wherever possible.

## Review instructions

Please inspect the actual source before recommending changes. Distinguish:

1. structures to KEEP
2. structures that are RISKY
3. structures to CHANGE
4. improvements to HOLD until evidence justifies them

For every recommendation provide concrete code/architecture evidence, regression risk, and validation method. Do not invent PASS results for tests that were not run.
