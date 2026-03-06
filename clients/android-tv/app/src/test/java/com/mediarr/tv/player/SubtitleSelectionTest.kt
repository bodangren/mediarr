package com.mediarr.tv.player

import com.mediarr.tv.core.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Test

class SubtitleSelectionTest {
  private val session = PlaybackSession(
    mediaId = 9,
    mediaType = MediaType.MOVIE,
    streamUrl = "http://example.test/stream.m3u8",
    subtitles = listOf(
      PlaybackSubtitle(
        id = 11,
        label = "EN",
        languageCode = "en",
        format = "srt",
        url = "http://example.test/subtitles/11",
      ),
      PlaybackSubtitle(
        id = 12,
        label = "TH",
        languageCode = "th",
        format = "srt",
        url = "http://example.test/subtitles/12",
      ),
      PlaybackSubtitle(
        id = 13,
        label = "ZH",
        languageCode = "zh",
        format = "srt",
        url = "http://example.test/subtitles/13",
      ),
    ),
    resumePositionSeconds = 0,
    durationSeconds = 7200,
  )

  @Test
  fun `uses first manifest subtitle as default`() {
    assertEquals(11, defaultSubtitleId(session))
  }

  @Test
  fun `builds off plus manifest ordered subtitle options`() {
    assertEquals(
      listOf("Subtitles Off", "EN", "TH", "ZH"),
      subtitleOptions(session).map { it.label },
    )
  }

  @Test
  fun `falls back to default subtitle when selection is unknown`() {
    assertEquals(11, resolveSubtitleSelection(selectedSubtitleId = 99, session = session))
  }

  @Test
  fun `keeps explicit off selection`() {
    assertEquals(null, resolveSubtitleSelection(selectedSubtitleId = null, session = session))
  }
}
