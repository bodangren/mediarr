package com.mediarr.tv.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MovieDto(
  val id: Int,
  val title: String,
  val year: Int? = null,
  val overview: String? = null,
  val posterUrl: String? = null,
  val backdropUrl: String? = null,
  val playbackState: PlaybackStateDto? = null,
)

@Serializable
data class SeriesDto(
  val id: Int,
  val title: String,
  val year: Int? = null,
  val overview: String? = null,
  val posterUrl: String? = null,
  val backdropUrl: String? = null,
  val statistics: SeriesStatisticsDto? = null,
)

@Serializable
data class SeriesDetailDto(
  val id: Int,
  val title: String,
  val year: Int? = null,
  val overview: String? = null,
  val posterUrl: String? = null,
  val backdropUrl: String? = null,
  val seasons: List<SeriesSeasonDto> = emptyList(),
  val statistics: SeriesStatisticsDto? = null,
)

@Serializable
data class SeriesSeasonDto(
  val seasonNumber: Int,
  val episodes: List<SeriesEpisodeDto> = emptyList(),
  val statistics: SeasonStatisticsDto? = null,
)

@Serializable
data class SeriesEpisodeDto(
  val id: Int,
  val title: String,
  val overview: String? = null,
  val seasonNumber: Int,
  val episodeNumber: Int,
  val path: String? = null,
  val hasFile: Boolean = false,
  val isDownloading: Boolean = false,
  val playbackState: PlaybackStateDto? = null,
)

@Serializable
data class PlaybackStateDto(
  val position: Long = 0L,
  val duration: Long = 0L,
  val progress: Double = 0.0,
  val isWatched: Boolean = false,
  @SerialName("lastWatched")
  val lastWatchedIso: String? = null,
)

@Serializable
data class SeriesStatisticsDto(
  val totalEpisodes: Int = 0,
  val episodesOnDisk: Int = 0,
  val episodesMissing: Int = 0,
  val episodesDownloading: Int = 0,
  val watchedEpisodes: Int = 0,
  val inProgressEpisodes: Int = 0,
)

@Serializable
data class SeasonStatisticsDto(
  val totalEpisodes: Int = 0,
  val episodesOnDisk: Int = 0,
  val episodesMissing: Int = 0,
  val episodesDownloading: Int = 0,
  val watchedEpisodes: Int = 0,
  val inProgressEpisodes: Int = 0,
)

@Serializable
data class PlaybackManifestDto(
  val streamUrl: String,
  val metadata: PlaybackMetadataDto,
  val subtitles: List<SubtitleTrackDto> = emptyList(),
  val resume: ResumeDto? = null,
)

@Serializable
data class PlaybackMetadataDto(
  val mediaType: String,
  val mediaId: Int,
  val title: String,
  val overview: String? = null,
  val posterUrl: String? = null,
  val backdropUrl: String? = null,
)

@Serializable
data class SubtitleTrackDto(
  val id: Int,
  val languageCode: String? = null,
  val isForced: Boolean = false,
  val isHi: Boolean = false,
  val format: String,
  val url: String,
)

@Serializable
data class ResumeDto(
  val userId: String,
  val position: Long,
  val duration: Long,
  val progress: Double,
  val isWatched: Boolean,
  @SerialName("lastWatched")
  val lastWatchedIso: String,
)

@Serializable
data class PlaybackProgressResponseDto(
  val mediaType: String,
  val mediaId: Int,
  val userId: String,
  val position: Long,
  val duration: Long,
  val progress: Double,
  val isWatched: Boolean,
  @SerialName("lastWatched")
  val lastWatchedIso: String,
)
