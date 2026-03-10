package com.mediarr.tv.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Creates and displays Android system notifications for Mediarr server events.
 *
 * Manages a single notification channel "mediarr_push" and posts notifications
 * via [NotificationManagerCompat]. On Android 13+, posting requires the
 * POST_NOTIFICATIONS permission which must be declared in the manifest.
 */
class MediarrNotificationManager(private val context: Context) {

  init {
    createChannel()
  }

  private fun createChannel() {
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Mediarr Updates",
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      description = "Notifications for media grabs, downloads, and library changes"
    }
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(channel)
  }

  fun showGrab(event: GrabNotificationEvent) {
    val body = buildString {
      if (event.quality != null) append(event.quality)
      if (event.indexer != null) {
        if (isNotEmpty()) append(" · ")
        append(event.indexer)
      }
      if (event.sizeFormatted != null) {
        if (isNotEmpty()) append(" · ")
        append(event.sizeFormatted)
      }
    }.ifEmpty { "Release grabbed" }

    post(
      id = event.title.hashCode() xor 0x1000,
      title = "Grabbed: ${event.title}",
      body = body,
    )
  }

  fun showDownload(event: DownloadNotificationEvent) {
    val label = if (event.isUpgrade) "Upgraded" else "Downloaded"
    val typeLabel = if (event.mediaType == "movie") "Movie" else "Episode"
    post(
      id = event.title.hashCode() xor 0x2000,
      title = "$typeLabel $label",
      body = event.title,
    )
  }

  fun showSeriesAdd(event: SeriesAddNotificationEvent) {
    val body = if (event.year != null) "${event.title} (${event.year})" else event.title
    post(
      id = event.title.hashCode() xor 0x3000,
      title = "Series Added",
      body = body,
    )
  }

  fun showEpisodeDelete(event: EpisodeDeleteNotificationEvent) {
    post(
      id = (event.seriesTitle + event.episodeRef).hashCode() xor 0x4000,
      title = "Episode Deleted",
      body = "${event.seriesTitle} – ${event.episodeRef}",
    )
  }

  private fun post(id: Int, title: String, body: String) {
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setAutoCancel(true)
      .build()

    try {
      NotificationManagerCompat.from(context).notify(id, notification)
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS permission not granted — silently skip
    }
  }

  companion object {
    const val CHANNEL_ID = "mediarr_push"
  }
}
