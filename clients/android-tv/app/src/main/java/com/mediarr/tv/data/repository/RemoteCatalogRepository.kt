package com.mediarr.tv.data.repository

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaRow
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.data.api.MediarrApiClient

class RemoteCatalogRepository(private val api: MediarrApiClient) : CatalogRepository {
  override suspend fun homeRows(): List<MediaRow> {
    val movies = api.movies().map { dto ->
      MediaCard(
        id = dto.id,
        title = dto.title,
        subtitle = dto.year?.toString(),
        overview = dto.overview,
        posterUrl = dto.posterUrl,
        backdropUrl = dto.backdropUrl,
        mediaType = MediaType.MOVIE,
      )
    }

    val series = api.series().map { dto ->
      MediaCard(
        id = dto.id,
        title = dto.title,
        subtitle = dto.year?.toString(),
        overview = dto.overview,
        posterUrl = dto.posterUrl,
        backdropUrl = dto.backdropUrl,
        mediaType = MediaType.SERIES,
      )
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
      MediaType.MOVIE -> {
        val dto = api.movie(media.id)
        val manifest = api.playbackManifest(media.id, "movie")
        media.copy(
          title = manifest.metadata.title.ifBlank { dto.title },
          subtitle = dto.year?.toString(),
          overview = manifest.metadata.overview ?: dto.overview,
          posterUrl = manifest.metadata.posterUrl ?: dto.posterUrl,
          backdropUrl = manifest.metadata.backdropUrl ?: dto.backdropUrl,
        )
      }

      MediaType.SERIES -> {
        val dto = api.seriesById(media.id)
        media.copy(
          title = dto.title,
          subtitle = dto.year?.toString(),
          overview = dto.overview,
          posterUrl = dto.posterUrl,
          backdropUrl = dto.backdropUrl,
        )
      }

      MediaType.EPISODE -> media
    }
  }
}
