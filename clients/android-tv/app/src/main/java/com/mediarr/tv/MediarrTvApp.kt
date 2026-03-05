package com.mediarr.tv

import android.app.Application
import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mediarr.tv.core.model.MediaType
import com.mediarr.tv.data.api.MediarrApiClient
import com.mediarr.tv.data.repository.RemoteCatalogRepository
import com.mediarr.tv.data.repository.RemotePlaybackRepository
import com.mediarr.tv.discovery.DiscoveryState
import com.mediarr.tv.discovery.DiscoveryViewModelFactory
import com.mediarr.tv.discovery.EndpointDataStore
import com.mediarr.tv.discovery.DiscoveryViewModel
import com.mediarr.tv.discovery.NsdDiscoveryRepository
import com.mediarr.tv.ui.detail.DetailScreen
import com.mediarr.tv.ui.detail.ResumePromptScreen
import com.mediarr.tv.ui.home.HomeScreen
import com.mediarr.tv.ui.home.HomeViewModel
import com.mediarr.tv.ui.navigation.AppScreen
import com.mediarr.tv.player.PlayerScreen
import com.mediarr.tv.player.ResumeDecider
import com.mediarr.tv.player.ResumeOption
import kotlinx.coroutines.launch

@Composable
fun MediarrTvApp() {
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  val discoveryRepository = remember(context) {
    NsdDiscoveryRepository(
      context = context,
      endpointStore = EndpointDataStore(context),
    )
  }
  val discoveryViewModel: DiscoveryViewModel = viewModel(
    factory = DiscoveryViewModelFactory(discoveryRepository),
  )
  val homeViewModel: HomeViewModel = viewModel()
  val discoveryState = discoveryViewModel.state.collectAsState()
  var screen: AppScreen by remember { mutableStateOf(AppScreen.Home) }
  val defaultBaseUrl = remember { defaultBaseUrl() }
  val apiClient = remember(discoveryRepository) {
    MediarrApiClient(
      baseUrlProvider = { discoveryRepository.loadSavedEndpoint()?.baseUrl ?: defaultBaseUrl },
    )
  }
  val remoteRepository = remember(apiClient) { RemoteCatalogRepository(apiClient) }
  val remotePlaybackRepository = remember(apiClient, discoveryRepository) {
    RemotePlaybackRepository(
      api = apiClient,
      baseUrlProvider = { discoveryRepository.loadSavedEndpoint()?.baseUrl ?: defaultBaseUrl },
    )
  }
  val resumeDecider = remember { ResumeDecider() }

  LaunchedEffect(remoteRepository) {
    homeViewModel.attachRepository(remoteRepository)
  }

  LaunchedEffect(discoveryState.value) {
    val state = discoveryState.value
    if (state is DiscoveryState.Found) {
      homeViewModel.refresh()
    }
  }

  when (val value = screen) {
    AppScreen.Home -> HomeScreen(
      onSelectItem = { selected ->
        scope.launch {
          val detailItem = homeViewModel.loadDetail(selected)
          screen = AppScreen.Detail(detailItem)
        }
      },
      viewModel = homeViewModel,
    )

    is AppScreen.Detail -> DetailScreen(
      media = value.media,
      onPlay = { selected ->
        scope.launch {
          val session = remotePlaybackRepository.createSession(selected)
          screen = if (resumeDecider.shouldPrompt(session)) {
            AppScreen.ResumePrompt(selected, session)
          } else {
            AppScreen.Player(
              media = selected,
              session = session,
              startPositionSeconds = 0L,
            )
          }
        }
      },
      onBack = { screen = AppScreen.Home },
    )

    is AppScreen.ResumePrompt -> ResumePromptScreen(
      positionSeconds = value.session.resumePositionSeconds,
      onResume = {
        screen = AppScreen.Player(
          media = value.media,
          session = value.session,
          startPositionSeconds = resumeDecider.startPosition(value.session, ResumeOption.RESUME),
        )
      },
      onStartOver = {
        screen = AppScreen.Player(
          media = value.media,
          session = value.session,
          startPositionSeconds = resumeDecider.startPosition(value.session, ResumeOption.START_OVER),
        )
      },
      onCancel = { screen = AppScreen.Detail(value.media) },
    )

    is AppScreen.Player -> {
      PlayerScreen(
        media = value.media,
        session = value.session,
        startPositionSeconds = value.startPositionSeconds,
        onProgress = { positionSeconds, durationSeconds ->
          remotePlaybackRepository.sendProgress(
            media = value.media,
            positionSeconds = positionSeconds,
            durationSeconds = durationSeconds,
          )
        },
      )
      LaunchedEffect(Unit) {
        if (value.session.streamUrl.isBlank()) {
          screen = AppScreen.Home
        }
      }
    }
  }
}

class MediarrTvApplication : Application()

private fun defaultBaseUrl(): String {
  val isEmulator = Build.FINGERPRINT.startsWith("generic", ignoreCase = true) ||
    Build.MODEL.contains("emulator", ignoreCase = true) ||
    Build.MODEL.contains("android sdk built for", ignoreCase = true) ||
    Build.PRODUCT.contains("sdk", ignoreCase = true)

  return if (isEmulator) {
    "http://10.0.2.2:3001"
  } else {
    "http://127.0.0.1:3001"
  }
}
