package com.mediarr.tv.notification

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

/**
 * Subscribes to the Mediarr server SSE stream and dispatches notification
 * events to the provided [NotificationEventListener].
 *
 * Uses OkHttp's streaming response and manually parses the SSE wire format.
 * Automatically reconnects on connection failures with exponential back-off.
 */
class NotificationEventSource(
  private val baseUrlProvider: () -> String,
  private val listener: NotificationEventListener,
  private val httpClient: OkHttpClient = defaultHttpClient(),
  private val json: Json = Json { ignoreUnknownKeys = true },
) {
  private val scope = CoroutineScope(Dispatchers.IO)
  private var job: Job? = null

  fun start() {
    if (job?.isActive == true) return
    job = scope.launch { connectLoop() }
  }

  fun stop() {
    job?.cancel()
    job = null
  }

  private suspend fun connectLoop() {
    var attempt = 0
    while (currentCoroutineContext().isActive) {
      try {
        connect()
        attempt = 0 // reset on clean disconnect
      } catch (_: Exception) {
        // reconnect with capped exponential back-off
      }
      if (!currentCoroutineContext().isActive) break
      val delayMs = minOf(1_000L * (1L shl attempt.coerceAtMost(5)), 30_000L)
      attempt++
      delay(delayMs)
    }
  }

  private fun connect() {
    val url = "${baseUrlProvider().trimEnd('/')}/api/events/stream"
    val request = Request.Builder()
      .url(url)
      .header("Accept", "text/event-stream")
      .header("Cache-Control", "no-cache")
      .build()

    httpClient.newCall(request).execute().use { response ->
      if (!response.isSuccessful) return

      val body = response.body ?: return
      val reader = BufferedReader(InputStreamReader(body.byteStream(), Charsets.UTF_8))

      var currentEvent: String? = null
      var dataBuilder = StringBuilder()

      reader.forEachLine { line ->
        when {
          line.startsWith("event:") -> {
            currentEvent = line.removePrefix("event:").trim()
          }
          line.startsWith("data:") -> {
            dataBuilder.append(line.removePrefix("data:").trim())
          }
          line.isEmpty() -> {
            val event = currentEvent
            val data = dataBuilder.toString()
            if (event != null && data.isNotEmpty()) {
              dispatchEvent(event, data)
            }
            currentEvent = null
            dataBuilder = StringBuilder()
          }
        }
      }
    }
  }

  private fun dispatchEvent(event: String, rawData: String) {
    try {
      val obj = json.parseToJsonElement(rawData) as? JsonObject ?: return
      when (event) {
        "notification:grab" -> listener.onGrab(
          GrabNotificationEvent(
            title = obj["title"]?.jsonPrimitive?.content ?: return,
            indexer = obj["indexer"]?.jsonPrimitive?.takeIf { !it.isString || it.content != "null" }?.content,
            quality = obj["quality"]?.jsonPrimitive?.takeIf { !it.isString || it.content != "null" }?.content,
            size = obj["size"]?.jsonPrimitive?.longOrNull,
            sizeFormatted = obj["sizeFormatted"]?.jsonPrimitive?.takeIf { !it.isString || it.content != "null" }?.content,
          ),
        )
        "notification:download" -> listener.onDownload(
          DownloadNotificationEvent(
            title = obj["title"]?.jsonPrimitive?.content ?: return,
            mediaType = obj["mediaType"]?.jsonPrimitive?.content ?: "movie",
            isUpgrade = obj["isUpgrade"]?.jsonPrimitive?.booleanOrNull ?: false,
          ),
        )
        "notification:seriesAdd" -> listener.onSeriesAdd(
          SeriesAddNotificationEvent(
            title = obj["title"]?.jsonPrimitive?.content ?: return,
            year = obj["year"]?.jsonPrimitive?.intOrNull,
          ),
        )
        "notification:episodeDelete" -> listener.onEpisodeDelete(
          EpisodeDeleteNotificationEvent(
            seriesTitle = obj["seriesTitle"]?.jsonPrimitive?.content ?: return,
            episodeRef = obj["episodeRef"]?.jsonPrimitive?.content ?: "",
            episodeTitle = obj["episodeTitle"]?.jsonPrimitive?.takeIf { !it.isString || it.content != "null" }?.content,
            seasonNumber = obj["seasonNumber"]?.jsonPrimitive?.intOrNull,
            episodeNumber = obj["episodeNumber"]?.jsonPrimitive?.intOrNull,
          ),
        )
      }
    } catch (_: Exception) {
      // Ignore malformed events — do not crash the SSE loop
    }
  }

  companion object {
    private fun defaultHttpClient(): OkHttpClient = OkHttpClient.Builder()
      .readTimeout(0, TimeUnit.MILLISECONDS) // no timeout for long-polling SSE
      .connectTimeout(10, TimeUnit.SECONDS)
      .build()
  }
}

/** Callback interface for notification events received from the server. */
interface NotificationEventListener {
  fun onGrab(event: GrabNotificationEvent)
  fun onDownload(event: DownloadNotificationEvent)
  fun onSeriesAdd(event: SeriesAddNotificationEvent)
  fun onEpisodeDelete(event: EpisodeDeleteNotificationEvent)
}
