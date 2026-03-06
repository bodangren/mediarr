package com.mediarr.tv.ui.components

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.core.model.PlaybackState
import org.junit.Assert.assertEquals
import org.junit.Test

class PosterCardTest {
  @Test
  fun `movie card shows resume label and progress text`() {
    val media = MediaCard(
      id = 1,
      title = "Movie",
      mediaType = MediaType.MOVIE,
      playbackState = PlaybackState(positionSeconds = 420, durationSeconds = 7200, progress = 0.05),
    )

    assertEquals("Resume", statusLabel(media))
    assertEquals("At 7m", progressText(media))
  }

  @Test
  fun `series card shows aggregate progress state`() {
    val media = MediaCard(
      id = 2,
      title = "Series",
      mediaType = MediaType.SERIES,
      totalEpisodes = 8,
      watchedEpisodes = 3,
      inProgressEpisodes = 1,
    )

    assertEquals("1 In Progress", statusLabel(media))
    assertEquals("3/8 played", progressText(media))
  }

  @Test
  fun `completed series card shows completed badge`() {
    val media = MediaCard(
      id = 3,
      title = "Finished Series",
      mediaType = MediaType.SERIES,
      totalEpisodes = 6,
      watchedEpisodes = 6,
    )

    assertEquals("Completed", statusLabel(media))
    assertEquals("6/6 played", progressText(media))
  }
}
