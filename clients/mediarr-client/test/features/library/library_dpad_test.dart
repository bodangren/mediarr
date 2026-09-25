// Library D-pad navigation contract (FR-11), measured on the REAL
// MoviesScreen and SeriesScreen.
//
// See measure/tracks/chore_replace_jellyfin_consolidation_20260920/tv-ux-investigation-20260924.md
// F3 and F5: `NetflixScaffold.root` used to strand focus, and the search
// fields held focus on a wrapper `Focus`, so the input method never attached
// and the fields accepted no text.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/features/library/series_screen.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/focus_probe.dart';

const _movies = ['The Matrix', 'Inception', 'Heat'];
const _series = ['Severance', 'Rick and Morty'];

List<Override> _overrides() => [
      apiClientProvider.overrideWith((ref) => FakeMediarrApiClient()),
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
            LibraryItem(id: 22, title: 'The Matrix', type: 'movie', year: 1999),
          ]),
      homeMoviesProvider.overrideWith((ref) async => const [
            Movie(id: 31, title: 'Inception', year: 2010),
          ]),
      homeSeriesProvider.overrideWith((ref) async => const [
            Series(id: 41, title: 'Severance', year: 2022),
          ]),
      moviesProvider.overrideWith((ref) async => const [
            Movie(id: 31, title: 'The Matrix', year: 1999),
            Movie(id: 32, title: 'Inception', year: 2010),
            Movie(id: 33, title: 'Heat', year: 1995),
          ]),
      seriesListProvider.overrideWith((ref) async => const [
            Series(id: 41, title: 'Severance', year: 2022),
            Series(id: 42, title: 'Rick and Morty', year: 2015),
          ]),
    ];

Future<void> _pumpShell(WidgetTester tester, String location) async {
  tester.view.physicalSize = const Size(1280, 720);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final container = ProviderContainer(overrides: _overrides());
  addTearDown(container.dispose);

  final router = GoRouter(
    initialLocation: location,
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
}

/// Asserts the search field owns its focus node and holds focus.
void expectSearchOwnsFocus(WidgetTester tester) {
  final field = tester.widget<TextField>(find.byType(TextField));
  expect(
    field.focusNode,
    isNotNull,
    reason: 'The search TextField must own its FocusNode so the on-screen '
        'keyboard can attach and the field can accept text.',
  );
  expect(
    field.focusNode!.hasPrimaryFocus,
    isTrue,
    reason: 'Focus must sit on the editable text, not on a wrapper Focus '
        '(focus is on "${focusLabel()}").',
  );
  expectVisibleFocus('search field');
}

void main() {
  group('MoviesScreen', () {
    testWidgets('entry focuses the first grid tile on a visible control',
        (tester) async {
      await _pumpShell(tester, '/movies');

      expectVisibleFocus('entry');
      expect(focusedText(), contains(_movies[0]));
    });

    testWidgets('Up walks grid -> Continue Watching -> search field, and the '
        'search field owns focus', (tester) async {
      await _pumpShell(tester, '/movies');

      await pressDpad(tester, LogicalKeyboardKey.arrowUp);
      expectVisibleFocus('up 1');
      expect(focusedText(), contains('Rick and Morty'));
      expect(focusedText(), contains('Resume at'));

      await pressDpad(tester, LogicalKeyboardKey.arrowUp);
      expectSearchOwnsFocus(tester);
    });

    testWidgets('Left from the grid reaches the rail, and Right returns to '
        'content', (tester) async {
      await _pumpShell(tester, '/movies');

      await pressDpad(tester, LogicalKeyboardKey.arrowLeft);
      expectVisibleFocus('left to rail');
      expect(
        focusedText(),
        anyOf(contains('Home'), contains('Movies'), contains('Series')),
      );

      await pressDpad(tester, LogicalKeyboardKey.arrowRight);
      expectVisibleFocus('right back to content');
      expect(
        focusedText(),
        isNot(anyOf(contains('Home'), contains('Movies'), contains('Series'))),
      );
    });

    testWidgets('long D-pad session never lands on an invisible stop',
        (tester) async {
      await _pumpShell(tester, '/movies');

      const sequence = <LogicalKeyboardKey>[
        LogicalKeyboardKey.arrowDown,
        LogicalKeyboardKey.arrowRight,
        LogicalKeyboardKey.arrowDown,
        LogicalKeyboardKey.arrowLeft,
        LogicalKeyboardKey.arrowUp,
        LogicalKeyboardKey.arrowUp,
        LogicalKeyboardKey.arrowLeft,
        LogicalKeyboardKey.arrowDown,
        LogicalKeyboardKey.arrowRight,
        LogicalKeyboardKey.arrowUp,
      ];
      for (var i = 0; i < sequence.length; i++) {
        await pressDpad(tester, sequence[i]);
        expectVisibleFocus('press ${i + 1} (${sequence[i].keyLabel})');
      }
    });
  });

  group('SeriesScreen', () {
    testWidgets('entry focuses the first grid tile on a visible control',
        (tester) async {
      await _pumpShell(tester, '/series');

      expectVisibleFocus('entry');
      expect(focusedText(), contains(_series[0]));
    });

    testWidgets('Up reaches the search field, which owns focus', (tester) async {
      await _pumpShell(tester, '/series');

      await pressDpad(tester, LogicalKeyboardKey.arrowUp);
      await pressDpad(tester, LogicalKeyboardKey.arrowUp);
      expectSearchOwnsFocus(tester);
    });

    testWidgets('Left reaches the rail', (tester) async {
      await _pumpShell(tester, '/series');

      await pressDpad(tester, LogicalKeyboardKey.arrowLeft);
      expectVisibleFocus('left to rail');
      expect(
        focusedText(),
        anyOf(contains('Home'), contains('Movies'), contains('Series')),
      );
    });
  });
}
