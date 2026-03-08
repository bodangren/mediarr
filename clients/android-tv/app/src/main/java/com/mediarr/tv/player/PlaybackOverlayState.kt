package com.mediarr.tv.player

enum class PlaybackOverlayPanel {
  CONTROLS,
  SETTINGS,
  SUBTITLES,
  AUDIO,
}

enum class PlaybackOverlayAnchor {
  PLAY_PAUSE,
  SEEK_BACK,
  SEEK_FORWARD,
  SETTINGS,
  SUBTITLES,
  AUDIO,
  SUBTITLE_TIMING,
}

data class PlaybackOverlayState(
  val isVisible: Boolean,
  val panel: PlaybackOverlayPanel,
  val focusAnchor: PlaybackOverlayAnchor,
  val inactivityToken: Int,
) {
  fun onUserInteraction(
    anchor: PlaybackOverlayAnchor = focusAnchor,
  ): PlaybackOverlayState {
    return copy(
      isVisible = true,
      panel = PlaybackOverlayPanel.CONTROLS,
      focusAnchor = anchor,
      inactivityToken = inactivityToken + 1,
    )
  }

  fun keepAlive(
    anchor: PlaybackOverlayAnchor = focusAnchor,
  ): PlaybackOverlayState {
    return copy(
      isVisible = true,
      focusAnchor = anchor,
      inactivityToken = inactivityToken + 1,
    )
  }

  fun openSettings(): PlaybackOverlayState {
    return copy(isVisible = true, panel = PlaybackOverlayPanel.SETTINGS)
  }

  fun openSubtitles(): PlaybackOverlayState {
    return copy(isVisible = true, panel = PlaybackOverlayPanel.SUBTITLES)
  }

  fun openAudio(): PlaybackOverlayState {
    return copy(isVisible = true, panel = PlaybackOverlayPanel.AUDIO)
  }

  fun onIdleTimeout(token: Int): PlaybackOverlayState {
    if (!isVisible || panel != PlaybackOverlayPanel.CONTROLS || token != inactivityToken) {
      return this
    }

    return copy(isVisible = false)
  }

  fun onBack(): PlaybackOverlayBackResult {
    return when {
      !isVisible -> PlaybackOverlayBackResult(state = this, exitPlayback = true)
      panel == PlaybackOverlayPanel.SUBTITLES || panel == PlaybackOverlayPanel.AUDIO ->
        PlaybackOverlayBackResult(state = copy(panel = PlaybackOverlayPanel.SETTINGS))
      panel == PlaybackOverlayPanel.SETTINGS ->
        PlaybackOverlayBackResult(state = copy(panel = PlaybackOverlayPanel.CONTROLS))
      else -> PlaybackOverlayBackResult(
        state = copy(isVisible = false),
        exitPlayback = false,
      )
    }
  }

  companion object {
    fun initial(
      isVisible: Boolean = true,
      focusAnchor: PlaybackOverlayAnchor = PlaybackOverlayAnchor.PLAY_PAUSE,
    ): PlaybackOverlayState {
      return PlaybackOverlayState(
        isVisible = isVisible,
        panel = PlaybackOverlayPanel.CONTROLS,
        focusAnchor = focusAnchor,
        inactivityToken = 0,
      )
    }
  }
}

data class PlaybackOverlayBackResult(
  val state: PlaybackOverlayState,
  val exitPlayback: Boolean = false,
)
