package com.mediarr.tv.ui.navigation

import com.mediarr.tv.core.model.MediaCard

sealed interface AppScreen {
  data object Home : AppScreen
  data class Detail(val media: MediaCard) : AppScreen
  data class Player(val media: MediaCard) : AppScreen
}
