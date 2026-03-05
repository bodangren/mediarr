package com.mediarr.tv.player

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
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.mediarr.tv.core.model.MediaCard

@androidx.annotation.OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
  media: MediaCard,
  streamUrl: String,
) {
  val playerHolder = remember { mutableStateOf<ExoPlayer?>(null) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color.Black),
  ) {
    AndroidView(
      modifier = Modifier
        .fillMaxSize()
        .height(480.dp),
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

  LaunchedEffect(streamUrl) {
    val mediaItem = MediaItem.Builder()
      .setUri(streamUrl)
      .setMimeType(MimeTypes.VIDEO_MP4)
      .build()

    playerHolder.value?.apply {
      setMediaItem(mediaItem)
      prepare()
      playWhenReady = true
    }
  }

  DisposableEffect(Unit) {
    onDispose {
      playerHolder.value?.release()
      playerHolder.value = null
    }
  }
}
