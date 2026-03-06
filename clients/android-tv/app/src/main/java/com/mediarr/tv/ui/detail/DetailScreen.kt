package com.mediarr.tv.ui.detail

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.core.model.SeasonCard
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun DetailScreen(
  media: MediaCard,
  onPlay: (MediaCard) -> Unit,
  onBack: () -> Unit,
) {
  val listState = rememberLazyListState()
  val playFocusRequester = remember { FocusRequester() }
  val primaryAction = remember(media) { primaryActionFor(media) }
  var selectedSeasonIndex by rememberSaveable(media.id) { mutableIntStateOf(0) }
  val seasons = media.seasons
  val clampedSeasonIndex = selectedSeasonIndex.coerceIn(0, (seasons.lastIndex).coerceAtLeast(0))
  val selectedSeason = seasons.getOrNull(clampedSeasonIndex)

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
    state = listState,
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

    item(key = "status") {
      Text(
        text = statusSummary(media),
        style = MaterialTheme.typography.titleMedium,
        color = MaterialTheme.colorScheme.primary,
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
      FocusAwareRow {
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
              MediaType.SERIES -> "Play Next"
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

    if (media.mediaType == MediaType.SERIES) {
      item(key = "seasons-title") {
        Text(
          text = "Seasons",
          style = MaterialTheme.typography.titleLarge,
          color = MaterialTheme.colorScheme.onBackground,
        )
      }

      item(key = "seasons") {
        LazyRow(
          horizontalArrangement = Arrangement.spacedBy(12.dp),
          contentPadding = PaddingValues(vertical = 4.dp),
        ) {
          items(seasons, key = { season -> season.seasonNumber }) { season ->
            val seasonIndex = seasons.indexOfFirst { it.seasonNumber == season.seasonNumber }
            FocusAwareButton(
              text = "${season.title} • ${seasonSummary(season)}",
              selected = seasonIndex == clampedSeasonIndex,
              onClick = {
                selectedSeasonIndex = seasonIndex
              },
            )
          }
        }
      }

      item(key = "episodes-title") {
        Text(
          text = selectedSeason?.title?.let { "$it Episodes" } ?: "Playable Episodes",
          style = MaterialTheme.typography.titleLarge,
          color = MaterialTheme.colorScheme.onBackground,
        )
      }

      if (selectedSeason == null || selectedSeason.episodes.isEmpty()) {
        item(key = "episodes-empty") {
          Text(
            text = "No playable episodes are currently on disk for this season.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )
        }
      } else {
        items(
          items = selectedSeason.episodes,
          key = { episode -> episode.id },
        ) { episode ->
          FocusAwareButton(
            text = episode.title,
            supportingText = episodeStatusSummary(episode),
            onClick = { onPlay(episode) },
            modifier = Modifier.fillMaxWidth(),
          )
        }
      }
    }
  }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun FocusAwareRow(
  content: @Composable () -> Unit,
) {
  val requester = remember { BringIntoViewRequester() }
  val scope = rememberCoroutineScope()

  Row(
    horizontalArrangement = Arrangement.spacedBy(16.dp),
    modifier = Modifier
      .bringIntoViewRequester(requester)
      .onFocusChanged { state ->
        if (state.hasFocus) {
          scope.launch { requester.bringIntoView() }
        }
      },
  ) {
    content()
  }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun FocusAwareButton(
  text: String,
  supportingText: String? = null,
  selected: Boolean = false,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
) {
  val requester = remember { BringIntoViewRequester() }
  val scope = rememberCoroutineScope()

  Button(
    onClick = onClick,
    colors = ButtonDefaults.colors(
      containerColor = if (selected) {
        MaterialTheme.colorScheme.primaryContainer
      } else {
        MaterialTheme.colorScheme.surfaceVariant
      },
      focusedContainerColor = MaterialTheme.colorScheme.surface,
    ),
    modifier = modifier
      .bringIntoViewRequester(requester)
      .onFocusChanged { state ->
        if (state.isFocused) {
          scope.launch { requester.bringIntoView() }
        }
      },
  ) {
    Column(
      modifier = Modifier.fillMaxWidth(),
    ) {
      Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
      )
      if (!supportingText.isNullOrBlank()) {
        Text(
          text = supportingText,
          style = MaterialTheme.typography.bodySmall,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }
    }
  }
}

internal fun primaryActionFor(media: MediaCard): MediaCard? {
  return when {
    media.mediaType == MediaType.SERIES -> {
      media.seasons.firstNotNullOfOrNull { season -> season.episodes.firstOrNull() }
    }
    else -> media
  }
}

internal fun statusSummary(media: MediaCard): String {
  val playbackState = media.playbackState
  return when {
    playbackState?.isWatched == true -> "Played"
    playbackState != null && playbackState.positionSeconds > 0L -> {
      "In progress • Resume at ${formatPosition(playbackState.positionSeconds)}"
    }
    media.totalEpisodes > 0 -> {
      "${media.watchedEpisodes}/${media.totalEpisodes} played • ${media.inProgressEpisodes} in progress"
    }
    else -> "Not started"
  }
}

internal fun seasonSummary(season: SeasonCard): String {
  return when {
    season.totalEpisodes == 0 -> "No playable episodes"
    season.watchedEpisodes == season.totalEpisodes -> "Completed"
    season.inProgressEpisodes > 0 -> "${season.inProgressEpisodes} in progress"
    season.watchedEpisodes > 0 -> "${season.watchedEpisodes}/${season.totalEpisodes} played"
    else -> "${season.totalEpisodes} episodes"
  }
}

internal fun episodeStatusSummary(media: MediaCard): String {
  val playbackState = media.playbackState
  val episodeCode = if (media.seasonNumber != null && media.episodeNumber != null) {
    "S${media.seasonNumber.toString().padStart(2, '0')}E${media.episodeNumber.toString().padStart(2, '0')}"
  } else {
    media.subtitle ?: ""
  }

  val playbackSummary = when {
    playbackState?.isWatched == true -> "Played"
    playbackState != null && playbackState.positionSeconds > 0L -> "Resume at ${formatPosition(playbackState.positionSeconds)}"
    else -> "Unplayed"
  }

  return listOf(episodeCode, playbackSummary)
    .filter { it.isNotBlank() }
    .joinToString(" • ")
}

internal fun formatPosition(positionSeconds: Long): String {
  val minutes = positionSeconds / 60
  val seconds = positionSeconds % 60
  return "${minutes}:${seconds.toString().padStart(2, '0')}"
}
