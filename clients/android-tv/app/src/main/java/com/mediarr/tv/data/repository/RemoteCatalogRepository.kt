package com.mediarr.tv.data.repository

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaRow
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.core.model.PlaybackState
import com.mediarr.tv.core.model.SeasonCard
import com.mediarr.tv.data.api.MediarrApiClient
import com.mediarr.tv.data.api.MovieDto
import com.mediarr.tv.data.api.PlaybackStateDto
import com.mediarr.tv.data.api.SeriesDetailDto
import com.mediarr.tv.data.api.SeriesDto
import com.mediarr.tv.data.api.SeriesEpisodeDto
import com.mediarr.tv.data.api.SeriesSeasonDto

class RemoteCatalogRepository(private val api: MediarrApiClient) : CatalogRepository {
  override suspend fun homeRows(): List<MediaRow> {
    val movies = mutableListOf<MediaCard>()
    for (dto in api.movies()) {
      movies += mapMovie(dto)
    }

    val series = mutableListOf<MediaCard>()
    for (dto in api.series()) {
      series += mapSeries(dto)
    }

    val recentMovies = movies
      .sortedByDescending { it.id }
      .take(12)
    val recentSeries = series
      .sortedByDescending { it.id }
      .take(12)

    return listOf(
      MediaRow(
        key = "recent-movies",
        title = "Recently Added Movies",
        items = recentMovies,
      ),
      MediaRow(
        key = "recent-series",
        title = "Recently Added Shows",
        items = recentSeries,
      ),
      MediaRow(
        key = "movies",
        title = "Movies",
        items = movies,
      ),
      MediaRow(
        key = "series",
        title = "TV Shows",
        items = series,
      ),
    )
  }

  override suspend fun detail(media: MediaCard): MediaCard {
    return when (media.mediaType) {
      MediaType.MOVIE -> enrichMovie(media)
      MediaType.SERIES -> enrichSeries(media)
      MediaType.EPISODE -> media
    }
  }

  private suspend fun enrichMovie(media: MediaCard): MediaCard {
    val dto = api.movie(media.id)
    val manifest = api.playbackManifest(media.id, "movie")
    return media.copy(
      title = manifest.metadata.title.ifBlank { dto.title },
      subtitle = dto.year?.toString(),
      overview = manifest.metadata.overview ?: dto.overview,
      posterUrl = api.imageProxyUrl(manifest.metadata.posterUrl ?: dto.posterUrl),
      backdropUrl = api.imageProxyUrl(manifest.metadata.backdropUrl ?: dto.backdropUrl),
      playbackState = manifest.resume?.let {
        PlaybackState(
          positionSeconds = it.position,
          durationSeconds = it.duration,
          progress = it.progress,
          isWatched = it.isWatched,
          lastWatchedIso = it.lastWatchedIso,
        )
      } ?: media.playbackState ?: dto.playbackState?.toModel(),
    )
  }

  private suspend fun enrichSeries(media: MediaCard): MediaCard {
    val dto = api.seriesDetail(media.id)
    val seasons = dto.seasons
      .sortedBy { it.seasonNumber }
      .map { season -> mapSeason(dto, season) }
      .filter { it.episodes.isNotEmpty() }
    val playableEpisodes = seasons.flatMap { it.episodes }

    return media.copy(
      title = dto.title,
      subtitle = dto.year?.toString(),
      overview = dto.overview,
      posterUrl = api.imageProxyUrl(dto.posterUrl),
      backdropUrl = api.imageProxyUrl(dto.backdropUrl),
      episodes = playableEpisodes,
      seasons = seasons,
      totalEpisodes = dto.statistics?.totalEpisodes ?: seasons.sumOf { it.totalEpisodes },
      watchedEpisodes = dto.statistics?.watchedEpisodes ?: seasons.sumOf { it.watchedEpisodes },
      inProgressEpisodes = dto.statistics?.inProgressEpisodes ?: seasons.sumOf { it.inProgressEpisodes },
    )
  }

  private suspend fun mapMovie(dto: MovieDto): MediaCard {
    return MediaCard(
      id = dto.id,
      title = dto.title,
      subtitle = dto.year?.toString(),
      overview = dto.overview,
      posterUrl = api.imageProxyUrl(dto.posterUrl),
      backdropUrl = api.imageProxyUrl(dto.backdropUrl),
      mediaType = MediaType.MOVIE,
      playbackState = dto.playbackState?.toModel(),
    )
  }

  private suspend fun mapSeries(dto: SeriesDto): MediaCard {
    return MediaCard(
      id = dto.id,
      title = dto.title,
      subtitle = dto.year?.toString(),
      overview = dto.overview,
      posterUrl = api.imageProxyUrl(dto.posterUrl),
      backdropUrl = api.imageProxyUrl(dto.backdropUrl),
      mediaType = MediaType.SERIES,
      totalEpisodes = dto.statistics?.totalEpisodes ?: 0,
      watchedEpisodes = dto.statistics?.watchedEpisodes ?: 0,
      inProgressEpisodes = dto.statistics?.inProgressEpisodes ?: 0,
    )
  }

  private suspend fun mapSeason(
    series: SeriesDetailDto,
    season: SeriesSeasonDto,
  ): SeasonCard {
    val playableEpisodes = season.episodes
      .sortedWith(compareBy({ it.seasonNumber }, { it.episodeNumber }))
      .filter { it.hasFile || !it.path.isNullOrBlank() }
      .map { episode -> mapEpisode(series, episode) }

    return SeasonCard(
      seasonNumber = season.seasonNumber,
      title = if (season.seasonNumber == 0) {
        "Specials"
      } else {
        "Season ${season.seasonNumber}"
      },
      episodes = playableEpisodes,
      totalEpisodes = season.statistics?.totalEpisodes ?: playableEpisodes.size,
      watchedEpisodes = season.statistics?.watchedEpisodes ?: playableEpisodes.count { it.playbackState?.isWatched == true },
      inProgressEpisodes = season.statistics?.inProgressEpisodes
        ?: playableEpisodes.count { episode ->
          val state = episode.playbackState
          state != null && !state.isWatched && state.positionSeconds > 0L
        },
    )
  }

  private suspend fun mapEpisode(
    series: SeriesDetailDto,
    episode: SeriesEpisodeDto,
  ): MediaCard {
    val episodeCode = "S${episode.seasonNumber.toString().padStart(2, '0')}E${episode.episodeNumber.toString().padStart(2, '0')}"
    val title = if (episode.title.isBlank()) {
      "${series.title} $episodeCode"
    } else {
      "${series.title} $episodeCode - ${episode.title}"
    }

    return MediaCard(
      id = episode.id,
      title = title,
      subtitle = episodeCode,
      overview = episode.overview ?: series.overview,
      posterUrl = api.imageProxyUrl(series.posterUrl),
      backdropUrl = api.imageProxyUrl(series.backdropUrl),
      mediaType = MediaType.EPISODE,
      seasonNumber = episode.seasonNumber,
      episodeNumber = episode.episodeNumber,
      playbackState = episode.playbackState?.toModel(),
    )
  }
}

private fun PlaybackStateDto.toModel(): PlaybackState {
  return PlaybackState(
    positionSeconds = position,
    durationSeconds = duration,
    progress = progress,
    isWatched = isWatched,
    lastWatchedIso = lastWatchedIso,
  )
}
