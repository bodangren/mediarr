package com.mediarr.tv.player

import android.net.Uri
import android.view.ViewGroup
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.mediarr.tv.core.model.MediaCard
import kotlinx.coroutines.launch

@androidx.annotation.OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
  media: MediaCard,
  session: PlaybackSession,
  startPositionSeconds: Long,
  onProgress: suspend (positionSeconds: Long, durationSeconds: Long) -> Unit,
) {
  val scope = rememberCoroutineScope()
  val playerHolder = remember { mutableStateOf<ExoPlayer?>(null) }
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

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color.Black),
  ) {
    AndroidView(
      modifier = Modifier
        .fillMaxSize()
        .height(540.dp),
      factory = { context ->
        val player = ExoPlayer.Builder(context).build()
        playerHolder.value = player

        PlayerView(context).apply {
          useController = true
          layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
          )
          this.player = player
        }
      },
    )
    Text(
      text = media.title,
      color = Color.White,
      modifier = Modifier.padding(16.dp),
    )
  }

  LaunchedEffect(session.streamUrl) {
    val subtitleConfigs = session.subtitles.map { subtitle ->
      val mimeType = when (subtitle.format.lowercase()) {
        "vtt" -> MimeTypes.TEXT_VTT
        else -> MimeTypes.APPLICATION_SUBRIP
      }
      MediaItem.SubtitleConfiguration.Builder(Uri.parse(subtitle.url))
        .setMimeType(mimeType)
        .setLanguage(subtitle.languageCode)
        .setSelectionFlags(if (subtitle.id == session.subtitles.firstOrNull()?.id) C.SELECTION_FLAG_DEFAULT else 0)
        .build()
    }

    val mediaItem = MediaItem.Builder()
      .setUri(session.streamUrl)
      .setSubtitleConfigurations(subtitleConfigs)
      .build()

    playerHolder.value?.apply {
      setMediaItem(mediaItem)
      prepare()
      if (startPositionSeconds > 0L) {
        seekTo(startPositionSeconds * 1000L)
      }
      playWhenReady = true
    }

    heartbeatScheduler.start()
  }

  DisposableEffect(Unit) {
    onDispose {
      scope.launch {
        heartbeatScheduler.stop(flushFinalTick = true)
      }
      playerHolder.value?.release()
      playerHolder.value = null
    }
  }
}
