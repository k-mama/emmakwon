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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
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
        if (intent?.action != ACTION_START || job?.isActive == true) return START_NOT_STICKY

        val uriString = intent.getStringExtra(EXTRA_URI) ?: return START_NOT_STICKY
        val displayName = intent.getStringExtra(EXTRA_NAME) ?: "video"
        val durationMs = intent.getLongExtra(EXTRA_DURATION, -1L)

        startForeground(NOTIFICATION_ID, notification("준비 중", 0))
        job = scope.launch {
            runCatching {
                transcribe(Uri.parse(uriString), displayName, durationMs)
            }.onFailure { error ->
                val message = error.message ?: error.javaClass.simpleName
                sendError(message)
                updateNotification("문제가 발생했습니다", 0)
            }
            stopForeground(STOP_FOREGROUND_DETACH)
            stopSelf(startId)
        }
        return START_NOT_STICKY
    }

    private suspend fun transcribe(uri: Uri, displayName: String, durationMs: Long) {
        sendProgress(1, "Whisper 준비 중", "처음 사용이라면 모델 약 142MB를 한 번만 내려받습니다.")
        val modelFile = ensureModel()
        sendProgress(10, "대본 엔진 준비 완료", "영상 오디오를 작은 조각으로 읽습니다. 원본은 복사하지 않습니다.")

        val model = Whisper.loadModel(this, modelFile.absolutePath)
        val recovery = File(filesDir, "current_transcript.txt")
        recovery.writeText("")

        val totalChunks = if (durationMs > 0) ceil(durationMs / 300_000.0).toInt().coerceAtLeast(1) else 1
        var completedChunks = 0

        try {
            AudioChunkDecoder.process(
                context = this,
                uri = uri,
                onDecodeProgress = { },
                onChunk = { chunk ->
                    val chunkNumber = completedChunks + 1
                    val estimatedProgress = (10 + (completedChunks * 85 / totalChunks)).coerceIn(10, 94)
                    sendProgress(
                        estimatedProgress,
                        "대본 추출 중",
                        "${formatTime(chunk.startMs)} ~ ${formatTime(chunk.endMs)} 처리 중 · 조각 $chunkNumber / 약 $totalChunks"
                    )
                    updateNotification("대본 추출 중 · $chunkNumber / 약 $totalChunks", estimatedProgress)

                    val result = Whisper.transcribe(model, chunk.file.absolutePath, WhisperConfig())
                    val text = result.text.trim()
                    if (text.isNotBlank()) {
                        recovery.appendText(text)
                        recovery.appendText("\n\n")
                    }
                    completedChunks += 1
                    runCatching { chunk.file.delete() }

                    val p = (10 + (completedChunks * 85 / totalChunks)).coerceIn(10, 95)
                    sendProgress(p, "대본 추출 중", "$completedChunks개 구간 완료")
                    updateNotification("대본 추출 중 · $completedChunks개 구간 완료", p)
                }
            )
        } finally {
            Whisper.releaseModel(model)
        }

        val baseName = displayName.substringBeforeLast('.').ifBlank { "transcript" }
        val outputName = sanitizeFileName(baseName) + "_transcript.txt"
        val saved = saveTranscript(outputName, recovery.readText())
        sendDone(saved)
        updateNotification("완료 · TXT 저장됨", 100)
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
        connection.connect()
        if (connection.responseCode !in 200..299) {
            connection.disconnect()
            error("Whisper 모델 다운로드에 실패했습니다. HTTP ${connection.responseCode}")
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
                        sendProgress(p, "Whisper 모델 다운로드 중", "첫 사용에만 필요합니다 · ${copied / 1_048_576}MB / ${total / 1_048_576}MB")
                        updateNotification("모델 다운로드 중", p)
                    }
                }
            }
        }
        connection.disconnect()
        if (!temp.renameTo(model)) {
            temp.copyTo(model, overwrite = true)
            temp.delete()
        }
        return model
    }

    private fun saveTranscript(fileName: String, text: String): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, "text/plain")
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/EmmaTranscriber")
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: error("TXT 파일 저장 위치를 만들 수 없습니다.")
            contentResolver.openOutputStream(uri, "w")!!.bufferedWriter(Charsets.UTF_8).use { it.write(text) }
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            contentResolver.update(uri, values, null, null)
            return "저장 완료\nDownloads/EmmaTranscriber/$fileName"
        }

        val dir = File(getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS), "EmmaTranscriber").apply { mkdirs() }
        val file = File(dir, fileName)
        file.writeText(text, Charsets.UTF_8)
        return "저장 완료\n${file.absolutePath}"
    }

    private fun sendProgress(progress: Int, status: String, detail: String) {
        sendBroadcast(Intent(ACTION_PROGRESS).apply {
            setPackage(packageName)
            putExtra(EXTRA_PROGRESS, progress)
            putExtra(EXTRA_STATUS, status)
            putExtra(EXTRA_DETAIL, detail)
        })
    }

    private fun sendDone(output: String) {
        sendBroadcast(Intent(ACTION_DONE).apply {
            setPackage(packageName)
            putExtra(EXTRA_OUTPUT, output)
        })
    }

    private fun sendError(detail: String) {
        sendBroadcast(Intent(ACTION_ERROR).apply {
            setPackage(packageName)
            putExtra(EXTRA_DETAIL, detail)
        })
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

    private fun sanitizeFileName(name: String): String =
        name.replace(Regex("[\\\\/:*?\"<>|]"), "_").take(120)

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val ACTION_START = "com.emma.readytranscriber.START"
        const val ACTION_PROGRESS = "com.emma.readytranscriber.PROGRESS"
        const val ACTION_DONE = "com.emma.readytranscriber.DONE"
        const val ACTION_ERROR = "com.emma.readytranscriber.ERROR"

        const val EXTRA_URI = "uri"
        const val EXTRA_NAME = "name"
        const val EXTRA_DURATION = "duration"
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
