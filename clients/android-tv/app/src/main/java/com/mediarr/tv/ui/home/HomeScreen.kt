package com.mediarr.tv.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.Text
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.itemsIndexed as tvItemsIndexed
import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.ui.components.PosterCard

@Composable
fun HomeScreen(
  onSelectItem: (MediaCard) -> Unit,
  viewModel: HomeViewModel = viewModel(),
) {
  val rows by viewModel.rows.collectAsState()
  val listState = rememberLazyListState()

  LazyColumn(
    modifier = Modifier
      .fillMaxSize()
      .padding(horizontal = 24.dp, vertical = 16.dp),
    state = listState,
    verticalArrangement = Arrangement.spacedBy(24.dp),
  ) {
    itemsIndexed(rows, key = { _, row -> row.key }) { rowIndex, row ->
      Text(text = row.title)
      TvLazyRow(
        contentPadding = PaddingValues(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
      ) {
        tvItemsIndexed(row.items, key = { _, item -> item.id }) { itemIndex, item ->
          PosterCard(
            item = item,
            onFocused = { viewModel.updateFocus(rowIndex, itemIndex) },
            onClick = { onSelectItem(item) },
          )
        }
      }
    }
  }
}
