package com.mediarr.tv.ui.home

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class HomeViewModelTest {
  @Test
  fun `loads three default rails with media data`() {
    val subject = HomeViewModel()

    val rows = subject.rows.value
    assertEquals(3, rows.size)
    assertEquals("Recently Added", rows[0].title)
    assertEquals("Movies", rows[1].title)
    assertEquals("TV Shows", rows[2].title)
  }

  @Test
  fun `updates selected item when focus changes`() {
    val subject = HomeViewModel()

    subject.updateFocus(rowIndex = 1, itemIndex = 3)

    val selected = subject.selectedItemOrNull()
    assertNotNull(selected)
    assertEquals("Movie #104", selected?.title)
  }

  @Test
  fun `returns null when focus points outside available items`() {
    val subject = HomeViewModel()

    subject.updateFocus(rowIndex = 99, itemIndex = 99)

    assertNull(subject.selectedItemOrNull())
  }
}
