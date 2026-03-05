package com.mediarr.tv.ui.home

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
  val focusRequester = remember { FocusRequester() }

  LaunchedEffect(uiState.rows) {
    if (uiState.rows.isNotEmpty()) {
      try {
        focusRequester.requestFocus()
      } catch (e: Exception) {
        // Ignore focus error
      }
    }
  }

  LazyColumn(
    modifier = Modifier
      .fillMaxSize()
      .padding(horizontal = 24.dp, vertical = 16.dp),
    state = listState,
    verticalArrangement = Arrangement.spacedBy(24.dp),
  ) {
    if (uiState.errorMessage != null) {
      item(key = "error") {
        Text(text = "Catalog fallback mode: ${uiState.errorMessage}")
      }
    }

    if (uiState.isLoading) {
      item(key = "loading") {
        Text(text = "Loading library...")
      }
    }

    item(key = "refresh") {
      Button(onClick = { viewModel.refresh() }) {
        Text(text = "Refresh")
      }
    }

    itemsIndexed(uiState.rows, key = { _, row -> row.key }) { rowIndex, row ->
      Text(text = row.title)
      LazyRow(
        contentPadding = PaddingValues(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
      ) {
        itemsIndexed(row.items, key = { _, item -> item.id }) { itemIndex, item ->
          PosterCard(
            item = item,
            onFocused = { viewModel.updateFocus(rowIndex, itemIndex) },
            onClick = { onSelectItem(item) },
            modifier = if (rowIndex == 0 && itemIndex == 0) Modifier.focusRequester(focusRequester) else Modifier
          )
        }
      }
    }
  }
}
