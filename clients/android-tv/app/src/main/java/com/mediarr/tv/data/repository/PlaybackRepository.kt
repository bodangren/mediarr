package com.mediarr.tv.data.repository

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.player.PlaybackSession

interface PlaybackRepository {
  suspend fun createSession(media: MediaCard): PlaybackSession
  suspend fun sendProgress(
    media: MediaCard,
    positionSeconds: Long,
    durationSeconds: Long,
  )
}
