package com.mediarr.tv.player

import android.net.Uri
import android.view.KeyEvent as AndroidKeyEvent
import android.view.ViewGroup
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.mediarr.tv.core.model.MediaCard
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.isActive

private const val OVERLAY_AUTO_HIDE_MILLIS = 5_000L

@androidx.annotation.OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
  media: MediaCard,
  session: PlaybackSession,
  startPositionSeconds: Long,
  onProgress: suspend (positionSeconds: Long, durationSeconds: Long) -> Unit,
  onBack: () -> Unit,
  onEnded: () -> Unit,
) {
  val scope = rememberCoroutineScope()
  val playerHolder = remember { mutableStateOf<ExoPlayer?>(null) }
  val playerViewHolder = remember { mutableStateOf<PlayerView?>(null) }
  val latestOnEnded = rememberUpdatedState(onEnded)
  val subtitleOptions = remember(session.subtitles) { subtitleOptions(session) }
  var selectedSubtitleId by remember(session.subtitles) {
    mutableStateOf(defaultSubtitleId(session))
  }
  var subtitleTimingState by remember(session.mediaId) {
    mutableStateOf(SubtitleTimingState())
  }
  var parsedSubtitleTrack by remember(session.mediaId) {
    mutableStateOf<ParsedSubtitleTrack?>(null)
  }
  val subtitleParser = remember { SidecarSubtitleParser() }
  var overlayState by remember(session.mediaId) {
    mutableStateOf(PlaybackOverlayState.initial())
  }
  var isPlaying by remember { mutableStateOf(true) }
  var audioOptions by remember(session.mediaId) {
    mutableStateOf(emptyList<AudioTrackOption>())
  }

  val hiddenOverlayFocusRequester = remember { FocusRequester() }
  val playPauseFocusRequester = remember { FocusRequester() }
  val seekBackFocusRequester = remember { FocusRequester() }
  val seekForwardFocusRequester = remember { FocusRequester() }
  val settingsFocusRequester = remember { FocusRequester() }
  val subtitlesFocusRequester = remember { FocusRequester() }
  val audioFocusRequester = remember { FocusRequester() }
  val subtitleOptionFocusRequester = remember { FocusRequester() }

  val heartbeatScheduler = remember {
    PlaybackHeartbeatScheduler(
      coroutineScope = scope,
      onTick = {
        val player = playerHolder.value ?: return@PlaybackHeartbeatScheduler
        val position = (player.currentPosition / 1000L).coerceAtLeast(0L)
        val duration = (player.duration / 1000L).coerceAtLeast(0L)
        onProgress(position, duration)
      },
    )
  }

  BackHandler {
    val backResult = overlayState.onBack()
    overlayState = backResult.state
    if (backResult.exitPlayback) {
      onBack()
    }
  }

  LaunchedEffect(overlayState.isVisible) {
    if (!overlayState.isVisible) {
      runCatching { hiddenOverlayFocusRequester.requestFocus() }
    }
  }

  LaunchedEffect(overlayState.isVisible, overlayState.panel, overlayState.focusAnchor, subtitleOptions.size) {
    if (!overlayState.isVisible) {
      return@LaunchedEffect
    }

    val requester = when (overlayState.panel) {
      PlaybackOverlayPanel.CONTROLS -> when (overlayState.focusAnchor) {
        PlaybackOverlayAnchor.SEEK_BACK -> seekBackFocusRequester
        PlaybackOverlayAnchor.SEEK_FORWARD -> seekForwardFocusRequester
        PlaybackOverlayAnchor.SETTINGS -> settingsFocusRequester
        else -> playPauseFocusRequester
      }

      PlaybackOverlayPanel.SETTINGS -> when (overlayState.focusAnchor) {
        PlaybackOverlayAnchor.AUDIO -> audioFocusRequester
        else -> subtitlesFocusRequester
      }

      PlaybackOverlayPanel.SUBTITLES -> subtitleOptionFocusRequester
      PlaybackOverlayPanel.AUDIO -> audioFocusRequester
    }

    runCatching { requester.requestFocus() }
  }

  LaunchedEffect(overlayState.isVisible, overlayState.panel, overlayState.inactivityToken) {
    if (!overlayState.isVisible || overlayState.panel != PlaybackOverlayPanel.CONTROLS) {
      return@LaunchedEffect
    }

    val token = overlayState.inactivityToken
    delay(OVERLAY_AUTO_HIDE_MILLIS)
    overlayState = overlayState.onIdleTimeout(token)
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(Color.Black),
  ) {
    AndroidView(
      modifier = Modifier.fillMaxSize(),
      factory = { context ->
        val player = ExoPlayer.Builder(context).build()
        playerHolder.value = player

        PlayerView(context).apply {
          useController = false
          layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
          )
          isFocusable = true
          isFocusableInTouchMode = true
          this.player = player
          subtitleView?.setFractionalTextSize(0.055f)
          playerViewHolder.value = this
        }
      },
    )

    Box(
      modifier = Modifier
        .fillMaxSize()
        .focusRequester(hiddenOverlayFocusRequester)
        .focusable()
        .onPreviewKeyEvent { event ->
          if (overlayState.isVisible || event.type != KeyEventType.KeyDown) {
            return@onPreviewKeyEvent false
          }
          if (!isOverlayActivationKey(event.nativeKeyEvent.keyCode)) {
            return@onPreviewKeyEvent false
          }

          overlayState = overlayState.onUserInteraction()
          true
        },
    )

    if (overlayState.isVisible) {
      PlaybackOverlay(
        modifier = Modifier.align(Alignment.BottomCenter),
        mediaTitle = media.title,
        isPlaying = isPlaying,
        subtitleTimingState = subtitleTimingState,
        subtitleOptions = subtitleOptions,
        selectedSubtitleId = selectedSubtitleId,
        audioOptions = audioOptions,
        overlayState = overlayState,
        playPauseFocusRequester = playPauseFocusRequester,
        seekBackFocusRequester = seekBackFocusRequester,
        seekForwardFocusRequester = seekForwardFocusRequester,
        settingsFocusRequester = settingsFocusRequester,
        subtitlesFocusRequester = subtitlesFocusRequester,
        audioFocusRequester = audioFocusRequester,
        subtitleOptionFocusRequester = subtitleOptionFocusRequester,
        onInteraction = { anchor ->
          overlayState = overlayState.keepAlive(anchor)
        },
        onTogglePlayback = {
          val player = playerHolder.value ?: return@PlaybackOverlay
          overlayState = overlayState.keepAlive(PlaybackOverlayAnchor.PLAY_PAUSE)
          if (player.isPlaying) {
            player.pause()
          } else {
            player.play()
          }
        },
        onSeekBack = {
          val player = playerHolder.value ?: return@PlaybackOverlay
          overlayState = overlayState.keepAlive(PlaybackOverlayAnchor.SEEK_BACK)
          player.seekTo((player.currentPosition - 10_000L).coerceAtLeast(0L))
        },
        onSeekForward = {
          val player = playerHolder.value ?: return@PlaybackOverlay
          overlayState = overlayState.keepAlive(PlaybackOverlayAnchor.SEEK_FORWARD)
          val duration = player.duration.takeIf { it > 0L } ?: Long.MAX_VALUE
          player.seekTo((player.currentPosition + 30_000L).coerceAtMost(duration))
        },
        onOpenSettings = {
          overlayState = overlayState
            .keepAlive(PlaybackOverlayAnchor.SETTINGS)
            .openSettings()
        },
        onOpenSubtitles = {
          overlayState = overlayState
            .keepAlive(PlaybackOverlayAnchor.SUBTITLES)
            .openSubtitles()
        },
        onOpenAudio = {
          overlayState = overlayState
            .keepAlive(PlaybackOverlayAnchor.AUDIO)
            .openAudio()
        },
        onSelectSubtitle = { subtitleId ->
          selectedSubtitleId = subtitleId
          overlayState = overlayState.keepAlive(PlaybackOverlayAnchor.SUBTITLES)
        },
        onAdjustSubtitleEarlier = {
          subtitleTimingState = subtitleTimingState.decrement()
          overlayState = overlayState.keepAlive(PlaybackOverlayAnchor.SUBTITLE_TIMING)
        },
        onAdjustSubtitleLater = {
          subtitleTimingState = subtitleTimingState.increment()
          overlayState = overlayState.keepAlive(PlaybackOverlayAnchor.SUBTITLE_TIMING)
        },
        onSelectAudio = { option ->
          val player = playerHolder.value ?: return@PlaybackOverlay
          applyAudioTrackSelection(player, option)
          overlayState = overlayState.keepAlive(PlaybackOverlayAnchor.AUDIO)
          audioOptions = audioTrackOptions(player.currentTracks)
        },
      )
    }
  }

  LaunchedEffect(session.streamUrl) {
    val mediaItem = MediaItem.Builder()
      .setUri(session.streamUrl)
      .build()

    playerHolder.value?.apply {
      setMediaItem(mediaItem)
      prepare()
      if (startPositionSeconds > 0L) {
        seekTo(startPositionSeconds * 1_000L)
      }
      playWhenReady = true
    }

    heartbeatScheduler.start()
  }

  LaunchedEffect(selectedSubtitleId, session.subtitles) {
    val resolvedSubtitleId = resolveSubtitleSelection(selectedSubtitleId, session)
    val selectedSubtitle = session.subtitles.firstOrNull { subtitle ->
      subtitle.id == resolvedSubtitleId
    }
    if (selectedSubtitle == null) {
      parsedSubtitleTrack = null
      return@LaunchedEffect
    }

    parsedSubtitleTrack = subtitleParser.load(selectedSubtitle)
  }

  LaunchedEffect(parsedSubtitleTrack, subtitleTimingState, playerHolder.value, playerViewHolder.value) {
    val subtitleView = playerViewHolder.value?.subtitleView ?: return@LaunchedEffect
    val player = playerHolder.value ?: return@LaunchedEffect
    val parsedTrack = parsedSubtitleTrack
    if (parsedTrack == null) {
      subtitleView.setCues(emptyList())
      return@LaunchedEffect
    }

    while (isActive) {
      subtitleView.setCues(
        activeSubtitleCues(
          cues = parsedTrack.cues,
          positionMs = player.currentPosition.coerceAtLeast(0L),
          offsetMs = subtitleTimingState.offsetMs,
        ),
      )
      delay(250L)
    }
  }

  DisposableEffect(playerHolder.value) {
    val player = playerHolder.value
    val listener = object : Player.Listener {
      override fun onIsPlayingChanged(isPlayingValue: Boolean) {
        isPlaying = isPlayingValue
      }

      override fun onTracksChanged(tracks: androidx.media3.common.Tracks) {
        audioOptions = audioTrackOptions(tracks)
      }

      override fun onPlaybackStateChanged(playbackState: Int) {
        if (playbackState == Player.STATE_ENDED) {
          latestOnEnded.value()
        }
      }
    }
    player?.addListener(listener)

    onDispose {
      player?.removeListener(listener)
      scope.launch {
        heartbeatScheduler.stop(flushFinalTick = true)
      }
      playerViewHolder.value?.subtitleView?.setCues(emptyList())
      player?.release()
      playerHolder.value = null
      playerViewHolder.value = null
    }
  }
}

