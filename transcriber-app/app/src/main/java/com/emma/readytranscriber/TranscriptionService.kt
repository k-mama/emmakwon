package com.emma.readytranscriber

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ContentUris
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.IBinder
import android.os.PowerManager
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
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (job?.isActive == true) return START_REDELIVER_INTENT

        val snapshot = TranscriptionStateStore.snapshot(this)
        val batch = when {
            intent != null && (intent.action == ACTION_START_BATCH || intent.action == ACTION_START) ->
                readBatch(intent, snapshot)
            snapshot.active -> batchFromState(snapshot)
            else -> Batch(emptyList())
        }

        if (batch.items.isEmpty()) {
            stopSelf(startId)
            return START_NOT_STICKY
        }

        if (!snapshot.active) {
            TranscriptionStateStore.begin(this)
        }

        startForeground(
            NOTIFICATION_ID,
            notification("백그라운드 대본 추출 준비 중 · ${batch.items.size}개 파일", snapshot.progress)
        )
        acquireWakeLock()

        job = scope.launch {
            try {
                transcribeBatch(batch)
            } catch (error: Throwable) {
                val message = friendlyError(error)
                sendError(message)
                updateNotification("문제가 발생했습니다", 0)
            } finally {
                releaseWakeLock()
                stopForeground(STOP_FOREGROUND_DETACH)
                stopSelf(startId)
            }
        }
        return START_REDELIVER_INTENT
    }

    private data class QueueItem(
        val uri: Uri,
        val originalName: String,
        val durationMs: Long,
        val outputName: String,
        val state: String = TranscriptionStateStore.STATE_QUEUED,
        val completedThroughMs: Long = 0L
    )

    private data class Batch(val items: List<QueueItem>)

    private data class TranscriptOutput(
        val writer: BufferedWriter,
        val location: String
    )

    private fun readBatch(intent: Intent, snapshot: TranscriptionStateStore.Snapshot): Batch {
        val stateByOutput = snapshot.queue.associateBy { it.outputName }
        val uriStrings = intent.getStringArrayListExtra(EXTRA_URIS)
        if (!uriStrings.isNullOrEmpty()) {
            val names = intent.getStringArrayListExtra(EXTRA_NAMES).orEmpty()
            val durations = intent.getLongArrayExtra(EXTRA_DURATIONS) ?: LongArray(uriStrings.size) { -1L }
            val outputNames = intent.getStringArrayListExtra(EXTRA_OUTPUT_NAMES).orEmpty()
            return Batch(
                uriStrings.mapIndexed { index, uriString ->
                    val outputName = outputNames.getOrNull(index)
                        ?: "T${(index + 1).toString().padStart(3, '0')}.txt"
                    val persisted = stateByOutput[outputName]
                    QueueItem(
                        uri = Uri.parse(uriString),
                        originalName = names.getOrNull(index) ?: persisted?.originalName ?: "video_${index + 1}",
                        durationMs = durations.getOrNull(index) ?: persisted?.durationMs ?: -1L,
                        outputName = outputName,
                        state = persisted?.state ?: TranscriptionStateStore.STATE_QUEUED,
                        completedThroughMs = persisted?.completedThroughMs ?: 0L
                    )
                }
            )
        }

        val uri = intent.getStringExtra(EXTRA_URI) ?: return batchFromState(snapshot)
        val name = intent.getStringExtra(EXTRA_NAME) ?: "video"
        val duration = intent.getLongExtra(EXTRA_DURATION, -1L)
        val outputName = "T001.txt"
        val persisted = stateByOutput[outputName]
        return Batch(
            listOf(
                QueueItem(
                    Uri.parse(uri),
                    name,
                    duration,
                    outputName,
                    persisted?.state ?: TranscriptionStateStore.STATE_QUEUED,
                    persisted?.completedThroughMs ?: 0L
                )
            )
        )
    }

    private fun batchFromState(snapshot: TranscriptionStateStore.Snapshot): Batch {
        return Batch(
            snapshot.queue.map {
                QueueItem(
                    uri = Uri.parse(it.uri),
                    originalName = it.originalName,
                    durationMs = it.durationMs,
                    outputName = it.outputName,
                    state = it.state,
                    completedThroughMs = it.completedThroughMs
                )
            }
        )
    }

    private suspend fun transcribeBatch(batch: Batch) {
        val initialSnapshot = TranscriptionStateStore.snapshot(this)
        var successCount = initialSnapshot.queue.count { it.state == TranscriptionStateStore.STATE_DONE }
        var failedCount = initialSnapshot.queue.count { it.state == TranscriptionStateStore.STATE_FAILED }
        val totalItems = batch.items.size

        sendProgress(
            initialSnapshot.progress.coerceAtLeast(1),
            "백그라운드 음성인식 준비 중",
            "다른 앱을 사용하거나 화면을 꺼도 계속 처리하도록 보호 중입니다."
        )

        val modelFile = ensureModel()
        val model = Whisper.loadModel(this, modelFile.absolutePath)

        try {
            batch.items.forEachIndexed { index, originalItem ->
                val latest = TranscriptionStateStore.snapshot(this).queue
                    .firstOrNull { it.outputName == originalItem.outputName }
                val item = originalItem.copy(
                    state = latest?.state ?: originalItem.state,
                    completedThroughMs = latest?.completedThroughMs ?: originalItem.completedThroughMs
                )

                if (item.state == TranscriptionStateStore.STATE_DONE ||
                    item.state == TranscriptionStateStore.STATE_FAILED
                ) {
                    return@forEachIndexed
                }

                val itemNumber = index + 1
                TranscriptionStateStore.markProcessing(this, item.outputName)
                val resumeText = if (item.completedThroughMs > 0L) {
                    " · ${formatTime(item.completedThroughMs)}부터 자동 이어서 처리"
                } else {
                    ""
                }
                sendProgress(
                    overallProgress(index, totalItems, itemProgressFromTime(item.completedThroughMs, item.durationMs)),
                    "$itemNumber / $totalItems 대본 추출 중",
                    "${item.originalName} → ${item.outputName}$resumeText"
                )
                updateNotification(
                    "$itemNumber/$totalItems · ${item.outputName}$resumeText",
                    overallProgress(index, totalItems, itemProgressFromTime(item.completedThroughMs, item.durationMs))
                )

                runCatching {
                    transcribeOne(model, item, index, totalItems)
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
            "${totalItems}개 파일을 모두 처리했습니다."
        } else {
            "완료 ${successCount}개 · 실패 ${failedCount}개"
        }
        sendDone(summary)
        updateNotification("전체 완료 · $successCount/$totalItems", 100)
    }

    private suspend fun transcribeOne(
        model: WhisperModel,
        item: QueueItem,
        itemIndex: Int,
        totalItems: Int
    ): String {
        val latestCheckpoint = TranscriptionStateStore.snapshot(this).queue
            .firstOrNull { it.outputName == item.outputName }
            ?.completedThroughMs
            ?: item.completedThroughMs
        val resumeMs = latestCheckpoint.coerceAtLeast(0L)
        val append = resumeMs > 0L
        val transcriptOutput = openTranscriptOutput(item.outputName, append)

        if (item.durationMs > 0L && resumeMs >= item.durationMs - 1_500L) {
            transcriptOutput.writer.close()
            return "저장 완료\n${transcriptOutput.location}"
        }

        var recognizedChunks = if (append) 1 else 0
        var newChunks = 0
        val totalChunks = if (item.durationMs > 0) {
            ceil(item.durationMs / 300_000.0).toInt().coerceAtLeast(1)
        } else {
            1
        }
        val alreadyCompletedChunks = (resumeMs / 300_000L).toInt()

        sendProgress(
            overallProgress(itemIndex, totalItems, itemProgressFromTime(resumeMs, item.durationMs)),
            "${itemIndex + 1} / $totalItems 백그라운드 대본 추출 중",
            buildString {
                append(item.outputName)
                append(" · ")
                append(transcriptOutput.location)
                if (resumeMs > 0L) {
                    append("\n자동 복구: ")
                    append(formatTime(resumeMs))
                    append(" 이후부터 이어서 처리합니다.")
                } else {
                    append("\nTXT를 먼저 만들고 5분 구간마다 즉시 저장합니다.")
                }
            }
        )

        try {
            AudioChunkDecoder.process(
                context = this,
                uri = item.uri,
                startMs = resumeMs,
                onDecodeProgress = { },
                onChunk = { chunk ->
                    val chunkNumber = alreadyCompletedChunks + newChunks + 1
                    val itemProgress = itemProgressFromTime(chunk.startMs, item.durationMs)
                    val batchProgress = overallProgress(itemIndex, totalItems, itemProgress)
                    sendProgress(
                        batchProgress,
                        "${itemIndex + 1} / $totalItems 대본 추출 중",
                        "${item.outputName} · ${formatTime(chunk.startMs)} ~ ${formatTime(chunk.endMs)} · $chunkNumber / 약 $totalChunks\n다른 앱을 사용해도 이 작업은 계속됩니다."
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

                    TranscriptionStateStore.markChunkSaved(this, item.outputName, chunk.endMs)
                    newChunks += 1
                    runCatching { chunk.file.delete() }
                }
            )

            if (newChunks == 0) {
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

    private fun openTranscriptOutput(fileName: String, append: Boolean): TranscriptOutput {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val relativePath = Environment.DIRECTORY_DOWNLOADS + "/EmmaTranscriber/"
            val existing = findExistingDownload(fileName, relativePath)
            val uri = if (append) {
                existing ?: error("이어쓰기할 기존 TXT 파일을 찾지 못했습니다: $fileName")
            } else {
                if (existing != null) {
                    runCatching { contentResolver.delete(existing, null, null) }
                }
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                    put(MediaStore.Downloads.MIME_TYPE, "text/plain")
                    put(MediaStore.Downloads.RELATIVE_PATH, relativePath)
                }
                contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: error("Downloads에 TXT 파일을 만들 수 없습니다.")
            }
            val stream = contentResolver.openOutputStream(uri, if (append) "wa" else "w")
                ?: error("TXT 파일을 열 수 없습니다.")
            return TranscriptOutput(
                writer = BufferedWriter(OutputStreamWriter(stream, Charsets.UTF_8)),
                location = "Downloads/EmmaTranscriber/$fileName"
            )
        }

        val dir = File(getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS), "EmmaTranscriber").apply { mkdirs() }
        val file = File(dir, fileName)
        val stream = FileOutputStream(file, append)
        return TranscriptOutput(
            writer = BufferedWriter(OutputStreamWriter(stream, Charsets.UTF_8)),
            location = file.absolutePath
        )
    }

    private fun findExistingDownload(fileName: String, relativePath: String): Uri? {
        val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
        val projection = arrayOf(MediaStore.MediaColumns._ID)
        val selection = "${MediaStore.MediaColumns.DISPLAY_NAME}=? AND ${MediaStore.MediaColumns.RELATIVE_PATH}=?"
        val args = arrayOf(fileName, relativePath)
        return contentResolver.query(collection, projection, selection, args, null)?.use { cursor ->
            if (!cursor.moveToFirst()) return@use null
            val idIndex = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID)
            ContentUris.withAppendedId(collection, cursor.getLong(idIndex))
        }
    }

    private fun itemProgressFromTime(timeMs: Long, durationMs: Long): Int {
        if (durationMs <= 0L) return if (timeMs > 0L) 50 else 3
        return ((timeMs.coerceIn(0L, durationMs) * 95L / durationMs).toInt() + 3)
            .coerceIn(3, 98)
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
        connection.setRequestProperty("User-Agent", "EmmaTranscriber/0.3.0")
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

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val powerManager = getSystemService(PowerManager::class.java)
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "$packageName:TranscriptionWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire()
        }
    }

    private fun releaseWakeLock() {
        runCatching {
            wakeLock?.takeIf { it.isHeld }?.release()
        }
        wakeLock = null
    }

    private fun sendProgress(progress: Int, status: String, detail: String) {
        TranscriptionStateStore.saveProgress(this, progress, status, detail)
        sendBroadcast(Intent(ACTION_PROGRESS).apply {
            setPackage(packageName)
            putExtra(EXTRA_PROGRESS, progress)
            putExtra(EXTRA_STATUS, status)
            putExtra(EXTRA_DETAIL, detail)
        })
    }

    private fun sendItemDone(item: QueueItem, output: String, success: Boolean) {
        val completedLine = buildString {
            append(if (success) "✓ " else "✕ ")
            append(item.originalName)
            append("  →  ")
            append(item.outputName)
            if (output.isNotBlank()) {
                append("\n   ")
                append(if (success) output.substringAfter("\n", output) else output)
            }
        }
        TranscriptionStateStore.markItemDone(this, item.outputName, success, completedLine)
        sendBroadcast(Intent(ACTION_ITEM_DONE).apply {
            setPackage(packageName)
            putExtra(EXTRA_ORIGINAL_NAME, item.originalName)
            putExtra(EXTRA_OUTPUT_NAME, item.outputName)
            putExtra(EXTRA_OUTPUT, output)
            putExtra(EXTRA_SUCCESS, success)
        })
    }

    private fun sendDone(detail: String) {
        TranscriptionStateStore.finish(this, detail)
        sendBroadcast(Intent(ACTION_DONE).apply {
            setPackage(packageName)
            putExtra(EXTRA_DETAIL, detail)
            putExtra(EXTRA_OUTPUT, detail)
        })
    }

    private fun sendError(detail: String) {
        TranscriptionStateStore.fatal(this, detail)
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
                NotificationChannel(
                    CHANNEL_ID,
                    "대본 추출",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "긴 영상의 대본을 백그라운드에서 계속 추출합니다."
                    setSound(null, null)
                }
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
            .setContentTitle("Emma Transcriber · 백그라운드 실행 중")
            .setContentText(text)
            .setContentIntent(pending)
            .setOnlyAlertOnce(true)
            .setOngoing(progress < 100)
            .setCategory(Notification.CATEGORY_SERVICE)
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

    override fun onTaskRemoved(rootIntent: Intent?) {
        val snapshot = TranscriptionStateStore.snapshot(this)
        if (snapshot.active) {
            updateNotification("다른 앱을 사용하는 동안에도 계속 처리 중", snapshot.progress)
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        releaseWakeLock()
        scope.cancel()
        super.onDestroy()
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
