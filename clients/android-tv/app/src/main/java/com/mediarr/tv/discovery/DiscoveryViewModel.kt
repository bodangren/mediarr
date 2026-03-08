package com.mediarr.tv.discovery

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class DiscoveryViewModel(private val repository: DiscoveryRepository) : ViewModel() {
  val state: StateFlow<DiscoveryState> = repository.state.stateIn(
    scope = viewModelScope,
    started = SharingStarted.WhileSubscribed(5_000),
    initialValue = DiscoveryState.Idle,
  )

  init {
    viewModelScope.launch {
      repository.startDiscovery()
    }
  }

  fun retry() {
    viewModelScope.launch {
      repository.retry()
    }
  }

  fun save(endpoint: DiscoveryEndpoint) {
    viewModelScope.launch {
      repository.saveEndpoint(endpoint)
    }
  }

  override fun onCleared() {
    viewModelScope.launch {
      repository.stopDiscovery()
    }
    super.onCleared()
  }
}

class DiscoveryViewModelFactory(
  private val repository: DiscoveryRepository,
) : ViewModelProvider.Factory {
  override fun <T : ViewModel> create(modelClass: Class<T>): T {
    if (modelClass.isAssignableFrom(DiscoveryViewModel::class.java)) {
      @Suppress("UNCHECKED_CAST")
      return DiscoveryViewModel(repository) as T
    }
    throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
  }
}
