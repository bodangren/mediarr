package com.mediarr.tv.discovery

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext

class NsdDiscoveryRepository(
  context: Context,
  private val endpointStore: EndpointStore,
  private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : DiscoveryRepository {
  private val nsdManager = context.getSystemService(NsdManager::class.java)
  private val stateMachine = DiscoveryStateMachine()
  private val _state = MutableStateFlow<DiscoveryState>(stateMachine.current())

  private var discoveryListener: NsdManager.DiscoveryListener? = null

  override val state: StateFlow<DiscoveryState> = _state.asStateFlow()

  override suspend fun startDiscovery() {
    val saved = endpointStore.load()
    if (saved != null) {
      _state.value = stateMachine.onEndpointResolved(saved)
      return
    }

    if (nsdManager == null) {
      _state.value = stateMachine.onError("NSD service unavailable")
      return
    }

    _state.value = stateMachine.onStart()

    withContext(ioDispatcher) {
      val listener = object : NsdManager.DiscoveryListener {
        override fun onDiscoveryStarted(serviceType: String) = Unit

        override fun onServiceFound(serviceInfo: NsdServiceInfo) {
          if (serviceInfo.serviceType != SERVICE_TYPE) return

          nsdManager.resolveService(serviceInfo, object : NsdManager.ResolveListener {
            override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
              _state.value = stateMachine.onError("Resolve failed: $errorCode")
            }

            override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
              val host = serviceInfo.host?.hostAddress ?: return
              val endpoint = DiscoveryEndpoint(
                host = host,
                port = serviceInfo.port,
                serviceName = serviceInfo.serviceName ?: "Mediarr",
              )
              _state.value = stateMachine.onEndpointResolved(endpoint)
            }
          })
        }

        override fun onServiceLost(serviceInfo: NsdServiceInfo) = Unit
        override fun onDiscoveryStopped(serviceType: String) = Unit
        override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
          _state.value = stateMachine.onError("Discovery failed: $errorCode")
        }

        override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
          _state.value = stateMachine.onError("Stop discovery failed: $errorCode")
        }
      }

      discoveryListener = listener
      nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, listener)
    }
  }

  override suspend fun stopDiscovery() {
    withContext(ioDispatcher) {
      val listener = discoveryListener ?: return@withContext
      if (nsdManager != null) {
        runCatching { nsdManager.stopServiceDiscovery(listener) }
      }
      discoveryListener = null
      _state.value = stateMachine.onStop()
    }
  }

  override suspend fun retry() {
    stopDiscovery()
    startDiscovery()
  }

  override suspend fun saveEndpoint(endpoint: DiscoveryEndpoint) {
    endpointStore.save(endpoint)
    _state.value = stateMachine.onEndpointResolved(endpoint)
  }

  override suspend fun loadSavedEndpoint(): DiscoveryEndpoint? = endpointStore.load()

  private companion object {
    const val SERVICE_TYPE = "_mediarr._tcp."
  }
}
