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

- engine-selected device when exposed by the implementation;
- engine model / compute type when exposed;
- NVIDIA inventory from `nvidia-smi` when available;
- processed input audio duration;
- wall-clock transcription duration;
- `x_realtime = input_audio_seconds / wall_clock_seconds`;
- realtime factor;
- peak process working set where practical;
- segment count and character count;
- chunk count;
- source size and source metadata unchanged check.

The tool does not invent missing device/model fields and does not substitute CI timing for target-PC timing.

## Exact target-PC steps

1. Install/run the integrated portable build dependencies exactly as the packaging lane specifies.
2. Open Command Prompt in `windows-transcriber`.
3. Generate tiny failure fixtures: `python tools\generate_media_fixtures.py --out qa-fixtures`
4. Run the full automated suite: `python -m unittest discover -s tests -p "test_*.py" -v`
5. Configure the component factory used by the integrated build. The factory must return `(media_pipeline, engine)`, a dict with `media`/`engine`, or an object exposing `.media` and `.engine`.
6. Run a real spoken-video benchmark: `python tools\benchmark_transcriber.py --factory PACKAGE.MODULE:FACTORY --source "C:\QA Media\speech 20 minutes.mp4" --json-out benchmark-20m.json`
7. Confirm the JSON reports the intended GPU-selected device from the engine diagnostics. `nvidia_inventory` alone proves only GPU presence, not selection.
8. Repeat with a 60+ minute source and save a second JSON.
9. Force the engine's supported CPU mode/fallback path and rerun the short source. Record the result separately; do not compare it as a release-speed target.
10. During a long run, use Task Manager to confirm the UI stays responsive and that disk usage does not grow as though a full-duration WAV is being created.
11. Hash the original source before/after representative success and failure runs if the integration test harness does not already do so.
12. Record actual results in the integration/release handoff. If any required field cannot be observed, mark it `UNKNOWN`, not PASS.

## Performance release criteria

- GPU is actually selected on the target RTX machine for the normal path.
- CPU fallback completes a representative short transcription without corrupting output/checkpoints.
- No unbounded memory growth is observed over a 60+ minute run.
- Temporary audio stays bounded to the configured chunk strategy.
- Throughput numbers are reported as measurements only. V0.1 has no fabricated minimum x-realtime claim until target measurements establish a baseline.
- Any regression threshold should be set only after at least three repeat target-PC runs establish normal variance.

## Long-video correctness strategy

A literal 20-hour media fixture is unnecessary in Git. `tests/test_long_duration_logic.py` models a 20-hour source as 120 bounded ten-minute windows and checks exact resume boundaries. Real media integration is then tested with small FFmpeg-generated files plus representative local long files on the target PC.
