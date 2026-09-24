// Home D-pad navigation contract (FR-11), measured on the REAL HomeScreen.
//
// Replaces the previous `_DpadHomeProbe` mock suite (see F9 in
// measure/tracks/chore_replace_jellyfin_consolidation_20260920/tv-ux-investigation-20260924.md):
// that suite re-implemented the layout and could not fail. Every test below
// mounts production widgets and asserts where the remote actually lands.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/movie_detail_screen.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/features/library/series_detail_screen.dart';
import 'package:mediarr_client/features/library/series_screen.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/focus_probe.dart';

const _continueWatching = [
  'Rick and Morty',
  'Salute Your Morts',
];
const _recentFirst = 'The Matrix';
const _moviesFirst = 'Inception';
const _seriesFirst = 'Severance';

List<Override> _overrides(FakeMediarrApiClient api) => [
      apiClientProvider.overrideWith((ref) => api),
      continueWatchingProvider.overrideWith((ref) async => [
            ContinueWatchingItem(
              mediaType: 'episode',
              mediaId: 11,
              title: 'Rick and Morty',
              position: 615,
              duration: 1320,
              progress: 0.47,
              lastWatched: DateTime(2026, 9, 24),
              episodeTitle: 'Salute Your Morts',
              seasonNumber: 9,
              episodeNumber: 9,
            ),
          ]),
      upcomingProvider.overrideWith((ref) async => const []),
      recentlyAddedProvider.overrideWith((ref) async => const [
            LibraryItem(id: 22, title: _recentFirst, type: 'movie', year: 1999),
            LibraryItem(id: 21, title: 'Rick and Morty', type: 'series', year: 2025),
          ]),
      homeMoviesProvider.overrideWith((ref) async => const [
            Movie(id: 31, title: _moviesFirst, year: 2010),
            Movie(id: 32, title: 'Heat', year: 1995),
          ]),
      homeSeriesProvider.overrideWith((ref) async => const [
            Series(id: 41, title: _seriesFirst, year: 2022),
          ]),
      moviesProvider.overrideWith((ref) async => const [
            Movie(id: 31, title: _moviesFirst, year: 2010),
          ]),
      seriesListProvider.overrideWith((ref) async => const [
            Series(id: 41, title: _seriesFirst, year: 2022),
          ]),
    ];

