import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/leanback_scaffold.dart';
import '../../features/discovery/discovery_screen.dart';
import '../../features/library/movies_screen.dart';
import '../../features/library/series_screen.dart';
import '../../features/search/search_screen.dart';
import '../../features/settings/settings_screen.dart';

/// Route paths used throughout the app.
class AppRoutes {
  AppRoutes._();

  static const String discovery = '/discovery';
  static const String search = '/search';
  static const String movies = '/movies';
  static const String series = '/series';
  static const String settings = '/settings';
}

/// Shell route key for the leanback scaffold.
final _shellNavigatorKey = GlobalKey<NavigatorState>();

/// The app-wide router configuration.
final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.discovery,
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
            path: AppRoutes.search,
            builder: (context, state) => const SearchScreen(),
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
            path: AppRoutes.settings,
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),
    ],
  );
});
