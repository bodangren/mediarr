package com.mediarr.tv.data.api

import java.io.IOException
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Request

class MediarrApiClient(
  private val baseUrlProvider: suspend () -> String,
  private val httpClient: OkHttpClient = OkHttpClient(),
  private val json: Json = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
  },
) {
  suspend fun movies(): List<MovieDto> {
    val data = getData("/api/movies?page=1&pageSize=40")
    return json.decodeFromJsonElement(ListSerializer(MovieDto.serializer()), data)
  }

  suspend fun series(): List<SeriesDto> {
    val data = getData("/api/series?page=1&pageSize=40")
    return json.decodeFromJsonElement(ListSerializer(SeriesDto.serializer()), data)
  }

  suspend fun movie(id: Int): MovieDto {
    val data = getData("/api/movies/$id")
    return json.decodeFromJsonElement(MovieDto.serializer(), data)
  }

  suspend fun seriesById(id: Int): SeriesDto {
    val data = getData("/api/series/$id")
    return json.decodeFromJsonElement(SeriesDto.serializer(), data)
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

  private suspend fun getData(path: String): JsonElement {
    val request = Request.Builder()
      .url(resolveUrl(path))
      .get()
      .build()

    return executeForData(request, path)
  }

  private suspend fun postData(path: String, jsonBody: String): JsonElement {
    val request = Request.Builder()
      .url(resolveUrl(path))
      .post(jsonBody.toRequestBody("application/json".toMediaType()))
      .build()

    return executeForData(request, path)
  }

  private suspend fun resolveUrl(path: String): String {
    val baseUrl = baseUrlProvider().trimEnd('/')
    return baseUrl + path
  }

  private fun executeForData(request: Request, path: String): JsonElement {
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

      root["data"] ?: throw IOException("Missing data envelope for $path")
    }
  }
}
