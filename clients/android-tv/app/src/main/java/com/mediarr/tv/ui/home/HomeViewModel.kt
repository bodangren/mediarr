package com.mediarr.tv.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaRow
import com.mediarr.tv.data.repository.CatalogRepository
import com.mediarr.tv.data.repository.MockCatalogRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class HomeViewModel : ViewModel() {
  private var repository: CatalogRepository = MockCatalogRepository
  private val focusMemory = FocusMemory()

  private val _uiState = MutableStateFlow(HomeUiState(isLoading = true))
  val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

  private val _focusState = MutableStateFlow(FocusState())
  val focusState: StateFlow<FocusState> = _focusState.asStateFlow()

  init {
    refresh()
  }

  fun attachRepository(newRepository: CatalogRepository) {
    if (newRepository === repository) {
      return
    }

    repository = newRepository
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
      runCatching { repository.homeRows() }
        .onSuccess { rows ->
          _uiState.value = HomeUiState(rows = rows, isLoading = false)
          val rowIndex = _focusState.value.rowIndex.coerceAtMost((rows.size - 1).coerceAtLeast(0))
          val itemIndex = focusMemory.recall(rowIndex)
          _focusState.value = FocusState(rowIndex = rowIndex, itemIndex = itemIndex)
        }
        .onFailure { error ->
          _uiState.value = HomeUiState(
            rows = MockCatalog.rows(),
            isLoading = false,
            errorMessage = error.message ?: "Failed to load catalog",
          )
        }
    }
  }

  fun updateFocus(rowIndex: Int, itemIndex: Int) {
    focusMemory.record(rowIndex, itemIndex)
    _focusState.value = FocusState(rowIndex = rowIndex, itemIndex = itemIndex)
  }

  fun selectedItemOrNull(): MediaCard? {
    val state = _focusState.value
    return _uiState.value.rows.getOrNull(state.rowIndex)?.items?.getOrNull(state.itemIndex)
  }

  suspend fun loadDetail(item: MediaCard): MediaCard = repository.detail(item)
}

data class HomeUiState(
  val rows: List<MediaRow> = emptyList(),
  val isLoading: Boolean = false,
  val errorMessage: String? = null,
)

data class FocusState(
  val rowIndex: Int = 0,
  val itemIndex: Int = 0,
)
