from __future__ import annotations


def create_default_components():
    """Build the integrated production media+engine pair for target-PC benchmarking."""
    from emma_video_transcriber.engine import FasterWhisperTranscriptionEngine
    from emma_video_transcriber.media import FFmpegMediaPipeline

    return FFmpegMediaPipeline(), FasterWhisperTranscriptionEngine()
