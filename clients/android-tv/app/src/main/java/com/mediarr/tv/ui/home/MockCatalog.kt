package com.mediarr.tv.ui.home

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaRow
import com.mediarr.tv.core.model.MediaType

object MockCatalog {
  fun rows(): List<MediaRow> = listOf(
    MediaRow(
      key = "recent",
      title = "Recently Added",
      items = (1..15).map { index ->
        MediaCard(
          id = index,
          title = "Recent #$index",
          subtitle = "New",
          overview = "Recently added media item #$index.",
          mediaType = if (index % 2 == 0) MediaType.MOVIE else MediaType.SERIES,
        )
      },
    ),
    MediaRow(
      key = "movies",
      title = "Movies",
      items = (101..120).map { index ->
        MediaCard(
          id = index,
          title = "Movie #$index",
          subtitle = "Action",
          overview = "Movie overview for item $index.",
          mediaType = MediaType.MOVIE,
        )
      },
    ),
    MediaRow(
      key = "series",
      title = "TV Shows",
      items = (201..220).map { index ->
        MediaCard(
          id = index,
          title = "Series #$index",
          subtitle = "Season 1",
          overview = "Series overview for item $index.",
          mediaType = MediaType.SERIES,
        )
      },
    ),
  )
}
