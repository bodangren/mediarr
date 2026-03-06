package com.mediarr.tv.data.api

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class MediarrApiClientTest {
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
  fun `decodes movies list from envelope`() = runTest {
    server.enqueue(
      MockResponse()
        .setResponseCode(200)
        .setBody(
          """
          {"ok":true,"data":[{"id":1,"title":"Inception","year":2010,"overview":"Dreams"}]}
          """.trimIndent(),
        ),
    )

    val client = MediarrApiClient(baseUrlProvider = { server.url("/").toString().trimEnd('/') })
    val result = client.movies()

    assertEquals(1, result.size)
    assertEquals("Inception", result.first().title)
    assertEquals(2010, result.first().year)
  }

  @Test
  fun `aggregates paginated movie responses`() = runTest {
    server.enqueue(
      MockResponse()
        .setResponseCode(200)
        .setBody(
          """
          {"ok":true,"data":[{"id":1,"title":"Movie 1"}],"meta":{"page":1,"pageSize":1,"totalCount":2,"totalPages":2}}
          """.trimIndent(),
        ),
    )
    server.enqueue(
      MockResponse()
        .setResponseCode(200)
        .setBody(
          """
          {"ok":true,"data":[{"id":2,"title":"Movie 2"}],"meta":{"page":2,"pageSize":1,"totalCount":2,"totalPages":2}}
          """.trimIndent(),
        ),
    )

    val client = MediarrApiClient(baseUrlProvider = { server.url("/").toString().trimEnd('/') })

    val result = client.movies()

    assertEquals(listOf("Movie 1", "Movie 2"), result.map { it.title })
  }

  @Test
  fun `decodes playback manifest payload`() = runTest {
    server.enqueue(
      MockResponse()
        .setResponseCode(200)
        .setBody(
          """
          {
            "ok": true,
            "data": {
              "streamUrl": "/api/stream/9?type=movie",
              "metadata": {
                "mediaType": "MOVIE",
                "mediaId": 9,
                "title": "Movie 9"
              },
              "subtitles": [
                {"id": 11, "format": "srt", "url": "/api/playback/subtitles/11"}
              ],
              "resume": null
            }
          }
          """.trimIndent(),
        ),
    )

    val client = MediarrApiClient(baseUrlProvider = { server.url("/").toString().trimEnd('/') })
    val result = client.playbackManifest(9, "movie")

    assertTrue(result.streamUrl.contains("/api/stream/9"))
    assertEquals("Movie 9", result.metadata.title)
    assertEquals(1, result.subtitles.size)
  }

  @Test
  fun `proxies tvdb artwork urls through local api`() = runTest {
    val client = MediarrApiClient(baseUrlProvider = { "http://127.0.0.1:3001" })

    val result = client.imageProxyUrl("https://artworks.thetvdb.com/banners/posters/123.jpg")

    assertEquals(
      "http://127.0.0.1:3001/api/images/proxy?url=https%3A%2F%2Fartworks.thetvdb.com%2Fbanners%2Fposters%2F123.jpg",
      result,
    )
  }
}
