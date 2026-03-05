package com.mediarr.tv

import android.app.Application
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mediarr.tv.discovery.DiscoveryState
import com.mediarr.tv.discovery.DiscoveryViewModelFactory
import com.mediarr.tv.discovery.EndpointDataStore
import com.mediarr.tv.discovery.DiscoveryViewModel
import com.mediarr.tv.discovery.NsdDiscoveryRepository
import com.mediarr.tv.ui.detail.DetailScreen
import com.mediarr.tv.ui.home.HomeScreen
import com.mediarr.tv.ui.navigation.AppScreen
import com.mediarr.tv.player.PlayerScreen

@Composable
fun MediarrTvApp() {
  val context = LocalContext.current
  val discoveryRepository = remember(context) {
    NsdDiscoveryRepository(
      context = context,
      endpointStore = EndpointDataStore(context),
    )
  }
  val discoveryViewModel: DiscoveryViewModel = viewModel(
    factory = DiscoveryViewModelFactory(discoveryRepository),
  )
  val discoveryState = discoveryViewModel.state.collectAsState()
  var screen: AppScreen by remember { mutableStateOf(AppScreen.Home) }

  when (val value = screen) {
    AppScreen.Home -> HomeScreen(
      onSelectItem = { selected ->
        screen = AppScreen.Detail(selected)
      },
    )

    is AppScreen.Detail -> DetailScreen(
      media = value.media,
      onPlay = { screen = AppScreen.Player(value.media) },
      onBack = { screen = AppScreen.Home },
    )

    is AppScreen.Player -> {
      val streamUrl = when (val state = discoveryState.value) {
        is DiscoveryState.Found -> "${state.endpoint.baseUrl}/api/stream/${value.media.id}?type=movie"
        else -> ""
      }
      PlayerScreen(media = value.media, streamUrl = streamUrl)
      LaunchedEffect(Unit) {
        if (streamUrl.isBlank()) {
          screen = AppScreen.Home
        }
      }
    }
  }
}

class MediarrTvApplication : Application()
