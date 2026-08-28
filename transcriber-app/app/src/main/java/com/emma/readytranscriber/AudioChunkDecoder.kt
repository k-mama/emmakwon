package com.emma.readytranscriber

import android.content.Context
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.nio.ByteOrder

object AudioChunkDecoder {
    private const val TARGET_RATE = 16_000
    private const val CHUNK_SECONDS = 300
    private const val CHUNK_MS = CHUNK_SECONDS * 1000L

    data class Chunk(val file: File, val startMs: Long, val endMs: Long)

    suspend fun process(
        context: Context,
        uri: Uri,
        startMs: Long = 0L,
        onDecodeProgress: (Int) -> Unit,
        onChunk: suspend (Chunk) -> Unit
    ) = withContext(Dispatchers.IO) {
        val requestedStartMs = startMs.coerceAtLeast(0L)
        val requestedStartUs = requestedStartMs * 1000L

        val extractor = MediaExtractor()
        extractor.setDataSource(context, uri, null)

        var audioTrack = -1
        var inputFormat: MediaFormat? = null
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME).orEmpty()
            if (mime.startsWith("audio/")) {
                audioTrack = i
                inputFormat = format
                break
            }
        }
        require(audioTrack >= 0 && inputFormat != null) { "이 파일에서 오디오 트랙을 찾지 못했습니다." }

        extractor.selectTrack(audioTrack)
        if (requestedStartUs > 0L) {
            extractor.seekTo(requestedStartUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
        }

        val format = inputFormat!!
        val mime = format.getString(MediaFormat.KEY_MIME) ?: error("오디오 형식을 확인할 수 없습니다.")
        val durationUs = if (format.containsKey(MediaFormat.KEY_DURATION)) format.getLong(MediaFormat.KEY_DURATION) else -1L

        if (android.os.Build.VERSION.SDK_INT >= 24) {
            runCatching { format.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_16BIT) }
        }

        val decoder = MediaCodec.createDecoderByType(mime)
        decoder.configure(format, null, null, 0)
        decoder.start()

        val info = MediaCodec.BufferInfo()
        var inputDone = false
        var outputDone = false
        var sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        var phase = 0L

        val chunkDir = File(context.cacheDir, "emma_transcriber_chunks").apply { mkdirs() }
        chunkDir.listFiles()?.forEach { it.delete() }

        val targetChunkSamples = TARGET_RATE.toLong() * CHUNK_SECONDS
        var totalTargetSamples = 0L
        var chunkStartSample = 0L
        var chunkIndex = (requestedStartMs / CHUNK_MS).toInt()
        var writer = newWriter(chunkDir, chunkIndex)

        try {
            while (!outputDone) {
                if (!inputDone) {
                    val inputIndex = decoder.dequeueInputBuffer(10_000)
                    if (inputIndex >= 0) {
                        val inputBuffer = decoder.getInputBuffer(inputIndex)!!
                        val size = extractor.readSampleData(inputBuffer, 0)
                        if (size < 0) {
                            decoder.queueInputBuffer(
                                inputIndex,
                                0,
                                0,
                                0,
                                MediaCodec.BUFFER_FLAG_END_OF_STREAM
                            )
                            inputDone = true
                        } else {
                            val pts = extractor.sampleTime
                            decoder.queueInputBuffer(inputIndex, 0, size, pts, 0)
                            extractor.advance()
                            if (durationUs > 0 && pts >= 0) {
                                onDecodeProgress(((pts * 100L / durationUs).toInt()).coerceIn(0, 99))
                            }
                        }
                    }
                }

                val outputIndex = decoder.dequeueOutputBuffer(info, 10_000)
                when {
                    outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                        val out = decoder.outputFormat
                        sampleRate = out.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                        channels = out.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                    }

                    outputIndex >= 0 -> {
                        val completed = mutableListOf<Chunk>()
                        val shouldKeepBuffer = requestedStartUs <= 0L || info.presentationTimeUs >= requestedStartUs
                        val outputBuffer = decoder.getOutputBuffer(outputIndex)

                        if (shouldKeepBuffer && outputBuffer != null && info.size > 0) {
                            outputBuffer.position(info.offset)
                            outputBuffer.limit(info.offset + info.size)
                            outputBuffer.order(ByteOrder.LITTLE_ENDIAN)

                            val shorts = outputBuffer.asShortBuffer()
                            val frames = shorts.remaining() / channels.coerceAtLeast(1)
                            val emitted = ShortArray(
                                ((frames.toLong() * TARGET_RATE / sampleRate) + 4)
                                    .toInt()
                                    .coerceAtLeast(4)
                            )
                            var emittedCount = 0

                            for (frame in 0 until frames) {
                                var sum = 0
                                for (c in 0 until channels) {
                                    if (shorts.hasRemaining()) sum += shorts.get().toInt()
                                }
                                val mono = (sum / channels.coerceAtLeast(1))
                                    .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
                                    .toShort()
                                phase += TARGET_RATE.toLong()
                                while (phase >= sampleRate.toLong()) {
                                    if (emittedCount >= emitted.size) break
                                    emitted[emittedCount++] = mono
                                    phase -= sampleRate.toLong()
                                }
                            }

                            var offset = 0
                            while (offset < emittedCount) {
                                val leftInChunk = (targetChunkSamples - writer.sampleCount).toInt()
                                val count = minOf(leftInChunk, emittedCount - offset)
                                writer.writeSamples(emitted, offset, count)
                                totalTargetSamples += count
                                offset += count

                                if (writer.sampleCount >= targetChunkSamples) {
                                    writer.closeAndFinalize()
                                    val startAbsMs = requestedStartMs + chunkStartSample * 1000L / TARGET_RATE
                                    val endAbsMs = requestedStartMs + totalTargetSamples * 1000L / TARGET_RATE
                                    completed += Chunk(writer.file, startAbsMs, endAbsMs)
                                    chunkStartSample = totalTargetSamples
                                    chunkIndex += 1
                                    writer = newWriter(chunkDir, chunkIndex)
                                }
                            }
                        }

                        decoder.releaseOutputBuffer(outputIndex, false)
                        completed.forEach { onChunk(it) }

                        if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                            outputDone = true
                        }
                    }
                }
            }

            if (writer.sampleCount > 0) {
                writer.closeAndFinalize()
                val startAbsMs = requestedStartMs + chunkStartSample * 1000L / TARGET_RATE
                val endAbsMs = requestedStartMs + totalTargetSamples * 1000L / TARGET_RATE
                onChunk(Chunk(writer.file, startAbsMs, endAbsMs))
            } else {
                runCatching { writer.file.delete() }
            }
            onDecodeProgress(100)
        } finally {
            runCatching { decoder.stop() }
            runCatching { decoder.release() }
            runCatching { extractor.release() }
        }
    }

    private fun newWriter(dir: File, index: Int): WavChunkWriter {
        val file = File(dir, "chunk_${index.toString().padStart(4, '0')}.wav")
        return WavChunkWriter(file, TARGET_RATE, 1)
    }
}
