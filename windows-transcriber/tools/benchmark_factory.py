from __future__ import annotations


def create_default_components():
    """Build the integrated production media+engine pair for target-PC benchmarking."""
    from emma_video_transcriber.engine import FasterWhisperTranscriptionEngine
    from emma_video_transcriber.media import FFmpegMediaPipeline

    try:
        from emma_video_transcriber.infra import configure_runtime_environment
    except ImportError:
        return FFmpegMediaPipeline(), FasterWhisperTranscriptionEngine()

    runtime = configure_runtime_environment()
    media = FFmpegMediaPipeline(
        ffmpeg_path=str(runtime.ffmpeg.ffmpeg),
        ffprobe_path=str(runtime.ffmpeg.ffprobe),
    )
    return media, FasterWhisperTranscriptionEngine()
