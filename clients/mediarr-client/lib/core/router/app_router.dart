import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/leanback_scaffold.dart';
import '../../features/discovery/discovery_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/library/movies_screen.dart';
import '../../features/library/series_screen.dart';
import '../../features/playback/playback_screen.dart';
import '../../features/search/search_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../shared/providers/connection_provider.dart';
import '../../shared/services/api_client.dart';

/// Route paths used throughout the app.
class AppRoutes {
  AppRoutes._();

  static const String discovery = '/discovery';
  static const String home = '/home';
  static const String movies = '/movies';
  static const String series = '/series';
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

/// The app-wide router configuration.
final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.discovery,
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
          );
        },
      ),
    ],
  );
});

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