package com.mediarr.tv

import com.mediarr.tv.discovery.DiscoveryEndpoint
import org.junit.Assert.assertEquals
import org.junit.Test

class MediarrTvAppTest {
  @Test
  fun `maps loopback discovery host to emulator host when fallback is emulator`() {
    val result = effectiveBaseUrl(
      saved = DiscoveryEndpoint(
        host = "127.0.0.1",
        port = 3001,
        serviceName = "Mediarr",
      ),
      fallbackBaseUrl = "http://10.0.2.2:3001",
    )

    assertEquals("http://10.0.2.2:3001", result)
  }
}
