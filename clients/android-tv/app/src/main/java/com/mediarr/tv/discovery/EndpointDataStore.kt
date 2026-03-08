package com.mediarr.tv.discovery

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map

private val Context.endpointDataStore: DataStore<Preferences> by preferencesDataStore(name = "mediarr_tv_endpoint")

class EndpointDataStore(private val context: Context) : EndpointStore {
  override suspend fun save(endpoint: DiscoveryEndpoint) {
    context.endpointDataStore.edit { prefs ->
      prefs[KEY_HOST] = endpoint.host
      prefs[KEY_PORT] = endpoint.port
      prefs[KEY_NAME] = endpoint.serviceName
    }
  }

  override suspend fun load(): DiscoveryEndpoint? {
    val prefs = context.endpointDataStore.data.map { it }.firstOrNull() ?: return null
    val host = prefs[KEY_HOST] ?: return null
    val port = prefs[KEY_PORT] ?: return null
    val name = prefs[KEY_NAME] ?: "Mediarr"
    return DiscoveryEndpoint(host = host, port = port, serviceName = name)
  }

  private companion object {
    val KEY_HOST = stringPreferencesKey("host")
    val KEY_PORT = intPreferencesKey("port")
    val KEY_NAME = stringPreferencesKey("name")
  }
}
