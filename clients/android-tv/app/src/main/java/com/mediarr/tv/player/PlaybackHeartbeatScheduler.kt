package com.mediarr.tv.player

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class PlaybackHeartbeatScheduler(
  private val coroutineScope: CoroutineScope,
  private val intervalMillis: Long = 30_000,
  private val onTick: suspend () -> Unit,
) {
  private var job: Job? = null

  fun start() {
    if (job != null) return
    job = coroutineScope.launch {
      while (isActive) {
        delay(intervalMillis)
        onTick()
      }
    }
  }

  suspend fun stop(flushFinalTick: Boolean) {
    val running = job
    job = null
    running?.cancel()
    if (flushFinalTick) {
      onTick()
    }
  }
}
