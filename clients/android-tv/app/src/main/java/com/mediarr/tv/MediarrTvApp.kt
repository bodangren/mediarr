package com.mediarr.tv

import android.app.Application
import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.util.DebugLogger
import com.mediarr.tv.data.api.MediarrApiClient
import com.mediarr.tv.data.repository.RemoteCatalogRepository
import com.mediarr.tv.data.repository.RemotePlaybackRepository
import com.mediarr.tv.discovery.DiscoveryEndpoint
import com.mediarr.tv.discovery.DiscoveryState
import com.mediarr.tv.discovery.DiscoveryViewModel
import com.mediarr.tv.discovery.DiscoveryViewModelFactory
import com.mediarr.tv.discovery.EndpointDataStore
import com.mediarr.tv.discovery.NsdDiscoveryRepository
import com.mediarr.tv.player.PlayerScreen
import com.mediarr.tv.player.ResumeDecider
import com.mediarr.tv.player.ResumeOption
import com.mediarr.tv.ui.detail.DetailScreen
import com.mediarr.tv.ui.detail.ResumePromptScreen
import com.mediarr.tv.ui.home.HomeScreen
import com.mediarr.tv.ui.home.HomeViewModel
import com.mediarr.tv.ui.home.HomeViewModelFactory
import com.mediarr.tv.ui.navigation.AppScreen
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient

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
  val discoveryState = discoveryViewModel.state.collectAsState()
  val defaultBaseUrl = remember { defaultBaseUrl() }
  var activeBaseUrl by remember { mutableStateOf(defaultBaseUrl) }
  var screen: AppScreen by remember { mutableStateOf(AppScreen.Home) }

  val apiClient = remember(activeBaseUrl) {
    MediarrApiClient(baseUrlProvider = { activeBaseUrl })
  }
  val remoteRepository = remember(apiClient) { RemoteCatalogRepository(apiClient) }
  val remotePlaybackRepository = remember(apiClient, activeBaseUrl) {
    RemotePlaybackRepository(
      api = apiClient,
      baseUrlProvider = { activeBaseUrl },
    )
  }
  val homeViewModel: HomeViewModel = viewModel(
    factory = HomeViewModelFactory(remoteRepository),
  )
  val resumeDecider = remember { ResumeDecider() }

  LaunchedEffect(Unit) {
    val saved = discoveryRepository.loadSavedEndpoint()
    if (saved != null) {
      activeBaseUrl = effectiveBaseUrl(saved, defaultBaseUrl)
    }
  }

  LaunchedEffect(remoteRepository) {
    homeViewModel.attachRepository(remoteRepository)
  }

  LaunchedEffect(discoveryState.value) {
    val state = discoveryState.value
    if (state is DiscoveryState.Found) {
      val resolvedBaseUrl = effectiveBaseUrl(state.endpoint, defaultBaseUrl)
      if (resolvedBaseUrl != activeBaseUrl) {
        activeBaseUrl = resolvedBaseUrl
      }
      discoveryViewModel.save(state.endpoint)
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
            AppScreen.ResumePrompt(
              media = selected,
              session = session,
              returnTo = value.media,
            )
          } else {
            AppScreen.Player(
              media = selected,
              session = session,
              startPositionSeconds = 0L,
              returnTo = value.media,
            )
          }
        }
      },
      onBack = { screen = AppScreen.Home },
    )

    is AppScreen.ResumePrompt -> ResumePromptScreen(
      mediaTitle = value.media.title,
      positionSeconds = value.session.resumePositionSeconds,
      onResume = {
        screen = AppScreen.Player(
          media = value.media,
          session = value.session,
          startPositionSeconds = resumeDecider.startPosition(value.session, ResumeOption.RESUME),
          returnTo = value.returnTo,
        )
      },
      onStartOver = {
        screen = AppScreen.Player(
          media = value.media,
          session = value.session,
          startPositionSeconds = resumeDecider.startPosition(value.session, ResumeOption.START_OVER),
          returnTo = value.returnTo,
        )
      },
      onCancel = { screen = AppScreen.Detail(value.returnTo) },
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
        onBack = {
          screen = AppScreen.Detail(value.returnTo)
        },
      )
      LaunchedEffect(value.session.streamUrl) {
        if (value.session.streamUrl.isBlank()) {
          screen = AppScreen.Home
        }
      }
    }
  }
}

class MediarrTvApplication : Application(), ImageLoaderFactory {
  override fun newImageLoader(): ImageLoader {
    return ImageLoader.Builder(this)
      .crossfade(true)
      .logger(DebugLogger())
      .okHttpClient {
        OkHttpClient.Builder()
          .build()
      }
      .build()
  }
}

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

internal fun effectiveBaseUrl(saved: DiscoveryEndpoint?, fallbackBaseUrl: String): String {
  if (saved == null) {
    return fallbackBaseUrl
  }

  val host = saved.host.trim().lowercase()
  val fallbackHost = fallbackBaseUrl.removePrefix("http://").substringBefore(':').lowercase()
  val isEmulatorFallback = fallbackHost == "10.0.2.2"
  val isLoopbackSaved = host == "127.0.0.1" || host == "localhost" || host == "::1"

  return if (isEmulatorFallback && isLoopbackSaved) {
    "http://10.0.2.2:${saved.port}"
  } else {
    saved.baseUrl
  }
}
