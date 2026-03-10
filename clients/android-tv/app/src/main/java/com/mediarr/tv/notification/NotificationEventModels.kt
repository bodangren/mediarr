package com.mediarr.tv.notification

/**
 * Notification event data classes matching the SSE payloads published by
 * NotificationDispatchService on the server.
 */

data class GrabNotificationEvent(
  val title: String,
  val indexer: String?,
  val quality: String?,
  val size: Long?,
  val sizeFormatted: String?,
)

data class DownloadNotificationEvent(
  val title: String,
  val mediaType: String,
  val isUpgrade: Boolean,
)

data class SeriesAddNotificationEvent(
  val title: String,
  val year: Int?,
)

data class EpisodeDeleteNotificationEvent(
  val seriesTitle: String,
  val episodeRef: String,
  val episodeTitle: String?,
  val seasonNumber: Int?,
  val episodeNumber: Int?,
)
