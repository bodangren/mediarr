package com.mediarr.tv.data.repository

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.data.api.MediarrApiClient
import com.mediarr.tv.player.PlaybackSession
import com.mediarr.tv.player.PlaybackSessionBuilder

class RemotePlaybackRepository(
  private val api: MediarrApiClient,
  private val baseUrlProvider: suspend () -> String,
  private val sessionBuilder: PlaybackSessionBuilder = PlaybackSessionBuilder(),
) : PlaybackRepository {
  override suspend fun createSession(media: MediaCard): PlaybackSession {
    val baseUrl = baseUrlProvider()
    val queryType = if (media.mediaType == MediaType.MOVIE) "movie" else "episode"
    val manifest = api.playbackManifest(media.id, queryType)
    return sessionBuilder.fromManifest(
      baseUrl = baseUrl,
      mediaId = media.id,
      mediaType = media.mediaType,
      manifest = manifest,
    )
  }

  override suspend fun sendProgress(
    media: MediaCard,
    positionSeconds: Long,
    durationSeconds: Long,
  ) {
    val queryType = if (media.mediaType == MediaType.MOVIE) "movie" else "episode"
    api.postProgress(
      mediaType = queryType,
      mediaId = media.id,
      positionSeconds = positionSeconds,
      durationSeconds = durationSeconds,
    )
  }
}
