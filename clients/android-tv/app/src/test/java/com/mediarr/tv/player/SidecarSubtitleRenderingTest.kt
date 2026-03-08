package com.mediarr.tv.player

import androidx.media3.common.text.Cue
import androidx.media3.extractor.text.CuesWithTiming
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SidecarSubtitleRenderingTest {
  @Test
  fun `formats subtitle timing labels and clamps offsets`() {
    val state = SubtitleTimingState()
      .increment()
      .increment()
      .increment()

    assertEquals("+0.75s", state.label())

    val clamped = generateSequence(SubtitleTimingState()) { it.decrement() }
      .take(30)
      .last()

    assertEquals(-5_000L, clamped.offsetMs)
    assertEquals("-5.00s", clamped.label())
  }

  @Test
  fun `selects active cues using subtitle offset`() {
    val cues = listOf(
      CuesWithTiming(
        listOf(Cue.Builder().setText("Hello").build()),
        2_000_000L,
        1_000_000L,
      ),
    )

    assertTrue(activeSubtitleCues(cues, positionMs = 2_000L, offsetMs = 0L).isNotEmpty())
    assertTrue(activeSubtitleCues(cues, positionMs = 2_000L, offsetMs = 500L).isEmpty())

    val delayed = activeSubtitleCues(cues, positionMs = 2_500L, offsetMs = 500L)
    assertEquals("Hello", delayed.single().text)
  }
}
