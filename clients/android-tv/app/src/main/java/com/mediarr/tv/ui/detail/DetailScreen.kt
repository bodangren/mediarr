package com.mediarr.tv.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mediarr.tv.core.model.MediaCard

@Composable
fun DetailScreen(
  media: MediaCard,
  onPlay: (MediaCard) -> Unit,
  onBack: () -> Unit,
) {
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
        .height(220.dp)
        .background(Color(0xFF1F1F1F)),
    )
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
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
      ) {
        Text(text = "Play")
      }
      Button(onClick = onBack) {
        Text(text = "Back")
      }
    }
  }
}
