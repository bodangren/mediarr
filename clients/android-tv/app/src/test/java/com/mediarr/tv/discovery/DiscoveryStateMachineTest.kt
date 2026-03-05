package com.mediarr.tv.discovery

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DiscoveryStateMachineTest {
  private val subject = DiscoveryStateMachine()

  @Test
  fun `starts from idle and transitions to searching`() {
    assertEquals(DiscoveryState.Idle, subject.current())
    assertEquals(DiscoveryState.Searching, subject.onStart())
  }

  @Test
  fun `transitions to found when endpoint resolves`() {
    val endpoint = DiscoveryEndpoint(host = "192.168.1.15", port = 3001, serviceName = "Mediarr")

    subject.onStart()
    val state = subject.onEndpointResolved(endpoint)

    assertTrue(state is DiscoveryState.Found)
    assertEquals(endpoint, (state as DiscoveryState.Found).endpoint)
  }

  @Test
  fun `transitions to error and back to idle when stopped`() {
    subject.onStart()
    val error = subject.onError("network unavailable")

    assertEquals(DiscoveryState.Error("network unavailable"), error)
    assertEquals(DiscoveryState.Idle, subject.onStop())
  }
}
