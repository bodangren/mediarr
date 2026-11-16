import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';

import 'core/router/app_router.dart';
import 'core/widgets/tv_media_keys.dart';
import 'core/theme/mediarr_theme.dart';
import 'features/discovery/bonsoir_adapter.dart';
import 'features/discovery/discovery_service.dart';
import 'features/home/home_screen.dart';
import 'features/library/collections_screen.dart';
import 'features/library/continue_watching_section.dart';
import 'features/library/movies_screen.dart';
import 'features/library/see_all_screen.dart';
import 'features/library/series_screen.dart';
import 'features/subtitles/wanted_screen.dart';
import 'shared/providers/connection_provider.dart';
import 'shared/providers/library_refresh.dart';
import 'shared/services/api_client.dart';

/// Server-backed library providers whose cached values go stale while the TV
/// client sits in the background.
///
/// All of them are invalidated on resume (FR-6) so a newly imported video or a
/// newly fetched subtitle appears without restarting the app. Detail screens
/// already fetch on open; these are the long-lived list providers that would
/// otherwise serve a startup snapshot for the whole session.
final List<ProviderOrFamily> libraryRefreshProviders = <ProviderOrFamily>[
  moviesProvider,
  seriesListProvider,
  continueWatchingProvider,
  recentlyAddedProvider,
  homeMoviesProvider,
  homeSeriesProvider,
  upcomingProvider,
  heroMovieProvider,
  heroSeriesProvider,
  seeAllItemsProvider,
  collectionsProvider,
  subtitleCoverageProvider,
  priorityCoverageProvider,
];

/// Re-read every cached library provider once after the app returns to the
/// foreground. Invalidating a provider that was never built is a no-op, so this
/// is cheap to run on every resume.
void invalidateLibraryProviders(ProviderContainer container) {
  for (final provider in libraryRefreshProviders) {
    container.invalidate(provider);
  }
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();

  final container = ProviderContainer(
    overrides: [
      discoveryServiceProvider.overrideWith((ref) {
        return DiscoveryService(
          mdnsAdapter: BonsoirMdnsAdapter(),
          scanTimeoutDuration: const Duration(seconds: 10),
        );
      }),
    ],
  );

  // Every uncaught failure is shipped to the server for triage. The owner
  // required this on 2026-11-07 instead of reporting bugs screen by screen.
  final reporter = container.read(errorReporterProvider);
  reporter.install();
  // Errors raised while the server was unreachable are spooled to disk.
  // Retry them as soon as a connection exists, and periodically thereafter.
  Timer.periodic(const Duration(minutes: 2), (_) {
    unawaited(reporter.flushSpool());
  });
  unawaited(reporter.flushSpool());

  runZonedGuarded(
    () => runApp(
      UncontrolledProviderScope(
        container: container,
        child: MediarrApp(),
      ),
    ),
    (error, stack) {
      unawaited(reporter.report(
        message: error.toString(),
        stack: stack.toString(),
        severity: 'zone',
      ));
    },
  );
}

class MediarrApp extends ConsumerStatefulWidget {
  const MediarrApp({super.key});

  @override
  ConsumerState<MediarrApp> createState() => _MediarrAppState();
}

class _MediarrAppState extends ConsumerState<MediarrApp> {
  bool _attemptedAutoconnect = false;

  @override
  void initState() {
    super.initState();
    // Phase 4b: on cold boot, try to reconnect to the last-used server before
    // the first frame paints. If it succeeds, the router's redirect will
    // route to Home; if it fails (no prefs or server down), the user lands
    // on Discovery.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (_attemptedAutoconnect) return;
      _attemptedAutoconnect = true;
      final manager = ref.read(connectionManagerProvider);
      await manager.tryReconnectLastServer();
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final container = ProviderScope.containerOf(context, listen: false);
    return AppResumeRefresher(
      // FR-6: the TV is long-lived, so the caches must be invalidated when the
      // activity regains focus, not only when the process starts.
      onResumed: () => invalidateLibraryProviders(container),
      child: MaterialApp.router(
        title: 'Mediarr',
        debugShowCheckedModeBanner: false,
        theme: mediarrDarkTheme,
        routerConfig: router,
        builder: (context, child) =>
            TvMediaKeyScope(child: child ?? const SizedBox.shrink()),
      ),
    );
  }
}
