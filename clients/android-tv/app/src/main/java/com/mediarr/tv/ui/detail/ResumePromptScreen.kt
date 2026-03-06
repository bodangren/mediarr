package com.mediarr.tv.ui.detail

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text

@Composable
fun ResumePromptScreen(
  mediaTitle: String,
  positionSeconds: Long,
  onResume: () -> Unit,
  onStartOver: () -> Unit,
  onCancel: () -> Unit,
) {
  val resumeFocusRequester = remember { FocusRequester() }

  BackHandler(onBack = onCancel)

  LaunchedEffect(Unit) {
    runCatching { resumeFocusRequester.requestFocus() }
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
      .padding(36.dp),
    verticalArrangement = Arrangement.spacedBy(18.dp),
  ) {
    Text(
      text = "Resume Playback",
      style = MaterialTheme.typography.displaySmall,
      color = MaterialTheme.colorScheme.onBackground,
    )
    Text(
      text = mediaTitle,
      style = MaterialTheme.typography.titleLarge,
      color = MaterialTheme.colorScheme.onBackground,
    )
    Text(
      text = "Last position: ${positionSeconds}s",
      style = MaterialTheme.typography.bodyLarge,
      color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
      Button(
        onClick = onResume,
        colors = ButtonDefaults.colors(
          containerColor = MaterialTheme.colorScheme.primary,
          focusedContainerColor = MaterialTheme.colorScheme.secondary,
        ),
        modifier = Modifier.focusRequester(resumeFocusRequester),
      ) {
        Text(text = "Resume", color = MaterialTheme.colorScheme.onPrimary)
      }
      Button(
        onClick = onStartOver,
        colors = ButtonDefaults.colors(
          containerColor = MaterialTheme.colorScheme.surfaceVariant,
          focusedContainerColor = MaterialTheme.colorScheme.surface,
        ),
      ) {
        Text(text = "Start Over")
      }
      Button(
        onClick = onCancel,
        colors = ButtonDefaults.colors(
          containerColor = MaterialTheme.colorScheme.surfaceVariant,
          focusedContainerColor = MaterialTheme.colorScheme.surface,
        ),
      ) {
        Text(text = "Cancel")
      }
    }
  }
}
