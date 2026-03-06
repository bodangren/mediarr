package com.mediarr.tv.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.Button
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.ui.components.PosterCard

@Composable
fun HomeScreen(
  onSelectItem: (MediaCard) -> Unit,
  viewModel: HomeViewModel = viewModel(),
) {
  val uiState by viewModel.uiState.collectAsState()
  val listState = rememberLazyListState()
  val firstCardFocusRequester = remember { FocusRequester() }

  LaunchedEffect(uiState.rows) {
    if (uiState.rows.isNotEmpty()) {
      runCatching { firstCardFocusRequester.requestFocus() }
    }
  }

  LazyColumn(
    modifier = Modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
      .padding(horizontal = 24.dp, vertical = 20.dp),
    state = listState,
    verticalArrangement = Arrangement.spacedBy(24.dp),
  ) {
    item(key = "title") {
      Text(
        text = "Mediarr TV",
        style = MaterialTheme.typography.displaySmall,
        color = MaterialTheme.colorScheme.onBackground,
      )
    }

    if (uiState.errorMessage != null) {
      item(key = "error") {
        Text(
          text = "Catalog fallback mode: ${uiState.errorMessage}",
          color = MaterialTheme.colorScheme.error,
          style = MaterialTheme.typography.bodyMedium,
        )
      }
    }

    if (uiState.isLoading) {
      item(key = "loading") {
        Text(
          text = "Loading library...",
          color = MaterialTheme.colorScheme.onBackground,
          style = MaterialTheme.typography.bodyLarge,
        )
      }
    }

    item(key = "refresh") {
      Button(onClick = { viewModel.refresh() }) {
        Text(text = "Refresh Library")
      }
    }

    itemsIndexed(uiState.rows, key = { _, row -> row.key }) { rowIndex, row ->
      Text(
        text = row.title,
        style = MaterialTheme.typography.titleLarge,
        color = MaterialTheme.colorScheme.onBackground,
      )
      LazyRow(
        contentPadding = PaddingValues(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
      ) {
        itemsIndexed(row.items, key = { _, item -> item.id }) { itemIndex, item ->
          PosterCard(
            item = item,
            onFocused = { viewModel.updateFocus(rowIndex, itemIndex) },
            onClick = { onSelectItem(item) },
            modifier = if (rowIndex == 0 && itemIndex == 0) {
              Modifier.focusRequester(firstCardFocusRequester)
            } else {
              Modifier
            },
          )
        }
      }
    }
  }
}
