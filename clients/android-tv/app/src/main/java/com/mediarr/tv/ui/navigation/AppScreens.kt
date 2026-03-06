package com.mediarr.tv.ui.navigation

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.player.PlaybackSession

sealed interface AppScreen {
  data object Home : AppScreen
  data class Detail(val media: MediaCard) : AppScreen
  data class ResumePrompt(
    val media: MediaCard,
    val session: PlaybackSession,
    val returnTo: MediaCard,
  ) : AppScreen
  data class Player(
    val media: MediaCard,
    val session: PlaybackSession,
    val startPositionSeconds: Long,
    val returnTo: MediaCard,
  ) : AppScreen
}
