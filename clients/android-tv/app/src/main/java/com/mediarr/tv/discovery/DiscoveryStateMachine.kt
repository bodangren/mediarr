package com.mediarr.tv.discovery

class DiscoveryStateMachine {
  private var currentState: DiscoveryState = DiscoveryState.Idle

  fun current(): DiscoveryState = currentState

  fun onStart(): DiscoveryState {
    currentState = DiscoveryState.Searching
    return currentState
  }

  fun onEndpointResolved(endpoint: DiscoveryEndpoint): DiscoveryState {
    currentState = DiscoveryState.Found(endpoint)
    return currentState
  }

  fun onError(message: String): DiscoveryState {
    currentState = DiscoveryState.Error(message)
    return currentState
  }

  fun onStop(): DiscoveryState {
    currentState = DiscoveryState.Idle
    return currentState
  }
}
