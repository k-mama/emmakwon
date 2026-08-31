# EMMA VIDEO TRANSCRIBER SOURCE REVIEW HANDOFF

Repository: k-mama/emmakwon

Review branch baseline: fix/transcriber-p0-native-isolation-multiselect-v1

Exact product source SHA: 109f835847b93dd38cc1e79ac6976f66b5615eff

Purpose: independent high-end review of the Windows transcriber after P0 reliability hardening.

## User-reported defects addressed

1. File selection required an unnecessary second `+` action and did not support practical multi-select queueing.
2. The app could appear to run briefly and then disappear during transcription.

## Current implementation

- Multi-select file picker adds one or many selected videos directly to Queue.
- Redundant `+` confirmation step removed.
- Native inference is isolated from the Qt GUI process by running each transcription job in a separate OS worker process.
- A native CUDA/CTranslate2/cuDNN worker failure can no longer directly kill the GUI process.
- Parent records worker exit code and preserves durable checkpoint state.
- One CPU retry is attempted after an unstructured/native worker exit.
- Windows single-instance protection blocks concurrent old/new app writers from sharing the same AppData queue/output state.
- Windows Error Reporting LocalDumps are enabled for app-specific crash dumps.
- Windows Application Error Event ID 1000 evidence is queried and recorded after native worker failure when available.

## Root-cause status

CONFIRMED structural defects:
- Native inference previously ran inside the GUI process, so a native access violation could terminate the whole application.
- There was no robust single-instance gate, allowing old and new executables to potentially access the same durable queue/output area concurrently.

NOT YET CONFIRMED:
- The exact lowest-level DLL / exception code responsible for the user's newest disappearance. The new build is designed to preserve minidump + Event ID 1000 evidence on the next native failure instead of guessing.

## Historical real-media evidence

- Real RTX 4070 Laptop GPU available on target Windows machine.
- Historical failure: a roughly 5.7-hour real video was stuck at about 6,600,000 ms when it was queue item 6.
- The same problem video later completed as a sole W1 job on the previous hardened build: 34 chunks, 100% completion, CUDA float16, and passed the former crash point.

## CI evidence at this SHA

Windows GitHub Actions run 33353746539: PASS.

- source compile PASS
- isolated app import PASS
- engine tests 16 PASS
- media tests 10 PASS
- main test suite 63 total, 5 environment-gated skips, 0 failures
- isolated worker boundary tests PASS
- PyInstaller portable build PASS
- packaged runtime self-check PASS
- packaged isolated-worker self-check PASS

Important: GitHub-hosted Windows runner does not prove target RTX/CUDA execution.

## Review expectations

Treat the source as an immutable evidence baseline. Do not merge or rewrite blindly.

For every finding, classify:
- CONFIRMED
- STRONG HYPOTHESIS
- NOT TESTED

Use severity P0 / P1 / P2 / P3 and provide:
- exact file/function
- evidence
- failure mode
- minimal reversible fix
- regression risk
- validation test

Challenge the current architecture where justified, especially:
- Windows native crash containment
- worker process lifecycle and cleanup
- CUDA/CTranslate2 model lifecycle
- SQLite/checkpoint correctness under abnormal termination
- concurrent instance safety
- FFmpeg/temp-file lifecycle
- packaging/runtime DLL discovery
- long unattended multi-job execution
- diagnostics/minidump usability
- queue UX and multi-select behavior
