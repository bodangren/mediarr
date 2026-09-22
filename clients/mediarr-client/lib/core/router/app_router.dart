import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/leanback_scaffold.dart';
import '../../features/discovery/discovery_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/library/movies_screen.dart';
import '../../features/library/series_screen.dart';
import '../../shared/providers/connection_provider.dart';
import '../../shared/services/api_client.dart';

/// Route paths used throughout the app.
class AppRoutes {
  AppRoutes._();

  static const String discovery = '/discovery';
  static const String home = '/home';
  static const String movies = '/movies';
  static const String series = '/series';
}

/// Shell route key for the leanback scaffold.
final _shellNavigatorKey = GlobalKey<NavigatorState>();

/// The app-wide router configuration.
final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.discovery,
    redirect: (context, state) {
      // Phase 4b: redirect to home if the API client is already connected
      // (e.g. autoconnect on cold boot succeeded before this redirect runs).
      if (state.matchedLocation == AppRoutes.discovery) {
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
        ],
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
