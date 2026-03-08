package com.mediarr.tv.player

import com.mediarr.tv.core.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ResumeDeciderTest {
  private val subject = ResumeDecider()

  @Test
  fun `prompts when resume position exists`() {
    val session = PlaybackSession(
      mediaId = 8,
      mediaType = MediaType.MOVIE,
      streamUrl = "http://example/stream",
      subtitles = emptyList(),
      resumePositionSeconds = 400,
      durationSeconds = 1000,
    )

    assertTrue(subject.shouldPrompt(session))
    assertEquals(400L, subject.startPosition(session, ResumeOption.RESUME))
    assertEquals(0L, subject.startPosition(session, ResumeOption.START_OVER))
  }

  @Test
  fun `does not prompt when no saved progress`() {
    val session = PlaybackSession(
      mediaId = 8,
      mediaType = MediaType.MOVIE,
      streamUrl = "http://example/stream",
      subtitles = emptyList(),
      resumePositionSeconds = 0,
      durationSeconds = 1000,
    )

    assertFalse(subject.shouldPrompt(session))
  }
}
