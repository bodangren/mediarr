package com.mediarr.tv.ui.detail

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.mediarr.tv.core.model.MediaCard

@Composable
fun DetailScreen(
  media: MediaCard,
  onPlay: (MediaCard) -> Unit,
  onBack: () -> Unit,
) {
  BackHandler(onBack = onBack)
  
  val playFocusRequester = remember { FocusRequester() }
  
  LaunchedEffect(Unit) {
    try {
      playFocusRequester.requestFocus()
    } catch (e: Exception) {
      // Ignore
    }
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF111111))
      .padding(32.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .height(300.dp)
        .background(Color(0xFF1F1F1F)),
    ) {
      AsyncImage(
        model = media.backdropUrl ?: media.posterUrl,
        contentDescription = media.title,
        contentScale = ContentScale.Crop,
        modifier = Modifier.fillMaxSize()
      )
    }
    Text(text = media.title, color = Color.White, fontWeight = FontWeight.Bold)
    if (!media.subtitle.isNullOrBlank()) {
      Text(text = media.subtitle, color = Color(0xFFBDBDBD))
    }
    if (!media.overview.isNullOrBlank()) {
      Text(text = media.overview, color = Color(0xFFE0E0E0))
    }
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
      Button(
        onClick = { onPlay(media) },
        colors = ButtonDefaults.colors(containerColor = Color(0xFF4CAF50), focusedContainerColor = Color(0xFF81C784)),
        modifier = Modifier.focusRequester(playFocusRequester)
      ) {
        Text(text = "Play")
      }
      Button(
        onClick = onBack,
        colors = ButtonDefaults.colors(containerColor = Color(0xFF555555), focusedContainerColor = Color(0xFF888888))
      ) {
        Text(text = "Back")
      }
    }
  }
}
