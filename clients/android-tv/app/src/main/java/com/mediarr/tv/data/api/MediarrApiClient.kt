package com.mediarr.tv.data.api

import java.io.IOException
import java.net.URLEncoder
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

private data class ApiEnvelope(
  val data: JsonElement,
  val meta: JsonObject? = null,
)

class MediarrApiClient(
  private val baseUrlProvider: suspend () -> String,
  private val httpClient: OkHttpClient = OkHttpClient(),
  private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
  private val json: Json = Json {
    ignoreUnknownKeys = true
  },
) {
  suspend fun movies(): List<MovieDto> {
    return getPaginatedList(
      path = "/api/movies",
      serializer = MovieDto.serializer(),
    )
  }

  suspend fun series(): List<SeriesDto> {
    return getPaginatedList(
      path = "/api/series",
      serializer = SeriesDto.serializer(),
    )
  }

  suspend fun movie(id: Int): MovieDto {
    val data = getData("/api/movies/$id")
    return json.decodeFromJsonElement(MovieDto.serializer(), data)
  }

  suspend fun seriesById(id: Int): SeriesDto {
    val data = getData("/api/series/$id")
    return json.decodeFromJsonElement(SeriesDto.serializer(), data)
  }

  suspend fun seriesDetail(id: Int): SeriesDetailDto {
    val data = getData("/api/series/$id")
    return json.decodeFromJsonElement(SeriesDetailDto.serializer(), data)
  }

  suspend fun playbackManifest(id: Int, type: String): PlaybackManifestDto {
    val data = getData("/api/playback/$id?type=$type")
    return json.decodeFromJsonElement(PlaybackManifestDto.serializer(), data)
  }

  suspend fun postProgress(
    mediaType: String,
    mediaId: Int,
    positionSeconds: Long,
    durationSeconds: Long,
    userId: String? = null,
  ): PlaybackProgressResponseDto {
    val payload = buildString {
      append("{")
      append("\"type\":\"").append(mediaType).append("\",")
      append("\"mediaId\":").append(mediaId).append(",")
      append("\"position\":").append(positionSeconds).append(",")
      append("\"duration\":").append(durationSeconds)
      if (!userId.isNullOrBlank()) {
        append(",\"userId\":\"").append(userId).append("\"")
      }
      append("}")
    }
    val data = postData("/api/playback/progress", payload)
    return json.decodeFromJsonElement(PlaybackProgressResponseDto.serializer(), data)
  }

  suspend fun imageProxyUrl(url: String?): String? {
    if (url.isNullOrBlank()) {
      return null
    }
    if (!url.contains("thetvdb.com", ignoreCase = true)) {
      return url
    }

    val baseUrl = baseUrlProvider().trimEnd('/')
    val encodedUrl = URLEncoder.encode(url, "UTF-8")
    return "$baseUrl/api/images/proxy?url=$encodedUrl"
  }

  private suspend fun <T> getPaginatedList(
    path: String,
    serializer: KSerializer<T>,
    pageSize: Int = 250,
  ): List<T> {
    val items = mutableListOf<T>()
    var page = 1

    while (true) {
      val envelope = getEnvelope("$path?page=$page&pageSize=$pageSize")
      val pageItems = json.decodeFromJsonElement(
        ListSerializer(serializer),
        envelope.data,
      )
      items += pageItems

      val totalPages = envelope.meta
        ?.get("totalPages")
        ?.jsonPrimitive
        ?.intOrNull
        ?: if (pageItems.size < pageSize) {
          page
        } else {
          page + 1
        }

      if (page >= totalPages || pageItems.isEmpty()) {
        break
      }
      page += 1
    }

    return items
  }

  private suspend fun getData(path: String): JsonElement {
    return getEnvelope(path).data
  }

  private suspend fun getEnvelope(path: String): ApiEnvelope {
    val request = Request.Builder()
      .url(resolveUrl(path))
      .get()
      .build()

    return withContext(ioDispatcher) {
      executeForEnvelope(request, path)
    }
  }

  private suspend fun postData(path: String, jsonBody: String): JsonElement {
    val request = Request.Builder()
      .url(resolveUrl(path))
      .post(jsonBody.toRequestBody("application/json".toMediaType()))
      .build()

    return withContext(ioDispatcher) {
      executeForEnvelope(request, path).data
    }
  }

  private suspend fun resolveUrl(path: String): String {
    val baseUrl = baseUrlProvider().trimEnd('/')
    return baseUrl + path
  }

  private fun executeForEnvelope(request: Request, path: String): ApiEnvelope {
    return httpClient.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        throw IOException("Request failed (${response.code}): $path")
      }

      val body = response.body?.string() ?: throw IOException("Empty response: $path")
      val root = json.parseToJsonElement(body).jsonObject
      val ok = root["ok"]?.jsonPrimitive?.booleanOrNull ?: false
      if (!ok) {
        throw IOException("API returned ok=false for $path")
      }

      ApiEnvelope(
        data = root["data"] ?: throw IOException("Missing data envelope for $path"),
        meta = root["meta"]?.jsonObject,
      )
    }
  }
}
