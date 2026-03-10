package com.mediarr.tv.notification

import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationEventSourceTest {

  private lateinit var server: MockWebServer
  private lateinit var listener: NotificationEventListener

  @Before
  fun setUp() {
    server = MockWebServer()
    server.start()
    listener = mockk(relaxed = true)
  }

  @After
  fun tearDown() {
    server.shutdown()
  }

  private fun makeSseResponse(vararg events: String): MockResponse {
    val body = events.joinToString("") { it }
    return MockResponse()
      .setHeader("Content-Type", "text/event-stream")
      .setBody(body)
  }

  private fun sseFrame(event: String, data: String): String =
    "event: $event\ndata: $data\n\n"

  private fun makeSource(): NotificationEventSource {
    val httpClient = OkHttpClient.Builder().build()
    return NotificationEventSource(
      baseUrlProvider = { server.url("/").toString().trimEnd('/') },
      listener = listener,
      httpClient = httpClient,
    )
  }

  @Test
  fun `parses notification grab event and calls onGrab`() = runTest {
    val data = """{"title":"Movie","indexer":"NZBGeek","quality":"1080p","size":1073741824,"sizeFormatted":"1.00 GB"}"""
    server.enqueue(makeSseResponse(sseFrame("notification:grab", data)))

    val source = makeSource()
    source.start()
    Thread.sleep(500)
    source.stop()

    val slot = slot<GrabNotificationEvent>()
    verify { listener.onGrab(capture(slot)) }
    assertEquals("Movie", slot.captured.title)
    assertEquals("NZBGeek", slot.captured.indexer)
    assertEquals("1080p", slot.captured.quality)
    assertEquals("1.00 GB", slot.captured.sizeFormatted)
  }

  @Test
  fun `parses notification download event and calls onDownload`() = runTest {
    val data = """{"title":"Breaking Bad S01E01","mediaType":"episode","isUpgrade":false}"""
    server.enqueue(makeSseResponse(sseFrame("notification:download", data)))

    val source = makeSource()
    source.start()
    Thread.sleep(500)
    source.stop()

    val slot = slot<DownloadNotificationEvent>()
    verify { listener.onDownload(capture(slot)) }
    assertEquals("Breaking Bad S01E01", slot.captured.title)
    assertEquals("episode", slot.captured.mediaType)
    assertEquals(false, slot.captured.isUpgrade)
  }

  @Test
  fun `parses notification download event with isUpgrade true`() = runTest {
    val data = """{"title":"Movie 4K","mediaType":"movie","isUpgrade":true}"""
    server.enqueue(makeSseResponse(sseFrame("notification:download", data)))

    val source = makeSource()
    source.start()
    Thread.sleep(500)
    source.stop()

    val slot = slot<DownloadNotificationEvent>()
    verify { listener.onDownload(capture(slot)) }
    assertEquals(true, slot.captured.isUpgrade)
  }

  @Test
  fun `parses notification seriesAdd event and calls onSeriesAdd`() = runTest {
    val data = """{"title":"Breaking Bad","year":2008}"""
    server.enqueue(makeSseResponse(sseFrame("notification:seriesAdd", data)))

    val source = makeSource()
    source.start()
    Thread.sleep(500)
    source.stop()

    val slot = slot<SeriesAddNotificationEvent>()
    verify { listener.onSeriesAdd(capture(slot)) }
    assertEquals("Breaking Bad", slot.captured.title)
    assertEquals(2008, slot.captured.year)
  }

  @Test
  fun `parses notification episodeDelete event and calls onEpisodeDelete`() = runTest {
    val data = """{"seriesTitle":"Breaking Bad","episodeRef":"S03E10","seasonNumber":3,"episodeNumber":10}"""
    server.enqueue(makeSseResponse(sseFrame("notification:episodeDelete", data)))

    val source = makeSource()
    source.start()
    Thread.sleep(500)
    source.stop()

    val slot = slot<EpisodeDeleteNotificationEvent>()
    verify { listener.onEpisodeDelete(capture(slot)) }
    assertEquals("Breaking Bad", slot.captured.seriesTitle)
    assertEquals("S03E10", slot.captured.episodeRef)
    assertEquals(3, slot.captured.seasonNumber)
    assertEquals(10, slot.captured.episodeNumber)
  }

  @Test
  fun `ignores unknown event types without calling any listener`() = runTest {
    val data = """{"timestamp":"2026-03-10T00:00:00Z"}"""
    server.enqueue(makeSseResponse(sseFrame("heartbeat", data)))

    val source = makeSource()
    source.start()
    Thread.sleep(500)
    source.stop()

    verify(exactly = 0) { listener.onGrab(any()) }
    verify(exactly = 0) { listener.onDownload(any()) }
    verify(exactly = 0) { listener.onSeriesAdd(any()) }
    verify(exactly = 0) { listener.onEpisodeDelete(any()) }
  }

  @Test
  fun `handles malformed JSON gracefully without throwing`() = runTest {
    server.enqueue(makeSseResponse(sseFrame("notification:grab", "NOT VALID JSON")))

    val source = makeSource()
    source.start()
    Thread.sleep(500)
    source.stop()

    // No exception, no listener call
    verify(exactly = 0) { listener.onGrab(any()) }
  }

  @Test
  fun `parses multiple events from a single SSE response`() = runTest {
    val grabData = """{"title":"Movie","indexer":null,"quality":null,"size":null,"sizeFormatted":null}"""
    val downloadData = """{"title":"Movie","mediaType":"movie","isUpgrade":false}"""
    server.enqueue(
      makeSseResponse(
        sseFrame("notification:grab", grabData),
        sseFrame("notification:download", downloadData),
      ),
    )

    val source = makeSource()
    source.start()
    Thread.sleep(500)
    source.stop()

    verify(exactly = 1) { listener.onGrab(any()) }
    verify(exactly = 1) { listener.onDownload(any()) }
  }
}
