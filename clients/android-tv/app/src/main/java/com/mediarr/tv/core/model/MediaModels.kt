package com.mediarr.tv.core.model

enum class MediaType {
  MOVIE,
  SERIES,
  EPISODE,
}

data class MediaCard(
  val id: Int,
  val title: String,
  val subtitle: String? = null,
  val overview: String? = null,
  val posterUrl: String? = null,
  val backdropUrl: String? = null,
  val mediaType: MediaType,
)

data class MediaRow(
  val key: String,
  val title: String,
  val items: List<MediaCard>,
)
