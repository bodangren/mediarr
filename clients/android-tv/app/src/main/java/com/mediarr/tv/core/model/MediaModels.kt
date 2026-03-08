package com.mediarr.tv.core.model

enum class MediaType {
  MOVIE,
  SERIES,
  EPISODE,
}

data class PlaybackState(
  val positionSeconds: Long = 0L,
  val durationSeconds: Long = 0L,
  val progress: Double = 0.0,
  val isWatched: Boolean = false,
  val lastWatchedIso: String? = null,
)

data class SeasonCard(
  val seasonNumber: Int,
  val title: String,
  val episodes: List<MediaCard> = emptyList(),
  val totalEpisodes: Int = 0,
  val watchedEpisodes: Int = 0,
  val inProgressEpisodes: Int = 0,
)

data class MediaCard(
  val id: Int,
  val title: String,
  val subtitle: String? = null,
  val overview: String? = null,
  val posterUrl: String? = null,
  val backdropUrl: String? = null,
  val mediaType: MediaType,
  val seasonNumber: Int? = null,
  val episodeNumber: Int? = null,
  val playbackState: PlaybackState? = null,
  val episodes: List<MediaCard> = emptyList(),
  val seasons: List<SeasonCard> = emptyList(),
  val totalEpisodes: Int = 0,
  val watchedEpisodes: Int = 0,
  val inProgressEpisodes: Int = 0,
)

data class MediaRow(
  val key: String,
  val title: String,
  val items: List<MediaCard>,
)
