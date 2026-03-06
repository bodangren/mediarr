package com.mediarr.tv.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaRow
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

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(
        brush = Brush.verticalGradient(
          colors = listOf(
            Color(0xFF081017),
            MaterialTheme.colorScheme.background,
            Color(0xFF0F1A21),
          ),
        ),
      ),
  ) {
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .height(320.dp)
        .background(
          brush = Brush.radialGradient(
            colors = listOf(
              Color(0x55F2C572),
              Color(0x339AD1C6),
              Color.Transparent,
            ),
            radius = 900f,
          ),
        ),
    )

    LazyColumn(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 24.dp, vertical = 20.dp),
      state = listState,
      verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
      item(key = "hero") {
        HomeHero(
          onRefresh = { viewModel.refresh() },
          rowCount = uiState.rows.size,
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

      itemsIndexed(uiState.rows, key = { _, row -> row.key }) { rowIndex, row ->
        RailHeader(row = row)
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
}

@Composable
private fun HomeHero(
  onRefresh: () -> Unit,
  rowCount: Int,
) {
  Box(
    modifier = Modifier
      .fillMaxWidth()
      .background(
        brush = Brush.linearGradient(
          colors = listOf(
            Color(0xFF19252D),
            Color(0xFF0F161B),
            Color(0xFF17242B),
          ),
        ),
        shape = RoundedCornerShape(30.dp),
      )
      .border(
        width = 1.dp,
        color = Color.White.copy(alpha = 0.08f),
        shape = RoundedCornerShape(30.dp),
      )
      .padding(horizontal = 28.dp, vertical = 24.dp),
  ) {
    Box(
      modifier = Modifier
        .align(Alignment.TopEnd)
        .width(220.dp)
        .height(180.dp)
        .background(
          brush = Brush.radialGradient(
            colors = listOf(Color(0x55F2C572), Color.Transparent),
            radius = 420f,
          ),
          shape = RoundedCornerShape(28.dp),
        ),
    )

    Column(
      verticalArrangement = Arrangement.spacedBy(14.dp),
      modifier = Modifier.fillMaxWidth(0.72f),
    ) {
      Text(
        text = "LAN CINEMA",
        color = MaterialTheme.colorScheme.secondary,
        style = MaterialTheme.typography.labelMedium.copy(
          fontSize = 14.sp,
          fontWeight = FontWeight.SemiBold,
          letterSpacing = 2.sp,
        ),
      )
      Text(
        text = "Mediarr TV",
        style = MaterialTheme.typography.displayLarge,
        color = MaterialTheme.colorScheme.onBackground,
      )
      Text(
        text = "Fresh drops up top. Full library underneath. Resume points and season progress stay visible from the couch.",
        style = MaterialTheme.typography.bodyLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      Row(
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
      ) {
        HeroPill(text = "$rowCount rails live")
        HeroPill(text = "TV-first navigation")
        Button(
          onClick = onRefresh,
          colors = ButtonDefaults.colors(
            containerColor = MaterialTheme.colorScheme.primary,
            focusedContainerColor = MaterialTheme.colorScheme.secondary,
          ),
        ) {
          Text(
            text = "Refresh Library",
            color = MaterialTheme.colorScheme.onPrimary,
          )
        }
      }
    }
  }
}

@Composable
private fun HeroPill(text: String) {
  Box(
    modifier = Modifier
      .background(
        color = Color.White.copy(alpha = 0.06f),
        shape = RoundedCornerShape(999.dp),
      )
      .border(
        width = 1.dp,
        color = Color.White.copy(alpha = 0.08f),
        shape = RoundedCornerShape(999.dp),
      )
      .padding(horizontal = 12.dp, vertical = 7.dp),
  ) {
    Text(
      text = text,
      style = MaterialTheme.typography.labelMedium,
      color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
  }
}

@Composable
private fun RailHeader(row: MediaRow) {
  Column(
    verticalArrangement = Arrangement.spacedBy(4.dp),
  ) {
    Text(
      text = row.title,
      style = MaterialTheme.typography.titleLarge,
      color = MaterialTheme.colorScheme.onBackground,
    )
    Text(
      text = "${row.items.size} titles",
      style = MaterialTheme.typography.labelMedium,
      color = MaterialTheme.colorScheme.secondary,
    )
  }
}
