package com.mediarr.tv.data.repository

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.data.api.MediarrApiClient
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class RemotePlaybackRepositoryTest {
  private lateinit var server: MockWebServer

  @Before
  fun setUp() {
    server = MockWebServer()
    server.start()
  }

  @After
  fun tearDown() {
    server.shutdown()
  }

  @Test
  fun `creates episode playback sessions for episode cards`() = runTest {
    server.enqueue(
      MockResponse().setBody(
        """
        {"ok":true,"data":{
          "streamUrl":"/api/stream/21?type=episode",
          "metadata":{"mediaType":"EPISODE","mediaId":21,"title":"Series B S01E01 - Pilot"},
          "subtitles":[],
          "resume":null
        }}
        """.trimIndent(),
      ),
    )

    val baseUrl = server.url("/").toString().trimEnd('/')
    val repository = RemotePlaybackRepository(
      api = MediarrApiClient(baseUrlProvider = { baseUrl }),
      baseUrlProvider = { baseUrl },
    )

    val result = repository.createSession(
      MediaCard(
        id = 21,
        title = "Series B S01E01 - Pilot",
        subtitle = "S01E01",
        mediaType = MediaType.EPISODE,
      ),
    )

    assertTrue(result.streamUrl.contains("/api/stream/21?type=episode"))
  }
}
