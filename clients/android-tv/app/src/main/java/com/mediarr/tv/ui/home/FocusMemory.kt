package com.mediarr.tv.ui.home

class FocusMemory {
  private val perRowSelection = mutableMapOf<Int, Int>()

  fun record(rowIndex: Int, itemIndex: Int) {
    perRowSelection[rowIndex] = itemIndex
  }

  fun recall(rowIndex: Int): Int = perRowSelection[rowIndex] ?: 0
}
