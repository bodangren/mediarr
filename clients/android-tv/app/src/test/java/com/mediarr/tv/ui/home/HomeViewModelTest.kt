package com.mediarr.tv.ui.home

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {
  private val dispatcher = StandardTestDispatcher()

  @Before
  fun setup() {
    Dispatchers.setMain(dispatcher)
  }

  @After
  fun tearDown() {
    Dispatchers.resetMain()
  }

  @Test
  fun `loads three default rails with media data`() = runTest {
    val subject = HomeViewModel()
    advanceUntilIdle()

    val rows = subject.uiState.value.rows
    assertEquals(3, rows.size)
    assertEquals("Recently Added", rows[0].title)
    assertEquals("Movies", rows[1].title)
    assertEquals("TV Shows", rows[2].title)
  }

  @Test
  fun `updates selected item when focus changes`() = runTest {
    val subject = HomeViewModel()
    advanceUntilIdle()

    subject.updateFocus(rowIndex = 1, itemIndex = 3)

    val selected = subject.selectedItemOrNull()
    assertNotNull(selected)
    assertEquals("Movie #104", selected?.title)
  }

  @Test
  fun `returns null when focus points outside available items`() = runTest {
    val subject = HomeViewModel()
    advanceUntilIdle()

    subject.updateFocus(rowIndex = 99, itemIndex = 99)

    assertNull(subject.selectedItemOrNull())
  }
}
