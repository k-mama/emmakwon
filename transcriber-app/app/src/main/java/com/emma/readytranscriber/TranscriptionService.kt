package com.emma.readytranscriber

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.IBinder
import android.provider.MediaStore
import dev.ffmpegkit.whisper.Whisper
import dev.ffmpegkit.whisper.WhisperConfig
import dev.ffmpegkit.whisper.WhisperModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.BufferedWriter
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.ceil

class TranscriptionService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var job: Job? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null || job?.isActive == true) return START_REDELIVER_INTENT
        if (intent.action != ACTION_START_BATCH && intent.action != ACTION_START) return START_NOT_STICKY

        val batch = readBatch(intent)
        if (batch.items.isEmpty()) return START_NOT_STICKY

        startForeground(NOTIFICATION_ID, notification("준비 중 · ${batch.items.size}개 파일", 0))
        job = scope.launch {
            runCatching {
                transcribeBatch(batch)
            }.onFailure { error ->
                val message = friendlyError(error)
                sendError(message)
                updateNotification("문제가 발생했습니다", 0)
            }
            stopForeground(STOP_FOREGROUND_DETACH)
            stopSelf(startId)
        }
        return START_REDELIVER_INTENT
    }

    private data class QueueItem(
        val uri: Uri,
        val originalName: String,
        val durationMs: Long,
        val outputName: String
    )

    private data class Batch(val items: List<QueueItem>)

    private data class TranscriptOutput(
        val writer: BufferedWriter,
        val location: String
    )

    private fun readBatch(intent: Intent): Batch {
        val uriStrings = intent.getStringArrayListExtra(EXTRA_URIS)
        if (!uriStrings.isNullOrEmpty()) {
            val names = intent.getStringArrayListExtra(EXTRA_NAMES).orEmpty()
            val durations = intent.getLongArrayExtra(EXTRA_DURATIONS) ?: LongArray(uriStrings.size) { -1L }
            val outputNames = intent.getStringArrayListExtra(EXTRA_OUTPUT_NAMES).orEmpty()
            return Batch(
                uriStrings.mapIndexed { index, uriString ->
                    QueueItem(
                        uri = Uri.parse(uriString),
                        originalName = names.getOrNull(index) ?: "video_${index + 1}",
                        durationMs = durations.getOrNull(index) ?: -1L,
                        outputName = outputNames.getOrNull(index) ?: "T${(index + 1).toString().padStart(3, '0')}.txt"
                    )
                }
            )
        }

        val uri = intent.getStringExtra(EXTRA_URI) ?: return Batch(emptyList())
        val name = intent.getStringExtra(EXTRA_NAME) ?: "video"
        val duration = intent.getLongExtra(EXTRA_DURATION, -1L)
        return Batch(listOf(QueueItem(Uri.parse(uri), name, duration, "T001.txt")))
    }

    private suspend fun transcribeBatch(batch: Batch) {
        sendProgress(1, "Whisper 준비 중", "${batch.items.size}개 파일을 순서대로 처리합니다.")
        val modelFile = ensureModel()
        val model = Whisper.loadModel(this, modelFile.absolutePath)
        var successCount = 0
        var failedCount = 0

        try {
            batch.items.forEachIndexed { index, item ->
                val itemNumber = index + 1
                sendProgress(
                    overallProgress(index, batch.items.size, 2),
                    "$itemNumber / ${batch.items.size} 시작",
                    "${item.originalName} → ${item.outputName}"
                )
                updateNotification(
                    "$itemNumber/${batch.items.size} · ${item.outputName} 준비 중",
                    overallProgress(index, batch.items.size, 2)
                )

                runCatching {
                    transcribeOne(model, item, index, batch.items.size)
                }.onSuccess { saved ->
                    successCount += 1
                    sendItemDone(item, saved, true)
                }.onFailure { error ->
                    failedCount += 1
                    sendItemDone(item, "실패: ${friendlyError(error)}", false)
                }
            }
        } finally {
            Whisper.releaseModel(model)
        }

        val summary = if (failedCount == 0) {
            "${batch.items.size}개 파일을 모두 처리했습니다."
        } else {
            "완료 ${successCount}개 · 실패 ${failedCount}개"
        }
        sendDone(summary)
        updateNotification("전체 완료 · $successCount/${batch.items.size}", 100)
    }

    private suspend fun transcribeOne(
        model: WhisperModel,
        item: QueueItem,
        itemIndex: Int,
        totalItems: Int
    ): String {
        val transcriptOutput = openTranscriptOutput(item.outputName)
        var recognizedChunks = 0
        var processedChunks = 0

        sendProgress(
            overallProgress(itemIndex, totalItems, 3),
            "${itemIndex + 1} / $totalItems TXT 생성됨",
            "${item.outputName} · ${transcriptOutput.location}\n완료될 때까지 인식된 대본을 이 파일에 계속 추가합니다."
        )

        try {
            val totalChunks = if (item.durationMs > 0) {
                ceil(item.durationMs / 300_000.0).toInt().coerceAtLeast(1)
            } else {
                1
            }

            AudioChunkDecoder.process(
                context = this,
                uri = item.uri,
                onDecodeProgress = { },
                onChunk = { chunk ->
                    val chunkNumber = processedChunks + 1
                    val itemProgress = (5 + (processedChunks * 90 / totalChunks)).coerceIn(5, 94)
                    val batchProgress = overallProgress(itemIndex, totalItems, itemProgress)
                    sendProgress(
                        batchProgress,
                        "${itemIndex + 1} / $totalItems 대본 추출 중",
                        "${item.outputName} · ${formatTime(chunk.startMs)} ~ ${formatTime(chunk.endMs)} · $chunkNumber / 약 $totalChunks"
                    )
                    updateNotification(
                        "${itemIndex + 1}/$totalItems · ${item.outputName} · $chunkNumber/약 $totalChunks",
                        batchProgress
                    )

                    val result = Whisper.transcribe(model, chunk.file.absolutePath, WhisperConfig())
                    val text = result.text.trim()
                    if (text.isNotBlank()) {
                        transcriptOutput.writer.write(text)
                        transcriptOutput.writer.write("\n\n")
                        transcriptOutput.writer.flush()
                        recognizedChunks += 1
                    }
                    processedChunks += 1
                    runCatching { chunk.file.delete() }
                }
            )

            if (processedChunks == 0) {
                error("오디오를 읽었지만 처리 가능한 음성 구간을 만들지 못했습니다.")
            }
            if (recognizedChunks == 0) {
                error("오디오는 읽었지만 인식된 대사가 없습니다. 영상에 실제 음성이 있는지 확인해주세요.")
            }

            sendProgress(
                overallProgress(itemIndex, totalItems, 100),
                "${itemIndex + 1} / $totalItems 완료",
                "${item.originalName} → ${item.outputName}"
            )
            return "저장 완료\n${transcriptOutput.location}"
        } finally {
            runCatching { transcriptOutput.writer.flush() }
            runCatching { transcriptOutput.writer.close() }
        }
    }

    private fun openTranscriptOutput(fileName: String): TranscriptOutput {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, "text/plain")
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/EmmaTranscriber")
            }
            val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: error("Downloads에 TXT 파일을 만들 수 없습니다.")
            val stream = contentResolver.openOutputStream(uri, "w")
                ?: error("TXT 파일을 열 수 없습니다.")
            return TranscriptOutput(
                writer = BufferedWriter(OutputStreamWriter(stream, Charsets.UTF_8)),
                location = "Downloads/EmmaTranscriber/$fileName"
            )
        }

        val dir = File(getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS), "EmmaTranscriber").apply { mkdirs() }
        val file = File(dir, fileName)
        return TranscriptOutput(
            writer = file.bufferedWriter(Charsets.UTF_8),
            location = file.absolutePath
        )
    }

    private fun overallProgress(itemIndex: Int, totalItems: Int, itemProgress: Int): Int {
        if (totalItems <= 0) return itemProgress.coerceIn(0, 100)
        val raw = ((itemIndex * 100.0 + itemProgress.coerceIn(0, 100)) / totalItems).toInt()
        return raw.coerceIn(0, 100)
    }

    private fun ensureModel(): File {
        val dir = File(filesDir, "models").apply { mkdirs() }
        val model = File(dir, MODEL_NAME)
        if (model.exists() && model.length() > 100_000_000L) return model

        val temp = File(dir, "$MODEL_NAME.part")
        if (temp.exists()) temp.delete()

        val connection = URL(MODEL_URL).openConnection() as HttpURLConnection
        connection.instanceFollowRedirects = true
        connection.connectTimeout = 30_000
        connection.readTimeout = 60_000
        connection.setRequestProperty("User-Agent", "EmmaTranscriber/0.2.1")
        connection.connect()
        if (connection.responseCode !in 200..299) {
            val code = connection.responseCode
            connection.disconnect()
            error("Whisper 모델 다운로드에 실패했습니다. HTTP $code")
        }
        val total = connection.contentLengthLong
        var copied = 0L
        BufferedInputStream(connection.inputStream).use { input ->
            BufferedOutputStream(FileOutputStream(temp)).use { output ->
                val buffer = ByteArray(256 * 1024)
                while (true) {
                    val read = input.read(buffer)
                    if (read < 0) break
                    output.write(buffer, 0, read)
                    copied += read
                    if (total > 0) {
                        val p = (copied * 8 / total).toInt().coerceIn(1, 8)
                        sendProgress(
                            p,
                            "Whisper 모델 다운로드 중",
                            "첫 사용에만 필요합니다 · ${copied / 1_048_576}MB / ${total / 1_048_576}MB"
                        )
                        updateNotification("모델 다운로드 중", p)
                    }
                }
            }
        }
        connection.disconnect()

        if (temp.length() < 100_000_000L) {
            temp.delete()
            error("Whisper 모델 파일이 완전히 내려받아지지 않았습니다. 인터넷 연결 후 다시 시도해주세요.")
        }

        if (!temp.renameTo(model)) {
            temp.copyTo(model, overwrite = true)
            temp.delete()
        }
        return model
    }

    private fun sendProgress(progress: Int, status: String, detail: String) {
        sendBroadcast(Intent(ACTION_PROGRESS).apply {
            setPackage(packageName)
            putExtra(EXTRA_PROGRESS, progress)
            putExtra(EXTRA_STATUS, status)
            putExtra(EXTRA_DETAIL, detail)
        })
    }

    private fun sendItemDone(item: QueueItem, output: String, success: Boolean) {
        sendBroadcast(Intent(ACTION_ITEM_DONE).apply {
            setPackage(packageName)
            putExtra(EXTRA_ORIGINAL_NAME, item.originalName)
            putExtra(EXTRA_OUTPUT_NAME, item.outputName)
            putExtra(EXTRA_OUTPUT, output)
            putExtra(EXTRA_SUCCESS, success)
        })
    }

    private fun sendDone(detail: String) {
        sendBroadcast(Intent(ACTION_DONE).apply {
            setPackage(packageName)
            putExtra(EXTRA_DETAIL, detail)
            putExtra(EXTRA_OUTPUT, detail)
        })
    }

    private fun sendError(detail: String) {
        sendBroadcast(Intent(ACTION_ERROR).apply {
            setPackage(packageName)
            putExtra(EXTRA_DETAIL, detail)
        })
    }

    private fun friendlyError(error: Throwable): String {
        val raw = error.message.orEmpty()
        return when {
            raw.contains("dlopen", ignoreCase = true) || raw.contains("UnsatisfiedLinkError", ignoreCase = true) ->
                "이 휴대폰의 CPU 형식에서 음성인식 엔진을 시작하지 못했습니다."
            raw.contains("codec", ignoreCase = true) ->
                "이 영상의 오디오 형식을 휴대폰이 해석하지 못했습니다. 다른 영상으로도 한 번 확인해주세요."
            raw.isNotBlank() -> raw
            else -> error.javaClass.simpleName
        }
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "대본 추출", NotificationManager.IMPORTANCE_LOW)
            )
        }
    }

    private fun notification(text: String, progress: Int): Notification {
        val pending = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("Emma Transcriber")
            .setContentText(text)
            .setContentIntent(pending)
            .setOngoing(progress < 100)
            .setProgress(100, progress.coerceIn(0, 100), false)
            .build()
    }

    private fun updateNotification(text: String, progress: Int) {
        getSystemService(NotificationManager::class.java)
            .notify(NOTIFICATION_ID, notification(text, progress))
    }

    private fun formatTime(ms: Long): String {
        val total = ms / 1000
        val h = total / 3600
        val m = (total % 3600) / 60
        val s = total % 60
        return "%02d:%02d:%02d".format(h, m, s)
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val ACTION_START = "com.emma.readytranscriber.START"
        const val ACTION_START_BATCH = "com.emma.readytranscriber.START_BATCH"
        const val ACTION_PROGRESS = "com.emma.readytranscriber.PROGRESS"
        const val ACTION_ITEM_DONE = "com.emma.readytranscriber.ITEM_DONE"
        const val ACTION_DONE = "com.emma.readytranscriber.DONE"
        const val ACTION_ERROR = "com.emma.readytranscriber.ERROR"

        const val EXTRA_URI = "uri"
        const val EXTRA_NAME = "name"
        const val EXTRA_DURATION = "duration"
        const val EXTRA_URIS = "uris"
        const val EXTRA_NAMES = "names"
        const val EXTRA_DURATIONS = "durations"
        const val EXTRA_OUTPUT_NAMES = "output_names"
        const val EXTRA_ORIGINAL_NAME = "original_name"
        const val EXTRA_OUTPUT_NAME = "output_name"
        const val EXTRA_SUCCESS = "success"
        const val EXTRA_PROGRESS = "progress"
        const val EXTRA_STATUS = "status"
        const val EXTRA_DETAIL = "detail"
        const val EXTRA_OUTPUT = "output"

        private const val CHANNEL_ID = "transcription"
        private const val NOTIFICATION_ID = 4107
        private const val MODEL_NAME = "ggml-base.bin"
        private const val MODEL_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
    }
}
