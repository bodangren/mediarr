package com.mediarr.tv.data.config

import com.mediarr.tv.discovery.DiscoveryRepository

class EndpointConfig(private val discoveryRepository: DiscoveryRepository) {
  suspend fun baseUrlOrThrow(): String {
    val endpoint = discoveryRepository.loadSavedEndpoint()
      ?: throw IllegalStateException("No discovered server endpoint available")
    return endpoint.baseUrl
  }
}
