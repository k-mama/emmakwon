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
    private lateinit var fileInfo: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var statusText: TextView
    private lateinit var detailText: TextView
    private lateinit var outputText: TextView

    private val openVideo = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) startForUri(uri)
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
                    selectButton.isEnabled = false
                }
                TranscriptionService.ACTION_DONE -> {
                    progressBar.progress = 100
                    statusText.text = "완료"
                    detailText.text = "대본 추출이 끝났습니다."
                    outputText.text = intent.getStringExtra(TranscriptionService.EXTRA_OUTPUT)
                        ?: "TXT 파일 저장 완료"
                    selectButton.isEnabled = true
                }
                TranscriptionService.ACTION_ERROR -> {
                    statusText.text = "문제가 발생했습니다"
                    detailText.text = intent.getStringExtra(TranscriptionService.EXTRA_DETAIL)
                        ?: "알 수 없는 오류"
                    selectButton.isEnabled = true
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        selectButton = findViewById(R.id.selectButton)
        fileInfo = findViewById(R.id.fileInfo)
        progressBar = findViewById(R.id.progressBar)
        statusText = findViewById(R.id.statusText)
        detailText = findViewById(R.id.detailText)
        outputText = findViewById(R.id.outputText)

        selectButton.setOnClickListener {
            requestNotificationsIfNeeded()
            openVideo.launch(arrayOf("video/*", "audio/*"))
        }
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter().apply {
            addAction(TranscriptionService.ACTION_PROGRESS)
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

    private fun startForUri(uri: Uri) {
        runCatching {
            contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        val info = queryInfo(uri)
        fileInfo.text = buildString {
            append(info.name)
            if (info.sizeBytes > 0) append("\n${formatBytes(info.sizeBytes)}")
            if (info.durationMs > 0) append(" · ${formatDuration(info.durationMs)}")
        }
        progressBar.progress = 0
        statusText.text = "시작 준비 중"
        detailText.text = "원본 영상은 복사하거나 업로드하지 않습니다."
        outputText.text = "처리 중에는 앱을 닫아도 백그라운드 작업이 계속됩니다."
        selectButton.isEnabled = false

        val intent = Intent(this, TranscriptionService::class.java).apply {
            action = TranscriptionService.ACTION_START
            putExtra(TranscriptionService.EXTRA_URI, uri.toString())
            putExtra(TranscriptionService.EXTRA_NAME, info.name)
            putExtra(TranscriptionService.EXTRA_DURATION, info.durationMs)
        }
        ContextCompat.startForegroundService(this, intent)
    }

    private data class VideoInfo(val name: String, val sizeBytes: Long, val durationMs: Long)

    private fun queryInfo(uri: Uri): VideoInfo {
        var name = "video"
        var size = -1L
        var cursor: Cursor? = null
        try {
            cursor = contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)
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
            retriever.setDataSource(this, uri)
            duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: -1L
            retriever.release()
        }
        return VideoInfo(name, size, duration)
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
}
