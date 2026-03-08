package com.mediarr.tv.ui.detail

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.core.model.PlaybackState
import com.mediarr.tv.core.model.SeasonCard
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DetailScreenLogicTest {
  @Test
  fun `primary action chooses first playable episode from first populated season`() {
    val expected = MediaCard(
      id = 101,
      title = "Series S01E01 - Pilot",
      mediaType = MediaType.EPISODE,
      seasonNumber = 1,
      episodeNumber = 1,
    )
    val media = MediaCard(
      id = 10,
      title = "Series",
      mediaType = MediaType.SERIES,
      seasons = listOf(
        SeasonCard(seasonNumber = 1, title = "Season 1", episodes = listOf(expected)),
        SeasonCard(seasonNumber = 2, title = "Season 2"),
      ),
    )

    assertEquals(expected, primaryActionFor(media))
  }

  @Test
  fun `primary action returns null for series with no playable episodes`() {
    val media = MediaCard(
      id = 10,
      title = "Series",
      mediaType = MediaType.SERIES,
      seasons = listOf(
        SeasonCard(seasonNumber = 1, title = "Season 1"),
      ),
    )

    assertNull(primaryActionFor(media))
  }

  @Test
  fun `status summary prefers resume text for in progress movie`() {
    val media = MediaCard(
      id = 1,
      title = "Movie",
      mediaType = MediaType.MOVIE,
      playbackState = PlaybackState(positionSeconds = 95, durationSeconds = 7200, progress = 0.01),
    )

    assertEquals("In progress • Resume at 1:35", statusSummary(media))
  }

  @Test
  fun `season and episode summaries surface watched and in progress state`() {
    val season = SeasonCard(
      seasonNumber = 1,
      title = "Season 1",
      totalEpisodes = 10,
      watchedEpisodes = 4,
      inProgressEpisodes = 2,
    )
    val episode = MediaCard(
      id = 22,
      title = "Series S01E02 - Second",
      mediaType = MediaType.EPISODE,
      seasonNumber = 1,
      episodeNumber = 2,
      playbackState = PlaybackState(positionSeconds = 600, durationSeconds = 1800, progress = 0.33),
    )

    assertEquals("2 in progress", seasonSummary(season))
    assertEquals("S01E02 • Resume at 10:00", episodeStatusSummary(episode))
  }
}
