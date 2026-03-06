package com.mediarr.tv.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

private val DarkColorScheme = darkColorScheme(
  primary = Color(0xFFF2C572),
  onPrimary = Color.Black,
  primaryContainer = Color(0xFF4A3620),
  onPrimaryContainer = Color.White,
  secondary = Color(0xFF9AD1C6),
  onSecondary = Color.Black,
  background = Color(0xFF0B1014),
  onBackground = Color(0xFFF7F1E6),
  surface = Color(0xFF162028),
  onSurface = Color(0xFFF7F1E6),
  surfaceVariant = Color(0xFF22313B),
  onSurfaceVariant = Color(0xFFB8C5CC),
  error = Color(0xFFE07A7A),
)

@Composable
fun MediarrTvTheme(
  content: @Composable () -> Unit,
) {
  MaterialTheme(
    colorScheme = DarkColorScheme,
    content = content,
  )
}
