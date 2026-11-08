import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/leanback_scaffold.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../theme/mediarr_theme.dart';
import '../../features/discovery/discovery_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/library/movies_screen.dart';
import '../../features/library/series_screen.dart';
import '../../features/library/adult_library_screen.dart';
import '../../features/library/youtube_library_screen.dart';
import '../../features/music/music_library_screen.dart';
import '../../shared/models/adult_item.dart';
import '../../shared/models/youtube_video.dart';
import '../../features/playback/playback_screen.dart';
import '../../features/playback/playback_navigation.dart';
import '../../features/search/search_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../shared/services/api_client.dart';
import '../../shared/services/error_reporter.dart';
import '../../shared/providers/connection_provider.dart';

/// Route paths used throughout the app.
class AppRoutes {
  AppRoutes._();

  static const String discovery = '/discovery';
  static const String home = '/home';
  static const String movies = '/movies';
  static const String series = '/series';
  static const String adult = '/adult';
  static const String youtube = '/youtube';
  static const String music = '/music';
  static const String search = '/search';
  static const String settings = '/settings';
  static const String playback = '/playback';
}

/// Navigator key for the leanback scaffold (Home/Movies/Series stack).
final _shellNavigatorKey = GlobalKey<NavigatorState>();

/// Top-level Navigator for the fullscreen playback route. Kept separate so
/// playback can be pushed without involving the leanback shell (which has
/// the sidebar). Without this, the sidebar renders behind the video and the
/// playback screen never gets the fullscreen surface the user expects.
final _rootNavigatorKey = GlobalKey<NavigatorState>();


/// Opens the shared playback surface for an Adult item, with its own progress endpoint.
///
/// The reporter override is the whole point: without it the player would write movie/episode
/// progress for an adult file.
void _openAdultItem(Ref ref, BuildContext context, AdultItem item) {
  final client = ref.read(apiClientProvider.notifier);
  Navigator.of(context, rootNavigator: true).push(
    MaterialPageRoute<void>(
      builder: (_) => PlaybackScreen(
        streamUrl: client.adultStreamUrl(item.id),
        title: item.displayTitle,
        mediaId: item.id,
        mediaType: 'adult',
        progressReporter: ({
          required int mediaId,
          required String type,
          required int positionSeconds,
          required int durationSeconds,
        }) =>
            client.reportAdultProgress(
              mediaId: mediaId,
              positionSeconds: positionSeconds,
              durationSeconds: durationSeconds,
            ),
      ),
    ),
  );
}

/// Opens the shared player for a YouTube video. Progress is NOT written to movie/episode storage:
/// this library has its own retention semantics, so the reporter is a no-op until Phase 3 adds one.
void _openYoutubeVideo(Ref ref, BuildContext context, YoutubeVideo video) {
  final client = ref.read(apiClientProvider.notifier);
  Navigator.of(context, rootNavigator: true).push(
    MaterialPageRoute<void>(
      builder: (_) => PlaybackScreen(
        streamUrl: client.youtubeStreamUrl(video.id),
        title: video.title,
        mediaId: video.id,
        mediaType: 'youtube',
        progressReporter: ({
          required int mediaId,
          required String type,
          required int positionSeconds,
          required int durationSeconds,
        }) => client.reportYoutubeProgress(
          videoId: mediaId,
          positionSeconds: positionSeconds,
          durationSeconds: durationSeconds,
        ),
      ),
    ),
  );
}

