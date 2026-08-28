package com.emma.readytranscriber

import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

class WavChunkWriter(
    val file: File,
    private val sampleRate: Int = 16_000,
    private val channels: Int = 1
) {
    private val output = BufferedOutputStream(FileOutputStream(file))
    var sampleCount: Long = 0
        private set

    init {
        output.write(ByteArray(44))
    }

    fun writeSamples(samples: ShortArray, offset: Int = 0, count: Int = samples.size) {
        if (count <= 0) return
        val bytes = ByteBuffer.allocate(count * 2).order(ByteOrder.LITTLE_ENDIAN)
        for (i in offset until offset + count) bytes.putShort(samples[i])
        output.write(bytes.array())
        sampleCount += count
    }

    fun closeAndFinalize() {
        output.flush()
        output.close()

        val dataSize = sampleCount * channels * 2L
        val riffSize = 36L + dataSize
        RandomAccessFile(file, "rw").use { raf ->
            raf.seek(0)
            raf.writeBytes("RIFF")
            writeIntLE(raf, riffSize.toInt())
            raf.writeBytes("WAVE")
            raf.writeBytes("fmt ")
            writeIntLE(raf, 16)
            writeShortLE(raf, 1)
            writeShortLE(raf, channels)
            writeIntLE(raf, sampleRate)
            writeIntLE(raf, sampleRate * channels * 2)
            writeShortLE(raf, channels * 2)
            writeShortLE(raf, 16)
            raf.writeBytes("data")
            writeIntLE(raf, dataSize.toInt())
        }
    }

    private fun writeIntLE(raf: RandomAccessFile, value: Int) {
        raf.write(value and 0xFF)
        raf.write((value ushr 8) and 0xFF)
        raf.write((value ushr 16) and 0xFF)
        raf.write((value ushr 24) and 0xFF)
    }

    private fun writeShortLE(raf: RandomAccessFile, value: Int) {
        raf.write(value and 0xFF)
        raf.write((value ushr 8) and 0xFF)
    }
}