@Composable
private fun PlaybackOverlay(
  modifier: Modifier = Modifier,
  mediaTitle: String,
  isPlaying: Boolean,
  subtitleTimingState: SubtitleTimingState,
  subtitleOptions: List<SubtitleOption>,
  selectedSubtitleId: Int?,
  audioOptions: List<AudioTrackOption>,
  overlayState: PlaybackOverlayState,
  playPauseFocusRequester: FocusRequester,
  seekBackFocusRequester: FocusRequester,
  seekForwardFocusRequester: FocusRequester,
  settingsFocusRequester: FocusRequester,
  subtitlesFocusRequester: FocusRequester,
  audioFocusRequester: FocusRequester,
  subtitleOptionFocusRequester: FocusRequester,
  onInteraction: (PlaybackOverlayAnchor) -> Unit,
  onTogglePlayback: () -> Unit,
  onSeekBack: () -> Unit,
  onSeekForward: () -> Unit,
  onOpenSettings: () -> Unit,
  onOpenSubtitles: () -> Unit,
  onOpenAudio: () -> Unit,
  onSelectSubtitle: (Int?) -> Unit,
  onAdjustSubtitleEarlier: () -> Unit,
  onAdjustSubtitleLater: () -> Unit,
  onSelectAudio: (AudioTrackOption) -> Unit,
) {
  Column(
    modifier = modifier
      .fillMaxWidth()
      .background(Color.Black.copy(alpha = 0.82f))
      .padding(horizontal = 28.dp, vertical = 24.dp)
      .onPreviewKeyEvent { event ->
        if (event.type == KeyEventType.KeyDown && isOverlayActivationKey(event.nativeKeyEvent.keyCode)) {
          onInteraction(overlayState.focusAnchor)
        }
        false
      },
    verticalArrangement = Arrangement.spacedBy(18.dp),
  ) {
    Text(
      text = mediaTitle,
      style = MaterialTheme.typography.titleLarge,
      color = MaterialTheme.colorScheme.onSurface,
    )
    when (overlayState.panel) {
      PlaybackOverlayPanel.CONTROLS -> {
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
          Button(
            onClick = onSeekBack,
            colors = playbackButtonColors(),
            modifier = Modifier.focusRequester(seekBackFocusRequester),
          ) {
            Text(text = "-10s")
          }
          Button(
            onClick = onTogglePlayback,
            colors = playbackButtonColors(primary = true),
            modifier = Modifier.focusRequester(playPauseFocusRequester),
          ) {
            Text(text = if (isPlaying) "Pause" else "Play")
          }
          Button(
            onClick = onSeekForward,
            colors = playbackButtonColors(),
            modifier = Modifier.focusRequester(seekForwardFocusRequester),
          ) {
            Text(text = "+30s")
          }
          Button(
            onClick = onOpenSettings,
            colors = playbackButtonColors(),
            modifier = Modifier.focusRequester(settingsFocusRequester),
          ) {
            Text(text = "Settings")
          }
        }
      }

      PlaybackOverlayPanel.SETTINGS -> {
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
          Button(
            onClick = onOpenSubtitles,
            colors = playbackButtonColors(primary = true),
            modifier = Modifier.focusRequester(subtitlesFocusRequester),
          ) {
            Text(text = "Subtitles")
          }
          Button(
            onClick = onOpenAudio,
            colors = playbackButtonColors(),
            modifier = Modifier.focusRequester(audioFocusRequester),
          ) {
            Text(text = "Audio")
          }
        }
      }

      PlaybackOverlayPanel.SUBTITLES -> {
        Text(
          text = "Subtitles",
          style = MaterialTheme.typography.titleMedium,
          color = MaterialTheme.colorScheme.onSurface,
        )
        val currentSubtitleLabel = subtitleOptions
          .firstOrNull { option -> option.subtitleId == selectedSubtitleId }
          ?.label ?: "Subtitles Off"
        Text(
          text = "Current: $currentSubtitleLabel",
          style = MaterialTheme.typography.bodyMedium,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        LazyRow(
          contentPadding = PaddingValues(vertical = 4.dp),
          horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
          items(subtitleOptions, key = { option -> option.subtitleId ?: -1 }) { option ->
            val isSelected = option.subtitleId == selectedSubtitleId
            Button(
              onClick = { onSelectSubtitle(option.subtitleId) },
              colors = playbackButtonColors(primary = isSelected),
              modifier = if (option == subtitleOptions.firstOrNull()) {
                Modifier.focusRequester(subtitleOptionFocusRequester)
              } else {
                Modifier
              },
            ) {
              Text(text = option.label)
            }
          }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
          Button(
            onClick = onAdjustSubtitleEarlier,
            colors = playbackButtonColors(),
          ) {
            Text(text = "-0.25s")
          }
          Button(
            onClick = {},
            colors = playbackButtonColors(primary = true),
          ) {
            Text(text = subtitleTimingState.label())
          }
          Button(
            onClick = onAdjustSubtitleLater,
            colors = playbackButtonColors(),
          ) {
            Text(text = "+0.25s")
          }
        }
      }

      PlaybackOverlayPanel.AUDIO -> {
        Text(
          text = "Audio",
          style = MaterialTheme.typography.titleMedium,
          color = MaterialTheme.colorScheme.onSurface,
        )
        if (audioOptions.isEmpty()) {
          Button(
            onClick = { onInteraction(PlaybackOverlayAnchor.AUDIO) },
            colors = playbackButtonColors(),
            modifier = Modifier.focusRequester(audioFocusRequester),
          ) {
            Text(text = "No alternate audio tracks available")
          }
        } else {
          LazyRow(
            contentPadding = PaddingValues(vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
          ) {
            items(audioOptions, key = { option -> "${option.label}-${option.trackIndex}" }) { option ->
              Button(
                onClick = { onSelectAudio(option) },
                colors = playbackButtonColors(primary = option.isSelected),
                modifier = if (option == audioOptions.firstOrNull()) {
                  Modifier.focusRequester(audioFocusRequester)
                } else {
                  Modifier
                },
              ) {
                Text(text = option.label)
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun playbackButtonColors(
  primary: Boolean = false,
): androidx.tv.material3.ButtonColors {
  return ButtonDefaults.colors(
    containerColor = if (primary) {
      MaterialTheme.colorScheme.primary
    } else {
      MaterialTheme.colorScheme.surfaceVariant
    },
    focusedContainerColor = MaterialTheme.colorScheme.secondary,
  )
}

private fun isOverlayActivationKey(keyCode: Int): Boolean {
  return keyCode == AndroidKeyEvent.KEYCODE_DPAD_CENTER ||
    keyCode == AndroidKeyEvent.KEYCODE_DPAD_DOWN ||
    keyCode == AndroidKeyEvent.KEYCODE_DPAD_LEFT ||
    keyCode == AndroidKeyEvent.KEYCODE_DPAD_RIGHT ||
    keyCode == AndroidKeyEvent.KEYCODE_DPAD_UP ||
    keyCode == AndroidKeyEvent.KEYCODE_MEDIA_PLAY_PAUSE ||
    keyCode == AndroidKeyEvent.KEYCODE_ENTER
}
