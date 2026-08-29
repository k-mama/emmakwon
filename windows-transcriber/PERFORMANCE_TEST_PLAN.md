# EMMA VIDEO TRANSCRIBER — PERFORMANCE TEST PLAN

Performance is measured on the real target PC. CI and synthetic duration loops are for correctness, not speed claims.

Target: Windows 11, Intel Core i9-13900H, 64 GB RAM, NVIDIA RTX 4070 Laptop GPU 8 GB.

## Benchmark inputs

Use at least:

- one ~20 minute spoken video representative of normal work;
- one 60+ minute spoken video if available;
- one long mixed-content video with silence/music/speech;
- Unicode and space-containing source paths.

Do not commit huge fixtures. Keep benchmark source files local.

## Metrics

`tools/benchmark_transcriber.py` records actual:

- engine-selected device from production `get_diagnostics()` when available;
- engine model, compute type, GPU name, and fallback reason when exposed;
- NVIDIA inventory from `nvidia-smi` when available;
- processed input audio duration;
- wall-clock transcription duration;
- `x_realtime = input_audio_seconds / wall_clock_seconds`;
- realtime factor;
- peak process working set where practical;
- segment count and character count;
- chunk count;
- source size/mtime unchanged and SHA-256 unchanged by default;
- Python and platform information.

Every temporary audio chunk is deleted immediately after its transcription attempt. The tool does not invent missing device/model fields and does not substitute CI timing for target-PC timing.

## Exact target-PC steps

These steps are for QA on the integrated branch, not for the non-technical end user.

1. On the integration branch, make sure ENGINE, MEDIA, QUEUE, UI, PACKAGING, and this QA lane have been integrated. Do not benchmark a single worker branch.
2. From `windows-transcriber`, build the Windows portable package:
   `powershell -ExecutionPolicy Bypass -File .\build\build_windows.ps1`
3. Confirm the packaging self-check succeeds and these artifacts exist:
   `dist\EmmaVideoTranscriber\EmmaVideoTranscriber.exe` and `dist\EmmaVideoTranscriber-portable.zip`.
4. Launch `EmmaVideoTranscriber.exe` once and allow the normal first-use model/GPU-runtime preparation to finish. Close it cleanly. This prepares the same application-owned caches used by the source benchmark.
5. Generate tiny failure fixtures with the build environment:
   `.\.build-venv\Scripts\python.exe tools\generate_media_fixtures.py --out qa-fixtures`
6. Run the complete QA suite:
   `.\.build-venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v`
   Any required integration test skip is a release HOLD, not a pass.
7. Put a representative spoken video at a stable local path such as:
   `C:\QA Media\speech 20 minutes.mp4`
8. Run the real benchmark using the production media and engine classes plus packaged runtime paths:
   `.\.build-venv\Scripts\python.exe tools\benchmark_transcriber.py --source "C:\QA Media\speech 20 minutes.mp4" --json-out benchmark-20m.json`
9. Open `benchmark-20m.json`. Require `engine.selected_device` (or the preserved production `chosen_device`) to report `cuda` on the normal target-PC path. `nvidia_inventory` alone proves only that a GPU exists; it does not prove CTranslate2 selected it.
10. Confirm `engine.model`, compute type, input duration, wall time, `x_realtime`, peak working set, segment count, character count, and `source_unchanged: true` are present. If source hashing was deliberately skipped for an extremely large file, run at least one representative benchmark without `--skip-source-hash` before release.
11. Repeat the benchmark at least three times on the same 20-minute source after a warm-up run. Keep all JSON files so normal variance can be seen instead of reporting a cherry-picked number.
12. Repeat with a 60+ minute source:
   `.\.build-venv\Scripts\python.exe tools\benchmark_transcriber.py --source "C:\QA Media\speech 60 minutes.mp4" --json-out benchmark-60m.json`
13. Exercise the product-supported forced CPU/fallback path and rerun the short source. Save it separately as `benchmark-20m-cpu.json`. CPU is a reliability gate, not the target speed baseline.
14. While the 60+ minute job runs in the real GUI, minimize/restore the app, move other windows, and use other applications. The UI must continue repainting and accepting input. Task Manager must not show unbounded process-memory growth.
15. During that long run, watch the application temp directory under `%LOCALAPPDATA%\EmmaKwon\EmmaVideoTranscriber\`. It must behave like bounded chunk storage, not like a growing full-duration WAV.
16. Run at least one close/restart test during a long source: choose `Pause and close`, relaunch, resume, and compare the final TXT against an uninterrupted run for missing or duplicated committed text.
17. Record actual measurements and PASS/FAIL results in the integration/release handoff. Any field that cannot be observed is `UNKNOWN`, not PASS.

## Performance release criteria

- GPU is actually selected on the target RTX machine for the normal path.
- CPU fallback completes a representative short transcription without corrupting output/checkpoints.
- No unbounded memory growth is observed over a 60+ minute run.
- Temporary audio stays bounded to the configured chunk strategy and is promptly cleaned.
- Source bytes remain unchanged in representative success and failure runs.
- UI remains responsive during real long-running transcription and safe close/resume works.
- Throughput numbers are reported as measurements only. V0.1 has no fabricated minimum x-realtime claim until target measurements establish a baseline.
- Any regression threshold is set only after at least three repeat target-PC runs establish normal variance.

## Long-video correctness strategy

A literal 20-hour media fixture is unnecessary in Git. `tests/test_long_duration_logic.py` models a 20-hour source as 120 bounded ten-minute windows and checks exact resume boundaries. Real media integration is then tested with small FFmpeg-generated files plus representative local long files on the target PC.
