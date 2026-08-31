# EMMA VIDEO TRANSCRIBER — SOURCE REVIEW HANDOFF

Repository: k-mama/emmakwon

Authoritative source branch under review:
fix/transcriber-p0-native-isolation-multiselect-v1

Exact application source SHA:
65e2f21532cd4f33b9c6b5b3aa7f254cb5695984

PR:
#15 — OPEN, NOT MERGED

## Product goal

A beginner-safe Windows desktop app that turns long videos into clean TXT locally with a durable queue, crash recovery, bundled FFmpeg, managed Whisper model, and optional NVIDIA GPU acceleration.

## User-visible defects that triggered this revision

1. Queue text density was too large and too few rows were visible.
2. Queue remove X was on the far right; it should be before the row text.
3. Current Job progress percent was hard to see unless the window was maximized.
4. The UI could disappear during transcription.
5. Relaunch could then report that EmmaVideoTranscriber already existed, leaving the user unable to continue.

## Confirmed findings

### Confirmed lockout mechanism

The isolated transcription worker is launched from the packaged EmmaVideoTranscriber.exe itself using --job-worker. Therefore the worker has the same executable name as the UI process.

The previous single-instance fallback enumerated every live process named EmmaVideoTranscriber.exe. If the UI process died but its worker survived, the next launch could create a fresh UI mutex and then mistake the orphan worker for another application instance and refuse startup.

### Confirmed lifetime-containment defect

The first isolated-worker implementation did not bind the child worker lifetime to the UI process lifetime. A UI-process death could therefore leave a transcription worker alive.

This revision uses a Windows Job Object with JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE so the operating system terminates the worker when the UI process disappears.

### Confirmed strict-isolation leak

Although Whisper/CTranslate2 inference had moved to the child worker, the parent Qt process still called configure_runtime_environment(), which probed NVIDIA state and could load nvcuda.dll as a side effect. The parent process therefore was not truly GPU-native-free.

This revision adds probe_gpu=False and uses it in the packaged launcher, isolated UI controller, and QThread coordinator. NVIDIA/CUDA probing and runtime activation now belong to the child worker only.

## Current relaunch behavior

- If a real existing EMMA VIDEO TRANSCRIBER window is minimized/hidden, a second launch restores and foregrounds that window.
- If no UI mutex/window exists but stale same-name background processes remain, startup treats them as stale/headless workers, terminates them before opening the durable SQLite/output state, and continues.
- Current workers are parent-bound, so new orphan workers should not survive a UI death.

## Current UI changes

- Queue path text reduced to 11 px-equivalent Qt styling.
- Output/status/meta typography reduced further.
- Queue row minimum height reduced from 112 to 76.
- Remove X moved to the left edge before number badge and filename.
- Queue spacing/margins reduced.
- Active Current Job panel minimum width reduced and percent given a dedicated minimum width/alignment.
- Normal application minimum window reduced to 860 x 620 with more compact page/card spacing.
- Queue/current-job split adjusted to 68/32.

## Windows CI evidence for exact SHA

Run: Windows Transcriber Build #33
Run ID: 33358220616
Result: PASS

PASS stages:
- checkout
- Python 3.11
- packaging dependencies
- pinned FFmpeg
- compile integrated sources
- import integrated application
- component and adversarial tests
- portable PyInstaller build
- packaged runtime self-check
- packaged isolated-worker self-check
- artifact upload

Artifact digest reported by GitHub:
sha256:a84e2929320a64f84aa29f53cf454f81fa17a727282b84ebfddc181886ce9483

The outer GitHub artifact contains EmmaVideoTranscriber-portable.zip. The direct portable ZIP extracted for user delivery has a separate SHA256 and is not represented by the outer artifact digest.

## Tests added in this revision

- Windows Job Object test verifies that closing the parent lifetime Job Object kills a child process.
- UI GPU isolation test verifies probe_gpu=False does not call the NVIDIA probe or GPU activation path.

## Root-cause status for the UI disappearance

Do not overclaim.

CONFIRMED:
- stale/orphan worker could cause the relaunch lockout.
- child worker was not tied to UI lifetime.
- parent Qt process still touched NVIDIA driver/runtime probing despite intended process isolation.

NOT YET CONFIRMED:
- the exact lowest-level faulting DLL/exception that caused the latest UI-process disappearance.

The app already enables per-user Windows Error Reporting LocalDumps and records recent Application Error Event ID 1000 evidence. This revision also adds a low-frequency UI heartbeat and records unclean previous UI sessions, so a recurrence should distinguish a true parent-process crash from a window-hide/minimize case and preserve fault evidence.

## Review expectations for other Dream Team rooms

Reviewers should classify each finding as CONFIRMED, STRONG HYPOTHESIS, or NOT TESTED.

For every proposed change provide:
- severity P0/P1/P2/P3
- exact file/function
- evidence
- failure mode
- minimal reversible fix
- regression risk
- concrete test plan

Do not redesign merely for taste. Do not merge PR #15. Do not rewrite the application wholesale. Preserve durable SQLite/checkpoint/output invariants and never touch user source videos.
