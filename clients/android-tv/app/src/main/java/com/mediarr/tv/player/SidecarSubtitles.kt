package com.mediarr.tv.player

import androidx.media3.common.text.Cue
import androidx.media3.common.util.Consumer
import androidx.media3.extractor.text.CuesWithTiming
import androidx.media3.extractor.text.SubtitleParser
import androidx.media3.extractor.text.subrip.SubripParser
import androidx.media3.extractor.text.webvtt.WebvttParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

data class SubtitleTimingState(
  val offsetMs: Long = 0L,
  val stepMs: Long = 250L,
  val minOffsetMs: Long = -5_000L,
  val maxOffsetMs: Long = 5_000L,
) {
  fun increment(): SubtitleTimingState {
    return copy(offsetMs = (offsetMs + stepMs).coerceAtMost(maxOffsetMs))
  }

  fun decrement(): SubtitleTimingState {
    return copy(offsetMs = (offsetMs - stepMs).coerceAtLeast(minOffsetMs))
  }

  fun label(): String {
    val seconds = offsetMs.toDouble() / 1_000.0
    return "%+.2fs".format(seconds)
  }
}

data class ParsedSubtitleTrack(
  val subtitleId: Int,
  val cues: List<CuesWithTiming>,
)

internal fun activeSubtitleCues(
  cues: List<CuesWithTiming>,
  positionMs: Long,
  offsetMs: Long,
): List<Cue> {
  val effectivePositionUs = (positionMs - offsetMs) * 1_000L
  if (effectivePositionUs < 0L) {
    return emptyList()
  }

  return cues
    .filter { cue -> effectivePositionUs in cue.startTimeUs until cue.endTimeUs }
    .flatMap { cue -> cue.cues }
}

class SidecarSubtitleParser(
  private val client: OkHttpClient = OkHttpClient(),
) {
  suspend fun load(subtitle: PlaybackSubtitle): ParsedSubtitleTrack? {
    return withContext(Dispatchers.IO) {
      val request = Request.Builder()
        .url(subtitle.url)
        .build()
      runCatching {
        client.newCall(request).execute().use { response ->
          if (!response.isSuccessful) {
            return@use null
          }
          val body = response.body?.bytes() ?: return@use null
          parse(
            subtitleId = subtitle.id,
            format = subtitle.format,
            bytes = body,
          )
        }
      }.getOrNull()
    }
  }

  internal fun parse(
    subtitleId: Int,
    format: String,
    bytes: ByteArray,
  ): ParsedSubtitleTrack {
    val parser = subtitleParser(format)
    val parsed = mutableListOf<CuesWithTiming>()
    parser.parse(
      bytes,
      SubtitleParser.OutputOptions.allCues(),
      Consumer { cue -> parsed += cue },
    )
    return ParsedSubtitleTrack(
      subtitleId = subtitleId,
      cues = parsed.sortedBy { cue -> cue.startTimeUs },
    )
  }

  private fun subtitleParser(format: String): SubtitleParser {
    return when (format.lowercase()) {
      "vtt" -> WebvttParser()
      else -> SubripParser()
    }
  }
}
