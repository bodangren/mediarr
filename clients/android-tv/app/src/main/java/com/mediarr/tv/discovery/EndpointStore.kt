package com.mediarr.tv.discovery

interface EndpointStore {
  suspend fun save(endpoint: DiscoveryEndpoint)
  suspend fun load(): DiscoveryEndpoint?
}
