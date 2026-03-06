package com.mediarr.tv.data.repository

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaRow
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.data.api.MediarrApiClient
import com.mediarr.tv.data.api.MovieDto
import com.mediarr.tv.data.api.SeriesDetailDto
import com.mediarr.tv.data.api.SeriesDto
import com.mediarr.tv.data.api.SeriesEpisodeDto

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

    return listOf(
      MediaRow(
        key = "recent",
        title = "Recently Added",
        items = (movies.take(10) + series.take(10)).sortedByDescending { it.id }.take(20),
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
    )
  }

  private suspend fun enrichSeries(media: MediaCard): MediaCard {
    val dto = api.seriesDetail(media.id)
    val playableEpisodes = mutableListOf<MediaCard>()
    for (season in dto.seasons.sortedBy { it.seasonNumber }) {
      for (episode in season.episodes.sortedWith(compareBy({ it.seasonNumber }, { it.episodeNumber }))) {
        if (episode.hasFile || !episode.path.isNullOrBlank()) {
          playableEpisodes += mapEpisode(dto, episode)
        }
      }
    }

    return media.copy(
      title = dto.title,
      subtitle = dto.year?.toString(),
      overview = dto.overview,
      posterUrl = api.imageProxyUrl(dto.posterUrl),
      backdropUrl = api.imageProxyUrl(dto.backdropUrl),
      episodes = playableEpisodes,
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
    )
  }
}
