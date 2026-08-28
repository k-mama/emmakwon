package com.emma.readytranscriber

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.database.Cursor
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var selectButton: Button
    private lateinit var startButton: Button
    private lateinit var fileInfo: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var statusText: TextView
    private lateinit var detailText: TextView
    private lateinit var outputText: TextView

    private val selectedItems = mutableListOf<SelectedItem>()
    private val completedLines = mutableListOf<String>()

    private val openVideos = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if (uris.isNotEmpty()) prepareSelection(uris)
    }

    private val notificationPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent == null) return
            when (intent.action) {
                TranscriptionService.ACTION_PROGRESS -> {
                    val progress = intent.getIntExtra(TranscriptionService.EXTRA_PROGRESS, 0)
                    val status = intent.getStringExtra(TranscriptionService.EXTRA_STATUS).orEmpty()
                    val detail = intent.getStringExtra(TranscriptionService.EXTRA_DETAIL).orEmpty()
                    progressBar.progress = progress
                    statusText.text = status
                    if (detail.isNotBlank()) detailText.text = detail
                    setBusy(true)
                }

                TranscriptionService.ACTION_ITEM_DONE -> {
                    val original = intent.getStringExtra(TranscriptionService.EXTRA_ORIGINAL_NAME).orEmpty()
                    val output = intent.getStringExtra(TranscriptionService.EXTRA_OUTPUT_NAME).orEmpty()
                    val saved = intent.getStringExtra(TranscriptionService.EXTRA_OUTPUT).orEmpty()
                    completedLines += buildString {
                        append("✓ ")
                        append(shortOriginalName(original))
                        append("  →  ")
                        append(output)
                        if (saved.isNotBlank()) {
                            append("\n   ")
                            append(saved.substringAfter("\n", saved))
                        }
                    }
                    outputText.text = completedLines.joinToString("\n\n")
                }

                TranscriptionService.ACTION_DONE -> {
                    progressBar.progress = 100
                    statusText.text = "전체 완료"
                    detailText.text = intent.getStringExtra(TranscriptionService.EXTRA_DETAIL)
                        ?: "선택한 파일을 모두 순서대로 처리했습니다."
                    if (completedLines.isEmpty()) {
                        outputText.text = intent.getStringExtra(TranscriptionService.EXTRA_OUTPUT)
                            ?: "TXT 파일 저장 완료"
                    }
                    selectedItems.clear()
                    setBusy(false)
                    startButton.isEnabled = false
                }

                TranscriptionService.ACTION_ERROR -> {
                    statusText.text = "문제가 발생했습니다"
                    detailText.text = intent.getStringExtra(TranscriptionService.EXTRA_DETAIL)
                        ?: "알 수 없는 오류"
                    setBusy(false)
                    startButton.isEnabled = selectedItems.isNotEmpty()
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        selectButton = findViewById(R.id.selectButton)
        startButton = findViewById(R.id.startButton)
        fileInfo = findViewById(R.id.fileInfo)
        progressBar = findViewById(R.id.progressBar)
        statusText = findViewById(R.id.statusText)
        detailText = findViewById(R.id.detailText)
        outputText = findViewById(R.id.outputText)

        selectButton.setOnClickListener {
            requestNotificationsIfNeeded()
            openVideos.launch(arrayOf("video/*", "audio/*"))
        }

        startButton.setOnClickListener {
            if (selectedItems.isNotEmpty()) startQueue()
        }
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter().apply {
            addAction(TranscriptionService.ACTION_PROGRESS)
            addAction(TranscriptionService.ACTION_ITEM_DONE)
            addAction(TranscriptionService.ACTION_DONE)
            addAction(TranscriptionService.ACTION_ERROR)
        }
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(receiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(receiver, filter)
        }
    }

    override fun onStop() {
        super.onStop()
        runCatching { unregisterReceiver(receiver) }
    }

    private fun requestNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun prepareSelection(uris: List<Uri>) {
        selectedItems.clear()
        completedLines.clear()
        outputText.text = "아직 저장된 대본이 없습니다."

        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        val firstNumber = prefs.getInt(KEY_NEXT_NUMBER, 1).coerceAtLeast(1)

        uris.forEachIndexed { index, uri ->
            runCatching {
                contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val info = queryInfo(uri)
            selectedItems += SelectedItem(
                uri = uri,
                originalName = info.name,
                sizeBytes = info.sizeBytes,
                durationMs = info.durationMs,
                outputName = transcriptName(firstNumber + index)
            )
        }

        fileInfo.text = buildString {
            append("${selectedItems.size}개 선택됨\n\n")
            selectedItems.forEachIndexed { index, item ->
                append(index + 1)
                append(". ")
                append(shortOriginalName(item.originalName))
                append("\n   → ")
                append(item.outputName)
                if (item.sizeBytes > 0 || item.durationMs > 0) {
                    append("   ")
                    if (item.sizeBytes > 0) append(formatBytes(item.sizeBytes))
                    if (item.sizeBytes > 0 && item.durationMs > 0) append(" · ")
                    if (item.durationMs > 0) append(formatDuration(item.durationMs))
                }
                if (index != selectedItems.lastIndex) append("\n\n")
            }
        }
        progressBar.progress = 0
        statusText.text = "대기 중"
        detailText.text = "위 순서대로 하나씩 처리합니다. 저장 파일명은 T001.txt처럼 짧게 만듭니다."
        startButton.text = "선택한 ${selectedItems.size}개 순차 처리 시작"
        startButton.isEnabled = selectedItems.isNotEmpty()
    }

    private fun startQueue() {
        requestNotificationsIfNeeded()
        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        val lastNumber = selectedItems.lastOrNull()?.outputName
            ?.removePrefix("T")
            ?.removeSuffix(".txt")
            ?.toIntOrNull()
        if (lastNumber != null) {
            prefs.edit().putInt(KEY_NEXT_NUMBER, lastNumber + 1).apply()
        }

        progressBar.progress = 0
        statusText.text = "순차 처리 시작"
        detailText.text = "첫 번째 파일부터 처리합니다. 원본 파일은 복사하거나 업로드하지 않습니다."
        outputText.text = "완료되는 파일마다 저장 이름과 위치를 여기에 알려드립니다."
        completedLines.clear()
        setBusy(true)

        val intent = Intent(this, TranscriptionService::class.java).apply {
            action = TranscriptionService.ACTION_START_BATCH
            putStringArrayListExtra(
                TranscriptionService.EXTRA_URIS,
                ArrayList(selectedItems.map { it.uri.toString() })
            )
            putStringArrayListExtra(
                TranscriptionService.EXTRA_NAMES,
                ArrayList(selectedItems.map { it.originalName })
            )
            putExtra(
                TranscriptionService.EXTRA_DURATIONS,
                selectedItems.map { it.durationMs }.toLongArray()
            )
            putStringArrayListExtra(
                TranscriptionService.EXTRA_OUTPUT_NAMES,
                ArrayList(selectedItems.map { it.outputName })
            )
        }
        ContextCompat.startForegroundService(this, intent)
    }

    private fun setBusy(busy: Boolean) {
        selectButton.isEnabled = !busy
        startButton.isEnabled = !busy && selectedItems.isNotEmpty()
    }

    private data class SelectedItem(
        val uri: Uri,
        val originalName: String,
        val sizeBytes: Long,
        val durationMs: Long,
        val outputName: String
    )

    private data class VideoInfo(val name: String, val sizeBytes: Long, val durationMs: Long)

    private fun queryInfo(uri: Uri): VideoInfo {
        var name = "video"
        var size = -1L
        var cursor: Cursor? = null
        try {
            cursor = contentResolver.query(
                uri,
                arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE),
                null,
                null,
                null
            )
            if (cursor?.moveToFirst() == true) {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (nameIndex >= 0) name = cursor.getString(nameIndex) ?: name
                if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) size = cursor.getLong(sizeIndex)
            }
        } finally {
            cursor?.close()
        }

        var duration = -1L
        runCatching {
            val retriever = MediaMetadataRetriever()
            try {
                retriever.setDataSource(this, uri)
                duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                    ?.toLongOrNull() ?: -1L
            } finally {
                retriever.release()
            }
        }
        return VideoInfo(name, size, duration)
    }

    private fun transcriptName(number: Int): String = "T${number.toString().padStart(3, '0')}.txt"

    private fun shortOriginalName(name: String): String {
        if (name.length <= 38) return name
        val extension = name.substringAfterLast('.', "")
        val base = name.substringBeforeLast('.')
        val suffix = if (extension.isBlank()) "" else ".$extension"
        return base.take(28) + "…" + suffix
    }

    private fun formatBytes(bytes: Long): String {
        val gb = bytes / 1_073_741_824.0
        val mb = bytes / 1_048_576.0
        return if (gb >= 1) String.format("%.2f GB", gb) else String.format("%.1f MB", mb)
    }

    private fun formatDuration(ms: Long): String {
        val total = ms / 1000
        val h = total / 3600
        val m = (total % 3600) / 60
        val s = total % 60
        return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%02d:%02d".format(m, s)
    }

    companion object {
        private const val PREFS_NAME = "emma_transcriber"
        private const val KEY_NEXT_NUMBER = "next_transcript_number"
    }
}
