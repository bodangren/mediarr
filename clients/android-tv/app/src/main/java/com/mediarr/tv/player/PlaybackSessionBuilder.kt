package com.mediarr.tv.player

import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.data.api.PlaybackManifestDto

class PlaybackSessionBuilder {
  fun fromManifest(
    baseUrl: String,
    mediaId: Int,
    mediaType: MediaType,
    manifest: PlaybackManifestDto,
  ): PlaybackSession {
    val normalizedBase = baseUrl.trimEnd('/')
    val streamUrl = normalizeUrl(normalizedBase, manifest.streamUrl)
    val subtitles = manifest.subtitles.map { track ->
      PlaybackSubtitle(
        id = track.id,
        label = buildLabel(track.languageCode, track.isForced, track.isHi),
        languageCode = track.languageCode,
        format = track.format,
        url = normalizeUrl(normalizedBase, track.url),
      )
    }

    return PlaybackSession(
      mediaId = mediaId,
      mediaType = mediaType,
      streamUrl = streamUrl,
      subtitles = subtitles,
      resumePositionSeconds = manifest.resume?.position ?: 0,
      durationSeconds = manifest.resume?.duration ?: 0,
    )
  }

  private fun normalizeUrl(baseUrl: String, url: String): String {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url
    }
    return "$baseUrl/${url.trimStart('/')}"
  }

  private fun buildLabel(languageCode: String?, forced: Boolean, hi: Boolean): String {
    val parts = mutableListOf<String>()
    parts += if (languageCode.isNullOrBlank()) "Unknown" else languageCode.uppercase()
    if (forced) parts += "Forced"
    if (hi) parts += "HI"
    return parts.joinToString(" • ")
  }
}
