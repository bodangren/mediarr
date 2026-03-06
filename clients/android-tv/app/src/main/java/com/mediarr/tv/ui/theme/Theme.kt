package com.mediarr.tv.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

private val DarkColorScheme = darkColorScheme(
  primary = Color(0xFF8FD3A8),
  onPrimary = Color.Black,
  primaryContainer = Color(0xFF294636),
  onPrimaryContainer = Color.White,
  secondary = Color(0xFFF0C674),
  onSecondary = Color.Black,
  background = Color(0xFF11161A),
  onBackground = Color(0xFFF2F4F5),
  surface = Color(0xFF1B2228),
  onSurface = Color(0xFFF2F4F5),
  surfaceVariant = Color(0xFF28323A),
  onSurfaceVariant = Color(0xFFD0D6DB),
  error = Color(0xFFCF6679),
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
