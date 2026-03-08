package com.mediarr.tv.data.repository

import com.mediarr.tv.data.api.MediarrApiClient
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
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
  fun `maps recent and library rows for movies and series`() = runTest {
    server.enqueue(
      MockResponse().setBody(
        """{"ok":true,"data":[{"id":1,"title":"Movie A","year":2024,"playbackState":{"position":180,"duration":7200,"progress":0.025,"isWatched":false,"lastWatched":"2026-03-06T00:00:00.000Z"}}]}""",
      ),
    )
    server.enqueue(
      MockResponse().setBody(
        """{"ok":true,"data":[{"id":2,"title":"Series B","year":2023,"statistics":{"totalEpisodes":8,"watchedEpisodes":3,"inProgressEpisodes":1}}]}""",
      ),
    )

    val client = MediarrApiClient(baseUrlProvider = { server.url("/").toString().trimEnd('/') })
    val repository = RemoteCatalogRepository(client)

    val rows = repository.homeRows()

    assertEquals(4, rows.size)
    assertEquals("Recently Added Movies", rows[0].title)
    assertEquals("Movie A", rows[0].items.first().title)
    assertEquals(180L, rows[0].items.first().playbackState?.positionSeconds)
    assertEquals("Recently Added Shows", rows[1].title)
    assertEquals("Series B", rows[1].items.first().title)
    assertEquals(3, rows[1].items.first().watchedEpisodes)
    assertEquals(1, rows[1].items.first().inProgressEpisodes)
    assertEquals("Movies", rows[2].title)
    assertEquals("TV Shows", rows[3].title)
  }

  @Test
  fun `maps playable series episodes from detail response into seasons`() = runTest {
    server.enqueue(
      MockResponse().setBody(
        """
        {"ok":true,"data":{
          "id":2,
          "title":"Series B",
          "overview":"Series overview",
          "posterUrl":"https://artworks.thetvdb.com/poster.jpg",
          "backdropUrl":"https://artworks.thetvdb.com/backdrop.jpg",
          "statistics":{"totalEpisodes":3,"watchedEpisodes":1,"inProgressEpisodes":1},
          "seasons":[
            {
              "seasonNumber":1,
              "statistics":{"totalEpisodes":2,"watchedEpisodes":1,"inProgressEpisodes":1},
              "episodes":[
                {"id":21,"title":"Pilot","seasonNumber":1,"episodeNumber":1,"hasFile":true,"playbackState":{"position":1800,"duration":1800,"progress":1.0,"isWatched":true,"lastWatched":"2026-03-06T00:00:00.000Z"}},
                {"id":22,"title":"Second","seasonNumber":1,"episodeNumber":2,"hasFile":true,"playbackState":{"position":600,"duration":1800,"progress":0.333,"isWatched":false,"lastWatched":"2026-03-06T00:00:00.000Z"}}
              ]
            },
            {
              "seasonNumber":2,
              "statistics":{"totalEpisodes":1,"watchedEpisodes":0,"inProgressEpisodes":0},
              "episodes":[
                {"id":31,"title":"Premiere","seasonNumber":2,"episodeNumber":1,"hasFile":true}
              ]
            }
          ]
        }}
        """.trimIndent(),
      ),
    )

    val client = MediarrApiClient(baseUrlProvider = { server.url("/").toString().trimEnd('/') })
    val repository = RemoteCatalogRepository(client)

    val result = repository.detail(
      com.mediarr.tv.core.model.MediaCard(
        id = 2,
        title = "Series B",
        mediaType = com.mediarr.tv.core.model.MediaType.SERIES,
      ),
    )

    assertEquals(3, result.episodes.size)
    assertEquals(2, result.seasons.size)
    assertEquals("Season 1", result.seasons.first().title)
    assertEquals(1, result.seasons.first().watchedEpisodes)
    assertEquals(1, result.seasons.first().inProgressEpisodes)
    assertTrue(result.seasons.first().episodes.first().title.contains("S01E01"))
    assertTrue(result.seasons.first().episodes.first().playbackState?.isWatched == true)
    assertFalse(result.seasons.first().episodes[1].playbackState?.isWatched == true)
    assertEquals(
      "${server.url("/").toString().trimEnd('/')}/api/images/proxy?url=https%3A%2F%2Fartworks.thetvdb.com%2Fposter.jpg",
      result.posterUrl,
    )
  }
}
