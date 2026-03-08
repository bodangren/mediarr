package com.mediarr.tv.player

internal data class SubtitleOption(
  val subtitleId: Int?,
  val label: String,
)

internal fun subtitleOptions(session: PlaybackSession): List<SubtitleOption> {
  return buildList {
    add(SubtitleOption(subtitleId = null, label = "Subtitles Off"))
    addAll(session.subtitles.map { subtitle ->
      SubtitleOption(
        subtitleId = subtitle.id,
        label = subtitle.label,
      )
    })
  }
}

internal fun defaultSubtitleId(session: PlaybackSession): Int? {
  return session.subtitles.firstOrNull()?.id
}

internal fun resolveSubtitleSelection(
  selectedSubtitleId: Int?,
  session: PlaybackSession,
): Int? {
  if (selectedSubtitleId == null) {
    return null
  }

  return session.subtitles.firstOrNull { subtitle -> subtitle.id == selectedSubtitleId }?.id
    ?: defaultSubtitleId(session)
}
