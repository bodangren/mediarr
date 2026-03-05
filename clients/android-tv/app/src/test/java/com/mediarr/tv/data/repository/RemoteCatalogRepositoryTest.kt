package com.mediarr.tv.data.repository

import com.mediarr.tv.data.api.MediarrApiClient
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class RemoteCatalogRepositoryTest {
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
  fun `maps movies and series into home rows`() = runTest {
    server.enqueue(MockResponse().setBody("""{"ok":true,"data":[{"id":1,"title":"Movie A","year":2024}]}"""))
    server.enqueue(MockResponse().setBody("""{"ok":true,"data":[{"id":2,"title":"Series B","year":2023}]}"""))

    val client = MediarrApiClient(baseUrlProvider = { server.url("/").toString().trimEnd('/') })
    val repository = RemoteCatalogRepository(client)

    val rows = repository.homeRows()

    assertEquals(3, rows.size)
    assertEquals("Movies", rows[1].title)
    assertEquals("Movie A", rows[1].items.first().title)
    assertEquals("TV Shows", rows[2].title)
    assertEquals("Series B", rows[2].items.first().title)
  }
}
