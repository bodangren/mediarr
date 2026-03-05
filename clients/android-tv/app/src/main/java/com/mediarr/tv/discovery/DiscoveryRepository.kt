package com.mediarr.tv.discovery

import kotlinx.coroutines.flow.Flow

interface DiscoveryRepository {
  val state: Flow<DiscoveryState>

  suspend fun startDiscovery()
  suspend fun stopDiscovery()
  suspend fun retry()
  suspend fun saveEndpoint(endpoint: DiscoveryEndpoint)
  suspend fun loadSavedEndpoint(): DiscoveryEndpoint?
}
