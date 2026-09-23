// Focus-trace probe — TV UI/UX investigation, 2026-09-24.
//
// This is a CHARACTERISATION probe, not an acceptance test. It prints where
// D-pad key presses actually move focus on the REAL HomeScreen / MoviesScreen,
// so that navigation defects are measured instead of guessed.
//
// Run with:
//   flutter test test/investigation/focus_trace_probe_test.dart -r expanded
//
// The remediation track must convert these traces into strict assertions.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/router/app_router.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

List<Override> _dataOverrides() => [
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
            LibraryItem(id: 21, title: 'Rick and Morty', type: 'series', year: 2025),
            LibraryItem(id: 22, title: 'The Matrix', type: 'movie', year: 1999),
          ]),
      homeMoviesProvider.overrideWith((ref) async => const [
            Movie(id: 31, title: 'The Matrix', year: 1999),
            Movie(id: 32, title: 'Inception', year: 2010),
            Movie(id: 33, title: 'Heat', year: 1995),
          ]),
      homeSeriesProvider.overrideWith((ref) async => const [
            Series(id: 41, title: 'Rick and Morty', year: 2015),
            Series(id: 42, title: 'Severance', year: 2022),
          ]),
      moviesProvider.overrideWith((ref) async => const [
            Movie(id: 31, title: 'The Matrix', year: 1999),
            Movie(id: 32, title: 'Inception', year: 2010),
            Movie(id: 33, title: 'Heat', year: 1995),
          ]),
    ];

String _describeFocus() {
  final node = FocusManager.instance.primaryFocus;
  if (node == null) return '(no focus)';
  final ctx = node.context;
  final widgetName = ctx == null ? '(no context)' : ctx.widget.runtimeType.toString();
  return 'label=${node.debugLabel ?? '(unnamed)'} '
      'widget=$widgetName '
      'rect=${ctx?.findRenderObject()?.paintBounds} '
      'traversable=${!node.skipTraversal}';
}

Future<void> _pumpHome(WidgetTester tester) async {
  tester.view.physicalSize = const Size(1280, 720);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final container = ProviderContainer(overrides: _dataOverrides());
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: mediarrDarkTheme,
        home: const LeanbackScaffold(
          currentPath: AppRoutes.home,
          child: HomeScreen(),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _press(
  WidgetTester tester,
  LogicalKeyboardKey key,
  String label,
  List<String> trace,
) async {
  await tester.sendKeyEvent(key);
  await tester.pumpAndSettle();
  trace.add('$label -> ${_describeFocus()}');
}

void main() {
  testWidgets('TRACE home: repeated Down from the hero Play button', (tester) async {
    await _pumpHome(tester);
    final trace = <String>['start -> ${_describeFocus()}'];
    for (var i = 1; i <= 9; i++) {
      await _press(tester, LogicalKeyboardKey.arrowDown, 'down $i', trace);
    }
    debugPrint('=== HOME TRACE: DOWN x9 ===\n${trace.join('\n')}');
  });

  testWidgets('TRACE home: Left from the hero Play button (rail reachability)',
      (tester) async {
    await _pumpHome(tester);
    final trace = <String>['start -> ${_describeFocus()}'];
    for (var i = 1; i <= 4; i++) {
      await _press(tester, LogicalKeyboardKey.arrowLeft, 'left $i', trace);
    }
    await _press(tester, LogicalKeyboardKey.arrowUp, 'up 1', trace);
    await _press(tester, LogicalKeyboardKey.arrowUp, 'up 2', trace);
    debugPrint('=== HOME TRACE: LEFT/UP (rail) ===\n${trace.join('\n')}');
  });

  testWidgets('TRACE home: Down into Recently Added, then Select (dead items?)',
      (tester) async {
    await _pumpHome(tester);
    final trace = <String>['start -> ${_describeFocus()}'];
    for (var i = 1; i <= 4; i++) {
      await _press(tester, LogicalKeyboardKey.arrowDown, 'down $i', trace);
    }
    await _press(tester, LogicalKeyboardKey.select, 'select', trace);
    await _press(tester, LogicalKeyboardKey.arrowRight, 'right 1', trace);
    await _press(tester, LogicalKeyboardKey.select, 'select', trace);
    debugPrint('=== HOME TRACE: SELECT ON ROW ITEMS ===\n${trace.join('\n')}');
  });

  testWidgets('TRACE movies: does the search box accept text?', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final container = ProviderContainer(overrides: _dataOverrides());
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: mediarrDarkTheme,
          home: const LeanbackScaffold(
            currentPath: AppRoutes.movies,
            child: MoviesScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Move from the grid up into the search field, the way a remote does.
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
    await tester.pumpAndSettle();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
    await tester.pumpAndSettle();

    final focused = FocusManager.instance.primaryFocus;
    final widgetInFocus = focused?.context?.widget.runtimeType.toString();
    debugPrint('focus before typing -> ${_describeFocus()}');
    debugPrint('widget that owns the focused node -> $widgetInFocus');

    // Type "matrix" one key at a time, as the TV on-screen keyboard does.
    for (final key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.keyM,
      LogicalKeyboardKey.keyA,
      LogicalKeyboardKey.keyT,
      LogicalKeyboardKey.keyR,
      LogicalKeyboardKey.keyI,
      LogicalKeyboardKey.keyX,
    ]) {
      await tester.sendKeyEvent(key);
      await tester.pump();
    }
    await tester.pumpAndSettle();

    final field = tester.widget<TextField>(find.byType(TextField));
    debugPrint('=== MOVIES TRACE: TYPING ===\n'
        'search controller text after typing "matrix": '
        '"${field.controller?.text}"');
  });

  testWidgets('TRACE movies: grid traversal and the search-field trap', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final container = ProviderContainer(overrides: _dataOverrides());
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: mediarrDarkTheme,
          home: const LeanbackScaffold(
            currentPath: AppRoutes.movies,
            child: MoviesScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final trace = <String>['start -> ${_describeFocus()}'];
    for (var i = 1; i <= 3; i++) {
      await _press(tester, LogicalKeyboardKey.arrowUp, 'up $i', trace);
    }
    for (var i = 1; i <= 3; i++) {
      await _press(tester, LogicalKeyboardKey.arrowLeft, 'left $i', trace);
    }
    for (var i = 1; i <= 4; i++) {
      await _press(tester, LogicalKeyboardKey.arrowDown, 'down $i', trace);
    }
    debugPrint('=== MOVIES TRACE ===\n${trace.join('\n')}');
  });
}
