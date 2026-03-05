package com.mediarr.tv.ui.home

import org.junit.Assert.assertEquals
import org.junit.Test

class FocusMemoryTest {
  @Test
  fun `stores and recalls row-level selection`() {
    val memory = FocusMemory()

    memory.record(rowIndex = 0, itemIndex = 4)
    memory.record(rowIndex = 1, itemIndex = 2)

    assertEquals(4, memory.recall(0))
    assertEquals(2, memory.recall(1))
  }

  @Test
  fun `defaults to zero for unknown row`() {
    val memory = FocusMemory()

    assertEquals(0, memory.recall(42))
  }
}
