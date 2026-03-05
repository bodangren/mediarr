package com.mediarr.tv.player

import com.mediarr.tv.core.model.MediaType

data class PlaybackSubtitle(
  val id: Int,
  val label: String,
  val languageCode: String?,
  val format: String,
  val url: String,
)

data class PlaybackSession(
  val mediaId: Int,
  val mediaType: MediaType,
  val streamUrl: String,
  val subtitles: List<PlaybackSubtitle>,
  val resumePositionSeconds: Long,
  val durationSeconds: Long,
)

enum class ResumeOption {
  RESUME,
  START_OVER,
}
