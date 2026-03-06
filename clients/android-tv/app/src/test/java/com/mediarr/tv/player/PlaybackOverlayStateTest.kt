package com.mediarr.tv.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackOverlayStateTest {
  @Test
  fun `starts visible on controls panel with play pause anchor`() {
    val state = PlaybackOverlayState.initial()

    assertTrue(state.isVisible)
    assertEquals(PlaybackOverlayPanel.CONTROLS, state.panel)
    assertEquals(PlaybackOverlayAnchor.PLAY_PAUSE, state.focusAnchor)
    assertEquals(0, state.inactivityToken)
  }

  @Test
  fun `user interaction shows controls and advances inactivity token`() {
    val state = PlaybackOverlayState.initial(isVisible = false)

    val updated = state.onUserInteraction(anchor = PlaybackOverlayAnchor.SEEK_FORWARD)

    assertTrue(updated.isVisible)
    assertEquals(PlaybackOverlayPanel.CONTROLS, updated.panel)
    assertEquals(PlaybackOverlayAnchor.SEEK_FORWARD, updated.focusAnchor)
    assertEquals(1, updated.inactivityToken)
  }

  @Test
  fun `idle timeout hides overlay only when token matches current controls state`() {
    val state = PlaybackOverlayState.initial()
      .onUserInteraction()
      .openSettings()

    val unchanged = state.onIdleTimeout(token = 1)
    assertTrue(unchanged.isVisible)
    assertEquals(PlaybackOverlayPanel.SETTINGS, unchanged.panel)

    val controlsState = state.onBack().state
    val hidden = controlsState.onIdleTimeout(token = controlsState.inactivityToken)

    assertFalse(hidden.isVisible)
    assertEquals(PlaybackOverlayPanel.CONTROLS, hidden.panel)
  }

  @Test
  fun `back unwinds nested panels before exiting playback`() {
    val subtitleState = PlaybackOverlayState.initial()
      .openSettings()
      .openSubtitles()

    val fromSubtitles = subtitleState.onBack()
    assertFalse(fromSubtitles.exitPlayback)
    assertEquals(PlaybackOverlayPanel.SETTINGS, fromSubtitles.state.panel)

    val fromSettings = fromSubtitles.state.onBack()
    assertFalse(fromSettings.exitPlayback)
    assertEquals(PlaybackOverlayPanel.CONTROLS, fromSettings.state.panel)

    val hidden = fromSettings.state.onIdleTimeout(token = fromSettings.state.inactivityToken)
    val fromHidden = hidden.onBack()
    assertTrue(fromHidden.exitPlayback)
  }

  @Test
  fun `opening audio keeps overlay visible and preserves anchor when returning`() {
    val state = PlaybackOverlayState.initial()
      .onUserInteraction(anchor = PlaybackOverlayAnchor.SETTINGS)
      .openSettings()
      .openAudio()

    assertTrue(state.isVisible)
    assertEquals(PlaybackOverlayPanel.AUDIO, state.panel)

    val backToSettings = state.onBack()
    assertEquals(PlaybackOverlayPanel.SETTINGS, backToSettings.state.panel)

    val backToControls = backToSettings.state.onBack()
    assertEquals(PlaybackOverlayPanel.CONTROLS, backToControls.state.panel)
    assertEquals(PlaybackOverlayAnchor.SETTINGS, backToControls.state.focusAnchor)
  }
}
