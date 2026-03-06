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
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Border
import androidx.tv.material3.Card
import androidx.tv.material3.CardDefaults
import androidx.tv.material3.MaterialTheme
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
      .onFocusChanged { state ->
        if (state.isFocused) {
          onFocused()
        }
      },
    scale = CardDefaults.scale(focusedScale = 1.08f),
    border = CardDefaults.border(
      focusedBorder = Border(
        border = androidx.compose.foundation.BorderStroke(
          width = 3.dp,
          color = MaterialTheme.colorScheme.primary,
        ),
        shape = RoundedCornerShape(16.dp),
      ),
    ),
    colors = CardDefaults.colors(
      containerColor = MaterialTheme.colorScheme.surfaceVariant,
      focusedContainerColor = MaterialTheme.colorScheme.surface,
    ),
  ) {
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(MaterialTheme.colorScheme.surfaceVariant)
        .clip(RoundedCornerShape(16.dp)),
    ) {
      AsyncImage(
        model = item.posterUrl ?: item.backdropUrl,
        contentDescription = item.title,
        contentScale = ContentScale.Crop,
        modifier = Modifier.fillMaxSize(),
      )

      val statusLabel = statusLabel(item)
      if (statusLabel != null) {
        Text(
          text = statusLabel,
          color = Color.White,
          fontSize = 11.sp,
          fontWeight = FontWeight.Bold,
          modifier = Modifier
            .align(Alignment.TopStart)
            .padding(10.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(Color.Black.copy(alpha = 0.82f))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        )
      }

      Column(
        modifier = Modifier
          .align(Alignment.BottomStart)
          .fillMaxWidth()
          .background(Color.Black.copy(alpha = 0.76f))
          .padding(horizontal = 12.dp, vertical = 10.dp),
      ) {
        Text(
          text = item.title,
          style = MaterialTheme.typography.titleSmall,
          color = Color.White,
          fontWeight = FontWeight.Bold,
          maxLines = 2,
          overflow = TextOverflow.Ellipsis,
        )
        if (!item.subtitle.isNullOrBlank()) {
          Text(
            text = item.subtitle,
            style = MaterialTheme.typography.labelMedium,
            color = Color(0xFFD0D0D0),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 4.dp),
          )
        }
        val progressText = progressText(item)
        if (progressText != null) {
          Text(
            text = progressText,
            style = MaterialTheme.typography.labelMedium,
            color = Color(0xFF8DE1FF),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 4.dp),
          )
        }
      }
    }
  }
}

internal fun statusLabel(item: MediaCard): String? {
  return when {
    item.playbackState?.isWatched == true -> "Watched"
    item.playbackState != null && item.playbackState.positionSeconds > 0L -> "Resume"
    item.inProgressEpisodes > 0 -> "${item.inProgressEpisodes} In Progress"
    item.totalEpisodes > 0 && item.watchedEpisodes == item.totalEpisodes -> "Completed"
    item.watchedEpisodes > 0 -> "${item.watchedEpisodes} Watched"
    else -> null
  }
}

internal fun progressText(item: MediaCard): String? {
  val state = item.playbackState
  return when {
    state?.isWatched == true -> "Played"
    state != null && state.positionSeconds > 0L -> "At ${state.positionSeconds / 60}m"
    item.totalEpisodes > 0 -> "${item.watchedEpisodes}/${item.totalEpisodes} played"
    else -> null
  }
}
