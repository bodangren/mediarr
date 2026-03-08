package com.mediarr.tv

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.player.PlaybackSession
import com.mediarr.tv.ui.navigation.AppScreen
import org.junit.Assert.assertEquals
import org.junit.Test

class PlayerExitNavigationTest {
  @Test
  fun `player exit returns to detail for the source media`() {
    val returnTo = MediaCard(
      id = 7,
      title = "Series",
      mediaType = MediaType.SERIES,
    )
    val playerScreen = AppScreen.Player(
      media = MediaCard(
        id = 71,
        title = "Series S01E01 - Pilot",
        mediaType = MediaType.EPISODE,
        seasonNumber = 1,
        episodeNumber = 1,
      ),
      session = PlaybackSession(
        mediaId = 71,
        mediaType = MediaType.EPISODE,
        streamUrl = "http://example.test/stream.m3u8",
        subtitles = emptyList(),
        resumePositionSeconds = 0,
        durationSeconds = 1800,
      ),
      startPositionSeconds = 0,
      returnTo = returnTo,
    )

    assertEquals(AppScreen.Detail(returnTo), exitPlayerToDetail(playerScreen))
  }
}
