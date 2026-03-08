package com.mediarr.tv.player

import android.text.TextUtils
import androidx.media3.common.C
import androidx.media3.common.Format
import androidx.media3.common.MimeTypes
import androidx.media3.common.TrackGroup
import androidx.media3.common.Tracks
import io.mockk.every
import io.mockk.mockkStatic
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackAudioTrackSelectionTest {
  @Test
  fun `builds audio options from supported current tracks`() {
    mockkStatic(TextUtils::class)
    every { TextUtils.isEmpty(any()) } answers {
      firstArg<CharSequence?>().isNullOrEmpty()
    }

    val audioGroup = TrackGroup(
      "audio-main",
      Format.Builder()
        .setSampleMimeType(MimeTypes.AUDIO_AAC)
        .setLabel("English 5.1")
        .setChannelCount(6)
        .build(),
      Format.Builder()
        .setSampleMimeType(MimeTypes.AUDIO_AAC)
        .setLabel("French Stereo")
        .setChannelCount(2)
        .build(),
    )
    val videoGroup = TrackGroup(
      "video-main",
      Format.Builder()
        .setSampleMimeType(MimeTypes.VIDEO_H264)
        .build(),
    )
    val tracks = Tracks(
      listOf(
        Tracks.Group(
          audioGroup,
          true,
          intArrayOf(C.FORMAT_HANDLED, C.FORMAT_HANDLED),
          booleanArrayOf(true, false),
        ),
        Tracks.Group(
          videoGroup,
          true,
          intArrayOf(C.FORMAT_HANDLED),
          booleanArrayOf(true),
        ),
      ),
    )

    val result = audioTrackOptions(tracks)

    assertEquals(2, result.size)
    assertEquals("English 5.1 • 6ch", result[0].label)
    assertTrue(result[0].isSelected)
    assertEquals("French Stereo • 2ch", result[1].label)
    assertEquals(1, result[1].trackIndex)
  }
}
