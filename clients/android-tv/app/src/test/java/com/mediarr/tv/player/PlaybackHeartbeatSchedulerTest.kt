package com.mediarr.tv.player

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PlaybackHeartbeatSchedulerTest {
  @Test
  fun `ticks at configured interval and flushes final tick on stop`() = runTest {
    var ticks = 0
    val scheduler = PlaybackHeartbeatScheduler(
      coroutineScope = this,
      intervalMillis = 1_000,
      onTick = { ticks++ },
    )

    scheduler.start()
    advanceTimeBy(2_100)
    scheduler.stop(flushFinalTick = true)

    assertEquals(3, ticks)
  }
}
