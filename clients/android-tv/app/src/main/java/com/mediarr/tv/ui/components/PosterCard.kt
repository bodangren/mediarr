package com.mediarr.tv.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mediarr.tv.core.model.MediaCard

@Composable
fun PosterCard(
  item: MediaCard,
  onFocused: () -> Unit,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
) {
  var isFocused by remember { mutableStateOf(false) }
  val scale by animateFloatAsState(if (isFocused) 1.07f else 1f, label = "posterScale")

  androidx.tv.material3.Card(
    onClick = onClick,
    modifier = modifier
      .scale(scale)
      .onFocusChanged {
        isFocused = it.isFocused
        if (it.isFocused) {
          onFocused()
        }
      }
      .focusable(),
  ) {
    Column(
      modifier = Modifier
        .height(260.dp)
        .fillMaxWidth()
        .background(Color(0xFF1B1B1B), RoundedCornerShape(12.dp))
        .border(
          width = if (isFocused) 2.dp else 0.dp,
          color = if (isFocused) Color(0xFF66BB6A) else Color.Transparent,
          shape = RoundedCornerShape(12.dp),
        )
        .padding(12.dp),
      verticalArrangement = Arrangement.Bottom,
    ) {
      Text(
        text = item.title,
        color = Color.White,
        fontWeight = FontWeight.SemiBold,
      )
      if (!item.subtitle.isNullOrBlank()) {
        Text(
          text = item.subtitle,
          color = Color(0xFFBDBDBD),
          modifier = Modifier.padding(top = 4.dp),
        )
      }
    }
  }
}
