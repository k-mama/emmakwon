# EMMA VIDEO TRANSCRIBER — QA REPORT

Branch: `parallel/win-transcriber-qa`  
Baseline: `004ec5e7d23b5e63030547d7f9f3ef873a2df7af`

## Current verdict

**RELEASE HOLD until integration and target-PC gates run.**

No production implementation file is modified by this lane. The QA branch intentionally started from the shared baseline, so tests that import ENGINE/MEDIA/QUEUE/UI production classes remain skipped until those worker branches are integrated by the integration room. A skip is never counted as a release pass.

Local QA-branch discovery run:

- 35 tests discovered
- 13 PASS
- 22 SKIP because production lanes or opt-in real fixtures are not present on the isolated QA branch
- 0 FAIL

The 13 always-runnable tests cover immutable contracts, Unicode/path handling, 20-hour virtual chunk boundaries, resume boundaries, source-integrity oracle behavior, and power-loss recovery ordering oracles.

## Read-only red-team review of completed worker branches

The worker branches were inspected without modifying or merging them.

- MEDIA uses bounded 16 kHz mono WAV extraction, absolute chunk timestamps, and explicit missing-FFmpeg/ffprobe errors. It does not create a full-duration WAV.
- QUEUE uses the required durable order: append journal -> TXT append/fsync -> checkpoint store update -> clear journal. Recovery truncates an uncommitted append to its safe byte offset. Output reservation uses atomic exclusive file creation, so an existing `T001.txt` is skipped instead of overwritten.
- ENGINE contains automatic CUDA selection, CPU fallback, GPU-initialization fallback, lower-memory retry after CUDA OOM, and CPU fallback after persistent CUDA failure. Model loading is local-only.
- UI defines a Qt signal boundary so long work stays out of widget calls, and running-close UX offers keep-running, safe pause-and-close, or cancel.
- PACKAGING builds a portable EXE/ZIP, bundles verified FFmpeg, keeps writable state under application data, and correctly states that CI cannot prove RTX CUDA execution.

These are strong source-level signals, not substitutes for an integrated Windows execution pass.

## Adversarial test matrix

| # | Risk | Automated coverage | Release gate |
|---|---|---|---|
| 1 | one short video | generated media + runtime media/engine contract | PASS required after integration |
| 2 | multiple queued videos | direct QueueRunner sequential test | PASS required after integration |
| 3 | Unicode/Korean filenames | contract, media, store/queue tests | PASS required |
| 4 | spaces/punctuation paths | contract + generated FFmpeg fixture | PASS required |
| 5 | no audio | direct media + queue failure tests | explicit safe failure required |
| 6 | corrupted source | direct media probe test | explicit safe failure required |
| 7 | missing FFmpeg | direct missing-ffprobe fault test + packaging self-check | clear actionable error required |
| 8 | model unavailable | direct engine ModelSelectionError test | explicit safe failure required |
| 9 | GPU unavailable -> CPU | direct fake-runtime engine test + target forced CPU | PASS required |
| 10 | GPU init failure | direct fake-runtime engine test | CPU fallback required |
| 11 | temporary CUDA OOM | direct fake-runtime engine test | lower-memory retry/CPU fallback; no lost segment |
| 12 | interruption during chunk | recovery oracle + direct QueueRunner simulated process loss | replay only uncommitted chunk |
| 13 | interruption after TXT flush | recovery oracle + direct QueueRunner checkpoint-crash test | journal repair; no duplicate text |
| 14 | restart/resume | recovery oracle + direct QueueRunner restart test | resume from committed checkpoint |
| 15 | no duplicate after recovery | oracle + QueueRunner exact output assertion | exact-once committed text |
| 16 | no committed transcript loss | oracle + QueueRunner committed-prefix assertion | committed prefix survives |
| 17 | T001/T002 collision | direct SqliteJobStore/output reservation test | never overwrite existing output |
| 18 | output folder/write unavailable | direct writer permission fault injection | fail without checkpoint advance |
| 19 | low disk | direct ENOSPC writer fault injection | fail without checkpoint advance/source mutation |
| 20 | source removed mid-job | direct QueueRunner fault injection | committed prefix retained; current job safely fails |
| 21 | app close while running | source review + integrated Windows manual gate | responsive safe close/resume required |
| 22 | source never modified | hash/stat tests + benchmark SHA-256 | zero mutation |

## Release gates

A V0.1 release is PASS only when all are true:

- portable app builds, self-checks, and launches on the target Windows 11 machine;
- all non-optional QA tests run after integration without unexplained skips;
- one short fixture and at least three queued files complete sequentially;
- TXT is durably appended after each completed chunk;
- checkpoint is persisted only after durable TXT state;
- crash/restart tests show no duplicate committed text and no loss of committed text;
- `T001.txt`, `T002.txt`, ... allocation never overwrites a pre-existing unrelated output;
- permission failure, ENOSPC, corrupted input, no-audio input, and source removal fail safely;
- source SHA-256 is unchanged before/after representative successes and failures;
- RTX 4070 Laptop GPU path is actually selected by the engine on target hardware;
- forced GPU-unavailable, GPU-init-failure, and OOM cases reach the intended fallback without corrupting output/checkpoints;
- UI remains responsive while a long job runs and safe pause/close/restart works;
- temporary audio remains bounded and cleaned; no full-duration WAV is created;
- real target-PC benchmark JSON is recorded. No synthetic performance claim counts.

## P0 / P1 risks still open at QA-lane handoff

**P0 verification gate — the integration branch is still at the shared baseline.** Direct tests for the production MEDIA/ENGINE/QUEUE/UI implementations cannot become release evidence until the integration room composes those branches and runs this suite. This is a release blocker, not a discovered implementation defect.

**P0 target-hardware gate — CUDA selection and real throughput are unmeasured.** The engine source contains fallback logic, but no RTX 4070 Laptop execution or x-realtime number is claimed here.

**P0 integration risk — managed model path must be proven end to end while offline.** PACKAGING downloads the managed model into the application-owned `models` directory, while the current ENGINE runtime requests a named model with `local_files_only=True`. The integration room must prove that the downloaded model is exactly the model the engine opens with networking unavailable. If that path is not explicitly wired, first-run preparation could report success while transcription still cannot load the model.

**P1 — UI responsiveness and close-while-running require a real PySide6/Windows run.** Source structure is appropriate, but only target execution can close this gate.

**P1 — real filesystem ENOSPC/permission behavior should be sampled on Windows in addition to injected writer failures.** The injected tests prove checkpoint behavior at the runner boundary; they do not reproduce every NTFS/antivirus/network-folder failure mode.

**P1 — long-run thermal/memory behavior is unknown until the 60+ minute target benchmark.**

## Automated test command

```text
cd windows-transcriber
python -m unittest discover -s tests -p "test_*.py" -v
```

On the final Windows integration build, use `.\.build-venv\Scripts\python.exe` as documented in `PERFORMANCE_TEST_PLAN.md`. Any required integration test skip is a release HOLD.
