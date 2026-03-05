package com.mediarr.tv.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun ResumePromptScreen(
  positionSeconds: Long,
  onResume: () -> Unit,
  onStartOver: () -> Unit,
  onCancel: () -> Unit,
) {
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF0F0F0F))
      .padding(36.dp),
    verticalArrangement = Arrangement.spacedBy(16.dp),
  ) {
    Text(text = "Resume playback?", color = Color.White)
    Text(text = "Last position: ${positionSeconds}s", color = Color(0xFFBDBDBD))
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
      Button(onClick = onResume) { Text("Resume") }
      Button(onClick = onStartOver) { Text("Start Over") }
      Button(onClick = onCancel) { Text("Cancel") }
    }
  }
}
