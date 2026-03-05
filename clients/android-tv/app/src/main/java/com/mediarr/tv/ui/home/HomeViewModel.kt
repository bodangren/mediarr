package com.mediarr.tv.ui.home

import androidx.lifecycle.ViewModel
import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaRow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class HomeViewModel : ViewModel() {
  private val _rows = MutableStateFlow(MockCatalog.rows())
  val rows: StateFlow<List<MediaRow>> = _rows.asStateFlow()

  private val _focusState = MutableStateFlow(FocusState())
  val focusState: StateFlow<FocusState> = _focusState.asStateFlow()

  fun updateFocus(rowIndex: Int, itemIndex: Int) {
    _focusState.value = FocusState(rowIndex = rowIndex, itemIndex = itemIndex)
  }

  fun selectedItemOrNull(): MediaCard? {
    val state = _focusState.value
    return _rows.value.getOrNull(state.rowIndex)?.items?.getOrNull(state.itemIndex)
  }
}

data class FocusState(
  val rowIndex: Int = 0,
  val itemIndex: Int = 0,
)
