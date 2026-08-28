package com.emma.readytranscriber

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object TranscriptionStateStore {
    private const val PREFS = "emma_transcriber_runtime"
    private const val KEY_QUEUE = "queue"
    private const val KEY_ACTIVE = "active"
    private const val KEY_PROGRESS = "progress"
    private const val KEY_STATUS = "status"
    private const val KEY_DETAIL = "detail"
    private const val KEY_COMPLETED = "completed"
    private const val KEY_UPDATED_AT = "updated_at"

    const val STATE_QUEUED = "queued"
    const val STATE_PROCESSING = "processing"
    const val STATE_DONE = "done"
    const val STATE_FAILED = "failed"

    data class QueueItem(
        val uri: String,
        val originalName: String,
        val sizeBytes: Long,
        val durationMs: Long,
        val outputName: String,
        val state: String = STATE_QUEUED
    )

    data class Snapshot(
        val active: Boolean,
        val progress: Int,
        val status: String,
        val detail: String,
        val queue: List<QueueItem>,
        val completedLines: List<String>,
        val updatedAt: Long
    )

    fun saveQueue(context: Context, items: List<QueueItem>) {
        prefs(context).edit()
            .putString(KEY_QUEUE, queueToJson(items).toString())
            .putBoolean(KEY_ACTIVE, false)
            .putInt(KEY_PROGRESS, 0)
            .putString(KEY_STATUS, "대기 중")
            .putString(KEY_DETAIL, "선택한 파일을 순서대로 처리할 준비가 되었습니다.")
            .putString(KEY_COMPLETED, JSONArray().toString())
            .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
            .apply()
    }

    fun begin(context: Context) {
        val current = snapshot(context)
        val resetQueue = current.queue.map { it.copy(state = STATE_QUEUED) }
        prefs(context).edit()
            .putString(KEY_QUEUE, queueToJson(resetQueue).toString())
            .putBoolean(KEY_ACTIVE, true)
            .putInt(KEY_PROGRESS, 0)
            .putString(KEY_STATUS, "순차 처리 시작")
            .putString(KEY_DETAIL, "첫 번째 파일부터 처리합니다.")
            .putString(KEY_COMPLETED, JSONArray().toString())
            .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
            .apply()
    }

    fun markProcessing(context: Context, outputName: String) {
        val current = snapshot(context)
        val updated = current.queue.map {
            when {
                it.outputName == outputName -> it.copy(state = STATE_PROCESSING)
                it.state == STATE_PROCESSING -> it.copy(state = STATE_QUEUED)
                else -> it
            }
        }
        prefs(context).edit()
            .putString(KEY_QUEUE, queueToJson(updated).toString())
            .putBoolean(KEY_ACTIVE, true)
            .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
            .apply()
    }

    fun saveProgress(context: Context, progress: Int, status: String, detail: String) {
        prefs(context).edit()
            .putBoolean(KEY_ACTIVE, true)
            .putInt(KEY_PROGRESS, progress.coerceIn(0, 100))
            .putString(KEY_STATUS, status)
            .putString(KEY_DETAIL, detail)
            .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
            .apply()
    }

    fun markItemDone(
        context: Context,
        outputName: String,
        success: Boolean,
        completedLine: String
    ) {
        val current = snapshot(context)
        val updatedQueue = current.queue.map {
            if (it.outputName == outputName) {
                it.copy(state = if (success) STATE_DONE else STATE_FAILED)
            } else {
                it
            }
        }
        val completed = current.completedLines.toMutableList().apply { add(completedLine) }
        prefs(context).edit()
            .putString(KEY_QUEUE, queueToJson(updatedQueue).toString())
            .putString(KEY_COMPLETED, stringsToJson(completed).toString())
            .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
            .apply()
    }

    fun finish(context: Context, detail: String) {
        prefs(context).edit()
            .putBoolean(KEY_ACTIVE, false)
            .putInt(KEY_PROGRESS, 100)
            .putString(KEY_STATUS, "전체 처리 종료")
            .putString(KEY_DETAIL, detail)
            .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
            .apply()
    }

    fun fatal(context: Context, detail: String) {
        prefs(context).edit()
            .putBoolean(KEY_ACTIVE, false)
            .putString(KEY_STATUS, "대본 추출 실패")
            .putString(KEY_DETAIL, detail)
            .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
            .apply()
    }

    fun snapshot(context: Context): Snapshot {
        val p = prefs(context)
        return Snapshot(
            active = p.getBoolean(KEY_ACTIVE, false),
            progress = p.getInt(KEY_PROGRESS, 0),
            status = p.getString(KEY_STATUS, "대기 중").orEmpty(),
            detail = p.getString(KEY_DETAIL, "").orEmpty(),
            queue = jsonToQueue(p.getString(KEY_QUEUE, null)),
            completedLines = jsonToStrings(p.getString(KEY_COMPLETED, null)),
            updatedAt = p.getLong(KEY_UPDATED_AT, 0L)
        )
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun queueToJson(items: List<QueueItem>): JSONArray {
        val array = JSONArray()
        items.forEach { item ->
            array.put(
                JSONObject()
                    .put("uri", item.uri)
                    .put("originalName", item.originalName)
                    .put("sizeBytes", item.sizeBytes)
                    .put("durationMs", item.durationMs)
                    .put("outputName", item.outputName)
                    .put("state", item.state)
            )
        }
        return array
    }

    private fun jsonToQueue(raw: String?): List<QueueItem> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val o = array.getJSONObject(i)
                    add(
                        QueueItem(
                            uri = o.optString("uri"),
                            originalName = o.optString("originalName", "video_${i + 1}"),
                            sizeBytes = o.optLong("sizeBytes", -1L),
                            durationMs = o.optLong("durationMs", -1L),
                            outputName = o.optString("outputName", "T${(i + 1).toString().padStart(3, '0')}.txt"),
                            state = o.optString("state", STATE_QUEUED)
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    private fun stringsToJson(items: List<String>): JSONArray {
        val array = JSONArray()
        items.forEach { array.put(it) }
        return array
    }

    private fun jsonToStrings(raw: String?): List<String> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) add(array.optString(i))
            }
        }.getOrDefault(emptyList())
    }
}
