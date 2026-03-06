package com.mediarr.tv.ui.detail

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaType

@Composable
fun DetailScreen(
  media: MediaCard,
  onPlay: (MediaCard) -> Unit,
  onBack: () -> Unit,
) {
  val playFocusRequester = remember { FocusRequester() }
  val primaryAction = remember(media) {
    if (media.mediaType == MediaType.SERIES) {
      media.episodes.firstOrNull()
    } else {
      media
    }
  }

  BackHandler(onBack = onBack)

  LaunchedEffect(primaryAction?.id) {
    if (primaryAction != null) {
      runCatching { playFocusRequester.requestFocus() }
    }
  }

  LazyColumn(
    modifier = Modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
      .padding(horizontal = 32.dp, vertical = 24.dp),
    verticalArrangement = Arrangement.spacedBy(16.dp),
    contentPadding = PaddingValues(bottom = 32.dp),
  ) {
    item(key = "hero") {
      AsyncImage(
        model = media.backdropUrl ?: media.posterUrl,
        contentDescription = media.title,
        contentScale = ContentScale.Crop,
        modifier = Modifier
          .fillMaxWidth()
          .height(360.dp)
          .background(MaterialTheme.colorScheme.surfaceVariant),
      )
    }

    item(key = "title") {
      Text(
        text = media.title,
        style = MaterialTheme.typography.displayMedium,
        color = MaterialTheme.colorScheme.onBackground,
      )
    }

    if (!media.subtitle.isNullOrBlank()) {
      item(key = "subtitle") {
        Text(
          text = media.subtitle,
          style = MaterialTheme.typography.titleMedium,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }
    }

    if (!media.overview.isNullOrBlank()) {
      item(key = "overview") {
        Text(
          text = media.overview,
          style = MaterialTheme.typography.bodyLarge,
          color = MaterialTheme.colorScheme.onBackground,
        )
      }
    }

    item(key = "actions") {
      androidx.compose.foundation.layout.Row(
        horizontalArrangement = Arrangement.spacedBy(16.dp),
      ) {
        Button(
          onClick = { primaryAction?.let(onPlay) },
          enabled = primaryAction != null,
          colors = ButtonDefaults.colors(
            containerColor = MaterialTheme.colorScheme.primary,
            focusedContainerColor = MaterialTheme.colorScheme.secondary,
          ),
          modifier = Modifier.focusRequester(playFocusRequester),
        ) {
          Text(
            text = when (media.mediaType) {
              MediaType.SERIES -> "Play First Available"
              else -> "Play"
            },
            color = MaterialTheme.colorScheme.onPrimary,
          )
        }
        Button(
          onClick = onBack,
          colors = ButtonDefaults.colors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
            focusedContainerColor = MaterialTheme.colorScheme.surface,
          ),
        ) {
          Text(text = "Back")
        }
      }
    }

    if (media.mediaType == MediaType.SERIES && media.episodes.isEmpty()) {
      item(key = "episodes-empty") {
        Text(
          text = "No playable episodes are currently on disk for this series.",
          style = MaterialTheme.typography.bodyLarge,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }
    }

    if (media.episodes.isNotEmpty()) {
      item(key = "episodes-title") {
        Text(
          text = "Playable Episodes",
          style = MaterialTheme.typography.titleLarge,
          color = MaterialTheme.colorScheme.onBackground,
        )
      }

      items(
        items = media.episodes,
        key = { episode -> episode.id },
      ) { episode ->
        Button(
          onClick = { onPlay(episode) },
          colors = ButtonDefaults.colors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
            focusedContainerColor = MaterialTheme.colorScheme.surface,
          ),
          modifier = Modifier.fillMaxWidth(),
        ) {
          androidx.compose.foundation.layout.Column(
            modifier = Modifier.fillMaxWidth(),
          ) {
            Text(
              text = episode.title,
              style = MaterialTheme.typography.titleMedium,
            )
            if (!episode.subtitle.isNullOrBlank()) {
              Text(
                text = episode.subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
              )
            }
          }
        }
      }
    }
  }
}