/// The app-wide router configuration.
final appRouterProvider = Provider<GoRouter>((ref) {
  final reporter = ref.read(errorReporterProvider);
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.discovery,
    // Navigation failures are user-visible dead ends, so they are shipped to
    // the server like any other failure (owner requirement 2026-11-07).
    errorBuilder: (context, state) {
      reporter.report(
        message: 'navigation error: ${state.error ?? state.uri}',
        stack: state.error?.toString(),
        severity: 'navigation',
        route: state.uri.path,
        context: {'location': state.uri.toString()},
      );
      return Scaffold(
        backgroundColor: MediarrColors.surfaceBase,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.error_outline,
                  color: MediarrColors.statusError,
                  size: 56,
                ),
                const SizedBox(height: 16),
                const Text(
                  'That screen could not be opened',
                  style: TextStyle(color: Colors.white, fontSize: 26),
                ),
                const SizedBox(height: 20),
                FocusableAction(
                  autofocus: true,
                  variant: FocusableActionVariant.button,
                  onSelect: () => context.go(AppRoutes.home),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 28,
                      vertical: 14,
                    ),
                    color: MediarrColors.accentPrimary,
                    child: const Text(
                      'Back to Home',
                      style: TextStyle(color: Colors.white, fontSize: 22),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    },
    observers: [
      // Track the current route so error reports carry the screen context.
      _RouteObserver(reporter),
    ],
    redirect: (context, state) {
      // Phase 4b: redirect to home if the API client is already connected
      // (e.g. autoconnect on cold boot succeeded before this redirect runs).
      // `?switch=1` is the explicit "change server" request from the rail, and
      // must stay on Discovery even while connected.
      if (state.matchedLocation == AppRoutes.discovery &&
          state.uri.queryParameters['switch'] != '1') {
        final manager = ref.read(connectionManagerProvider);
        final clientState = manager.clientState;
        if (clientState.baseUrl != null &&
            clientState.status == ConnectionStatus.connected) {
          return AppRoutes.home;
        }
      }
      return null;
    },
    refreshListenable: _ConnectionListenable(ref),
    routes: [
      // Discovery screen (no shell — full screen)
      GoRoute(
        path: AppRoutes.discovery,
        builder: (context, state) => const DiscoveryScreen(),
      ),
      // Main app shell with sidebar navigation
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return LeanbackScaffold(
            currentPath: state.uri.path,
            child: child,
          );
        },
        routes: [
          GoRoute(
            path: AppRoutes.home,
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: AppRoutes.movies,
            builder: (context, state) => const MoviesScreen(),
          ),
          GoRoute(
            path: AppRoutes.series,
            builder: (context, state) => const SeriesScreen(),
          ),
          GoRoute(
            path: AppRoutes.adult,
            builder: (context, state) => AdultLibraryScreen(
              api: ref.read(apiClientProvider.notifier),
              baseUrl: ref.read(apiClientProvider).baseUrl,
              onSelect: (item) => _openAdultItem(ref, context, item),
            ),
          ),
          GoRoute(
            path: AppRoutes.music,
            builder: (context, state) => const MusicLibraryScreen(),
          ),
          GoRoute(
            path: AppRoutes.youtube,
            builder: (context, state) => YoutubeLibraryScreen(
              api: ref.read(apiClientProvider.notifier),
              baseUrl: ref.read(apiClientProvider).baseUrl,
              onSelect: (video) => _openYoutubeVideo(ref, context, video),
            ),
          ),
          GoRoute(
            path: AppRoutes.search,
            builder: (context, state) => const SearchScreen(),
          ),
          GoRoute(
            path: AppRoutes.settings,
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),
      // Fullscreen playback — parentNavigatorKey ensures this route lives
      // OUTSIDE the ShellRoute's scaffold, so the sidebar never renders
      // behind the video and the video gets the full screen.
      GoRoute(
        path: AppRoutes.playback,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          if (extra == null) {
            return const Scaffold(body: SizedBox.shrink());
          }
          return PlaybackScreen(
            streamUrl: extra['streamUrl'] as String,
            title: extra['title'] as String,
            mediaId: extra['mediaId'] as int,
            mediaType: extra['mediaType'] as String,
            // FR-3: the queue is untyped at the route boundary, so it is
            // parsed defensively and anything malformed is dropped.
            queue: readPlaybackQueueFromExtra(extra),
            resumeFrom: Duration(seconds: (extra['resumeFromSeconds'] as num?)?.toInt() ?? 0),
          );
        },
      ),
    ],
  );
});

/// Records the current route on the error reporter.
class _RouteObserver extends NavigatorObserver {
  _RouteObserver(this._reporter);

  final ErrorReporter _reporter;

  void _record(Route<dynamic>? route) {
    final name = route?.settings.name;
    if (name != null && name.isNotEmpty) {
      _reporter.currentRoute = name;
    }
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _record(route);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _record(previousRoute);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    _record(newRoute);
  }
}

/// Bridges Riverpod's connection state to GoRouter's refreshListenable so the
/// router redirects when the connection is established mid-session.
class _ConnectionListenable extends ChangeNotifier {
  _ConnectionListenable(this._ref) {
    _sub = _ref.listen<ApiClientState>(apiClientProvider, (_, __) {
      notifyListeners();
    });
  }

  final Ref _ref;
  late final ProviderSubscription<ApiClientState> _sub;

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }
}