Future<GoRouter> _pumpShell(
  WidgetTester tester,
  FakeMediarrApiClient api,
) async {
  tester.view.physicalSize = const Size(1280, 720);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final container = ProviderContainer(overrides: _overrides(api));
  addTearDown(container.dispose);

  final router = GoRouter(
    initialLocation: '/home',
    routes: [
      ShellRoute(
        builder: (context, state, child) => LeanbackScaffold(
          currentPath: state.uri.path,
          child: child,
        ),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/movies', builder: (_, __) => const MoviesScreen()),
          GoRoute(path: '/series', builder: (_, __) => const SeriesScreen()),
        ],
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        theme: mediarrDarkTheme,
        routerConfig: router,
      ),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

void main() {
  testWidgets('hero primary autofocused on entry, on a visible control',
      (tester) async {
    await _pumpShell(tester, FakeMediarrApiClient());

    expectVisibleFocus('entry');
    // FR-2: the hero primary action is state-aware. This fixture has a
    // continue-watching entry, so the label is `Resume`, not `Play`.
    expect(focusedText(), contains('Resume'));
  });

  testWidgets(
      'Down walks Continue Watching -> Recently Added -> Movies -> TV Shows, '
      'and every stop is a visible control', (tester) async {
    await _pumpShell(tester, FakeMediarrApiClient());

    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expectVisibleFocus('down 1');
    expect(focusedText(), contains(_continueWatching[0]));
    expect(focusedText(), contains(_continueWatching[1]));

    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expectVisibleFocus('down 2');
    expect(focusedText(), contains(_recentFirst));

    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expectVisibleFocus('down 3');
    expect(focusedText(), contains(_moviesFirst));

    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expectVisibleFocus('down 4');
    expect(focusedText(), contains(_seriesFirst));
  });

  testWidgets('Select on a Recently Added poster opens it, and the detail '
      'screen prints the year once', (tester) async {
    final api = FakeMediarrApiClient()
      ..getMovieReturn = const Movie(id: 22, title: _recentFirst, year: 1999);
    await _pumpShell(tester, api);

    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expect(focusedText(), contains(_recentFirst));

    await pressDpad(tester, LogicalKeyboardKey.select);
    await tester.pumpAndSettle();

    expect(find.byType(MovieDetailScreen), findsOneWidget);
    // F12: the year must appear once, not twice (hero subtitle + metadata).
    expect(
      find.text('1999'),
      findsOneWidget,
      reason: 'The detail screen must print the year exactly once.',
    );
  });

  testWidgets('Select on a Movies poster opens its detail screen',
      (tester) async {
    final api = FakeMediarrApiClient()
      ..getMovieReturn = const Movie(id: 31, title: _moviesFirst, year: 2010);
    await _pumpShell(tester, api);

    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expect(focusedText(), contains(_moviesFirst));

    await pressDpad(tester, LogicalKeyboardKey.select);
    await tester.pumpAndSettle();

    expect(find.byType(MovieDetailScreen), findsOneWidget);
  });

  testWidgets('Left from the hero reaches the rail; Down walks it; Select '
      'navigates to that screen', (tester) async {
    await _pumpShell(tester, FakeMediarrApiClient());

    await pressDpad(tester, LogicalKeyboardKey.arrowLeft);
    expectVisibleFocus('left to rail');
    expect(focusedText(), contains('Home'));

    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expectVisibleFocus('rail down 1');
    expect(focusedText(), contains('Movies'));

    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expectVisibleFocus('rail down 2');
    expect(focusedText(), contains('Series'));

    await pressDpad(tester, LogicalKeyboardKey.select);
    await tester.pumpAndSettle();

    expect(find.byType(SeriesScreen), findsOneWidget);
  });

  testWidgets('long D-pad session never lands on an invisible stop',
      (tester) async {
    await _pumpShell(tester, FakeMediarrApiClient());

    const sequence = <LogicalKeyboardKey>[
      LogicalKeyboardKey.arrowDown,
      LogicalKeyboardKey.arrowDown,
      LogicalKeyboardKey.arrowRight,
      LogicalKeyboardKey.arrowDown,
      LogicalKeyboardKey.arrowUp,
      LogicalKeyboardKey.arrowLeft,
      LogicalKeyboardKey.arrowDown,
      LogicalKeyboardKey.arrowUp,
      LogicalKeyboardKey.arrowUp,
      LogicalKeyboardKey.arrowRight,
    ];
    for (var i = 0; i < sequence.length; i++) {
      await pressDpad(tester, sequence[i]);
      expectVisibleFocus('press ${i + 1} (${sequence[i].keyLabel})');
    }
  });

  testWidgets('Back on the detail screen returns to the browse screen',
      (tester) async {
    final api = FakeMediarrApiClient()
      ..getMovieReturn = const Movie(id: 22, title: _recentFirst, year: 1999);
    await _pumpShell(tester, api);

    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    await pressDpad(tester, LogicalKeyboardKey.select);
    await tester.pumpAndSettle();
    expect(find.byType(MovieDetailScreen), findsOneWidget);

    // The Back control is a large, focused control (Phase 4c step 12).
    expect(find.text('Back'), findsOneWidget);
    await tester.tap(find.text('Back'));
    await tester.pumpAndSettle();

    expect(find.byType(MovieDetailScreen), findsNothing);
    expect(find.byType(HomeScreen), findsOneWidget);
  });

  testWidgets('Select on a Series poster opens its detail screen',
      (tester) async {
    final api = FakeMediarrApiClient()
      ..getSeriesByIdReturn = const Series(id: 41, title: _seriesFirst, year: 2022)
      ..getSeriesDetailReturn = const Series(id: 41, title: _seriesFirst, year: 2022);
    await _pumpShell(tester, api);

    for (var i = 0; i < 4; i++) {
      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    }
    expect(focusedText(), contains(_seriesFirst));

    await pressDpad(tester, LogicalKeyboardKey.select);
    await tester.pumpAndSettle();

    expect(find.byType(SeriesDetailScreen), findsOneWidget);
  });
}
