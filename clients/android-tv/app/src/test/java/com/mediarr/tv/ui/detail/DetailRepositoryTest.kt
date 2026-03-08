package com.mediarr.tv.ui.detail

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.data.api.MediarrApiClient
import com.mediarr.tv.data.repository.RemoteCatalogRepository
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class DetailRepositoryTest {
  private lateinit var server: MockWebServer

  @Before
  fun setup() {
    server = MockWebServer()
    server.start()
  }

  @After
  fun teardown() {
    server.shutdown()
  }

  @Test
  fun `uses playback manifest metadata when available`() = runTest {
    server.enqueue(MockResponse().setBody("""{"ok":true,"data":{"id":9,"title":"Movie Original","overview":"Old"}}"""))
    server.enqueue(
      MockResponse().setBody(
        """
        {"ok":true,"data":{
          "streamUrl":"/api/stream/9?type=movie",
          "metadata":{"mediaType":"MOVIE","mediaId":9,"title":"Movie Enriched","overview":"New overview"},
          "subtitles":[],
          "resume":null
        }}
        """.trimIndent(),
      ),
    )

    val client = MediarrApiClient(baseUrlProvider = { server.url("/").toString().trimEnd('/') })
    val repository = RemoteCatalogRepository(client)

    val result = repository.detail(
      MediaCard(
        id = 9,
        title = "Movie",
        mediaType = MediaType.MOVIE,
      ),
    )

    assertEquals("Movie Enriched", result.title)
    assertEquals("New overview", result.overview)
  }
}
