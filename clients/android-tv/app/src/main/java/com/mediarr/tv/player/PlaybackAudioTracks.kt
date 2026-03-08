package com.mediarr.tv.player

import androidx.media3.common.C
import androidx.media3.common.Format
import androidx.media3.common.Player
import androidx.media3.common.TrackGroup
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks

data class AudioTrackOption(
  val mediaTrackGroup: TrackGroup,
  val trackIndex: Int,
  val label: String,
  val isSelected: Boolean,
)

internal fun audioTrackOptions(tracks: Tracks): List<AudioTrackOption> {
  return tracks.groups
    .filter { group -> group.type == C.TRACK_TYPE_AUDIO && group.isSupported }
    .flatMap { group ->
      (0 until group.length)
        .filter { trackIndex -> group.isTrackSupported(trackIndex) }
        .map { trackIndex ->
          AudioTrackOption(
            mediaTrackGroup = group.mediaTrackGroup,
            trackIndex = trackIndex,
            label = buildAudioTrackLabel(group.getTrackFormat(trackIndex)),
            isSelected = group.isTrackSelected(trackIndex),
          )
        }
    }
}

internal fun applyAudioTrackSelection(
  player: Player,
  option: AudioTrackOption,
) {
  player.trackSelectionParameters = player.trackSelectionParameters
    .buildUpon()
    .clearOverridesOfType(C.TRACK_TYPE_AUDIO)
    .setOverrideForType(TrackSelectionOverride(option.mediaTrackGroup, option.trackIndex))
    .build()
}

private fun buildAudioTrackLabel(format: Format): String {
  val parts = mutableListOf<String>()
  val label = format.label
  val language = format.language
  if (!label.isNullOrBlank()) {
    parts += label
  } else if (!language.isNullOrBlank()) {
    parts += language.uppercase()
  } else {
    parts += "Track"
  }

  if (format.channelCount > 0) {
    parts += "${format.channelCount}ch"
  }

  return parts.joinToString(" • ")
}
