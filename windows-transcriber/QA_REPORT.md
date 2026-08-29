# EMMA VIDEO TRANSCRIBER — QA REPORT

Branch: `parallel/win-transcriber-qa`  
Baseline: `004ec5e7d23b5e63030547d7f9f3ef873a2df7af`

## Current verdict

**RELEASE HOLD until integration and target-PC gates run.**

This QA lane began from the locked shared contract before the production worker lanes were integrated. The committed automated suite therefore has two layers:

1. always-runnable contract/oracle tests for immutable data, 20-hour chunk math, recovery crash boundaries, and source-integrity checks;
2. opt-in runtime component tests that exercise the real media, engine, and store implementations through the locked protocols once integration supplies factories and fixtures.

Passing only the always-runnable tests is **not** a release pass.

## Adversarial test matrix

| # | Risk | Automated coverage | Release gate |
|---|---|---|---|
| 1 | one short video | runtime media/engine test + fixture tool | PASS required |
| 2 | multiple queued videos | integration runner gate | PASS required |
| 3 | Unicode/Korean filenames | contract + store roundtrip | PASS required |
| 4 | spaces/punctuation paths | contract + generated fixture | PASS required |
| 5 | no audio | runtime media test | explicit non-crash failure required |
| 6 | corrupted source | runtime media test | explicit non-crash failure required |
| 7 | missing FFmpeg | packaging/integration manual fault injection | clear actionable error required |
| 8 | model unavailable | engine fault injection | fallback/error must not corrupt job |
| 9 | GPU unavailable -> CPU | target-PC / forced CPU | PASS required |
| 10 | GPU init failure | engine fault injection | CPU fallback or safe job error |
| 11 | temporary CUDA OOM | engine fault injection | bounded retry/fallback; no duplicate TXT |
| 12 | interruption during chunk | recovery oracle + integration crash injection | replay only uncommitted chunk |
| 13 | interruption after TXT flush | recovery oracle + integration crash injection | no duplicated text |
| 14 | restart/resume | recovery oracle + integration runner | committed checkpoint resumes |
| 15 | no duplicate after recovery | recovery oracle | exact-once committed text |
| 16 | no committed transcript loss | recovery oracle | committed prefix survives |
| 17 | T001/T002 collision | integration queue gate | never overwrite existing output |
| 18 | output folder unavailable | integration fault injection | source untouched; clear error |
| 19 | low disk | target/integration fault injection | stop safely before corruption |
| 20 | source removed mid-job | integration fault injection | current job fails safely; queue policy explicit |
| 21 | app close while running | UI/integration manual gate | responsive close + recoverable state |
| 22 | source never modified | runtime hash/stat bracket + benchmark | zero mutation |

## Release gates

A V0.1 release is PASS only when all are true:

- portable app builds and launches on the target Windows 11 machine;
- one short fixture and at least three queued files complete sequentially;
- TXT is durably appended after each completed chunk;
- checkpoint is persisted only after durable TXT state;
- crash/restart tests show no duplicate committed text and no loss of committed text;
- `T001.txt`, `T002.txt`, ... allocation never overwrites a pre-existing unrelated output;
- source byte hash is unchanged before/after success and representative failures;
- RTX 4070 Laptop GPU path is actually selected on target hardware;
- forced GPU-unavailable and GPU-init-failure cases reach CPU or a safe explicit fallback path;
- UI remains responsive while a long job runs;
- temporary audio remains bounded; no full-duration WAV is created;
- real target-PC benchmark results are recorded. No synthetic performance claim counts.

## P0 / P1 risks still open at QA-lane handoff

**P0 — recovery ordering must be proven against the integrated queue implementation.** The contract requires TXT flush before checkpoint. The oracle tests define the expected durable behavior, but the queue lane is not present on this branch yet.

**P0 — GPU fallback must be proven with the real engine.** No performance or fallback number is claimed by this report.

**P1 — disk-full/output-unavailable/source-removal behavior needs fault injection against integrated production code.**

**P1 — UI close-while-running and responsiveness require integrated PySide6 testing on Windows.**

**P1 — output naming collision policy must be verified against the queue allocator before release.**

## Automated test command

```text
cd windows-transcriber
python -m unittest discover -s tests -p "test_*.py" -v
```

Runtime component tests skip unless their environment variables are configured. A release run must treat those skips as unresolved, not as passes.
