package com.mediarr.tv.ui.home

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaRow
import com.mediarr.tv.core.model.MediaType

object MockCatalog {
  fun rows(): List<MediaRow> = listOf(
    MediaRow(
      key = "recent-movies",
      title = "Recently Added Movies",
      items = (1..12).map { index ->
        MediaCard(
          id = index,
          title = "Movie Premiere #$index",
          subtitle = "Fresh import",
          overview = "Recently added movie item #$index.",
          mediaType = MediaType.MOVIE,
        )
      },
    ),
    MediaRow(
      key = "recent-series",
      title = "Recently Added Shows",
      items = (41..52).map { index ->
        MediaCard(
          id = index,
          title = "Series Arrival #$index",
          subtitle = "New episode pack",
          overview = "Recently added show item #$index.",
          mediaType = MediaType.SERIES,
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
