package com.mediarr.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Border
import androidx.tv.material3.Card
import androidx.tv.material3.CardDefaults
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.mediarr.tv.core.model.MediaCard

@Composable
fun PosterCard(
  item: MediaCard,
  onFocused: () -> Unit,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
) {
  Card(
    onClick = onClick,
    modifier = modifier
      .width(180.dp)
      .height(270.dp)
      .onFocusChanged {
        if (it.isFocused) {
          onFocused()
        }
      },
    scale = CardDefaults.scale(focusedScale = 1.08f),
    border = CardDefaults.border(
      focusedBorder = Border(
        border = androidx.compose.foundation.BorderStroke(3.dp, Color(0xFF66BB6A)),
        shape = RoundedCornerShape(12.dp)
      )
    ),
  ) {
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(Color(0xFF1B1B1B), RoundedCornerShape(12.dp))
        .clip(RoundedCornerShape(12.dp))
    ) {
      AsyncImage(
        model = item.posterUrl ?: item.backdropUrl,
        contentDescription = item.title,
        contentScale = ContentScale.Crop,
        modifier = Modifier.fillMaxSize()
      )

      Column(
        modifier = Modifier
          .align(Alignment.BottomStart)
          .fillMaxWidth()
          .background(Color.Black.copy(alpha = 0.6f))
          .padding(12.dp)
      ) {
        Text(
          text = item.title,
          color = Color.White,
          fontWeight = FontWeight.SemiBold,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
        if (!item.subtitle.isNullOrBlank()) {
          Text(
            text = item.subtitle,
            color = Color(0xFFBDBDBD),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 4.dp),
          )
        }
      }
    }
  }
}
