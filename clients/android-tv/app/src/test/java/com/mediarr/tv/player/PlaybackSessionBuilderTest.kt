package com.mediarr.tv.player

import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.data.api.PlaybackManifestDto
import com.mediarr.tv.data.api.PlaybackMetadataDto
import com.mediarr.tv.data.api.ResumeDto
import com.mediarr.tv.data.api.SubtitleTrackDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackSessionBuilderTest {
  private val subject = PlaybackSessionBuilder()

  @Test
  fun `builds session with absolute stream and subtitle urls`() {
    val manifest = PlaybackManifestDto(
      streamUrl = "/api/stream/1?type=movie",
      metadata = PlaybackMetadataDto(mediaType = "MOVIE", mediaId = 1, title = "Movie"),
      subtitles = listOf(
        SubtitleTrackDto(
          id = 7,
          languageCode = "en",
          isForced = false,
          isHi = true,
          format = "srt",
          url = "/api/playback/subtitles/7",
        ),
      ),
      resume = ResumeDto(
        userId = "lan-default",
        position = 150,
        duration = 7200,
        progress = 0.02,
        isWatched = false,
        lastWatchedIso = "2026-03-05T00:00:00.000Z",
      ),
    )

    val result = subject.fromManifest(
      baseUrl = "http://192.168.1.10:3001",
      mediaId = 1,
      mediaType = MediaType.MOVIE,
      manifest = manifest,
    )

    assertTrue(result.streamUrl.startsWith("http://192.168.1.10:3001/"))
    assertEquals(1, result.subtitles.size)
    assertTrue(result.subtitles.first().url.contains("/api/playback/subtitles/7"))
    assertEquals(150L, result.resumePositionSeconds)
  }
}
