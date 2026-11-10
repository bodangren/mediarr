import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/series_screen.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

void main() {
  group('SeriesScreen', () {
    testWidgets('shows loading state', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith(
              (ref) async => <ContinueWatchingItem>[],
            ),
            seriesListProvider.overrideWith((ref) async {
              // Never resolves — stays in loading state
              await Completer<void>().future;
              return <Series>[];
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SeriesScreen()),
          ),
        ),
      );

      expect(find.text('Series'), findsOneWidget);
      // At least one spinner is showing while data loads.
      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });

    testWidgets('shows series list when data loaded', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
            seriesListProvider.overrideWith((ref) async => [
                  const Series(
                    id: 1,
                    title: 'Breaking Bad',
                    year: 2008,
                    monitored: true,
                    seasonCount: 5,
                    episodeCount: 62,
                    episodeFileCount: 62,
                    status: 'ended',
                  ),
                  const Series(
                    id: 2,
                    title: 'Better Call Saul',
                    year: 2015,
                    monitored: true,
                  ),
                ]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SeriesScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Series'), findsOneWidget);
      expect(find.text('Breaking Bad'), findsWidgets);
      expect(find.text('Better Call Saul'), findsWidgets);
    });

    testWidgets('shows empty state when no series', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
            seriesListProvider.overrideWith((ref) async => <Series>[]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SeriesScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('No series in library'), findsOneWidget);
    });

    List<Series> viewFixtures() => const [
          Series(
            id: 1,
            title: 'A Watched Show',
            year: 2008,
            monitored: true,
            episodeCount: 10,
            episodeFileCount: 10,
            status: 'ended',
            statistics: {'watchedEpisodes': 10},
          ),
          Series(
            id: 2,
            title: 'B Unwatched Show',
            year: 2015,
            monitored: true,
            episodeCount: 10,
            episodeFileCount: 4,
            status: 'continuing',
            statistics: {'watchedEpisodes': 0},
          ),
        ];

    Future<void> pumpSeries(WidgetTester tester) async {
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
            seriesListProvider.overrideWith((ref) async => viewFixtures()),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SeriesScreen()),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('the View menu filters to unwatched series with an active chip',
        (tester) async {
      await pumpSeries(tester);
      expect(find.text('A Watched Show'), findsWidgets);

      await tester.tap(find.text('View'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Unwatched'));
      await tester.pumpAndSettle();

      expect(find.text('A Watched Show'), findsNothing);
      expect(find.text('B Unwatched Show'), findsWidgets);
      expect(find.text('Unwatched'), findsOneWidget); // active chip

      // Selecting the chip clears the filter.
      await tester.tap(find.text('Unwatched'));
      await tester.pumpAndSettle();
      expect(find.text('A Watched Show'), findsWidgets);
      expect(find.text('Unwatched'), findsNothing);
    });

    testWidgets('the View menu sorts by year newest first', (tester) async {
      await pumpSeries(tester);

      await tester.tap(find.text('View'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Year (newest)'));
      await tester.pumpAndSettle();

      final newer = tester.getTopLeft(find.text('B Unwatched Show')).dx;
      final older = tester.getTopLeft(find.text('A Watched Show')).dx;
      expect(newer, lessThan(older),
          reason: 'Year (newest) must put the 2015 show before the 2008 one.');
    });

    testWidgets('Back from a series detail restores the opened poster focus',
        (tester) async {
      await pumpSeries(tester);

      await tester.sendKeyEvent(LogicalKeyboardKey.select);
      await tester.pumpAndSettle();

      Navigator.of(tester.element(find.byType(Scaffold).last)).pop();
      await tester.pumpAndSettle();

      expect(
        FocusManager.instance.primaryFocus?.debugLabel,
        'SeriesScreen.series.1',
        reason: 'Back from the detail must return focus to the poster that opened it.',
      );
    });
  });
}
