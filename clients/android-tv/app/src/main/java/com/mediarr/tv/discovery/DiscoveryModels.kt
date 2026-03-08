package com.mediarr.tv.discovery

data class DiscoveryEndpoint(
  val host: String,
  val port: Int,
  val serviceName: String,
) {
  val baseUrl: String get() = "http://$host:$port"
}

sealed interface DiscoveryState {
  data object Idle : DiscoveryState
  data object Searching : DiscoveryState
  data class Found(val endpoint: DiscoveryEndpoint) : DiscoveryState
  data class Error(val message: String) : DiscoveryState
}
