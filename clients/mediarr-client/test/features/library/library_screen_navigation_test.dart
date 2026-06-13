import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/library/library_screen.dart';
import 'package:mediarr_client/features/library/movie_detail_screen.dart';
import 'package:mediarr_client/features/library/series_detail_screen.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/season.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';
import 'package:mediarr_client/shared/widgets/library_item_card.dart';

import '../../support/fakes/fake_api_client.dart';

/// Live navigation contract: tapping a library tile in `LibraryScreen` pushes
/// the matching detail screen.
///
/// Per `test-strategy.md` §4 guardrail #1: navigation uses the existing
/// **Navigator.push with loaded model** pattern (`library_screen.dart:152-173`),
/// NOT go_router `:id` paths. Tests assert `find.byType(MovieDetailScreen)`
/// after tap, not URL state.
///
/// Per `test-strategy.md` §5: Phase 1 — Contract & Nav tests exercise:
///   - tap library movie → MovieDetailScreen mounted
///   - tap library series → SeriesDetailScreen mounted
///   - back navigation pops to LibraryScreen
void main() {
  group('LibraryScreen navigation contract', () {
    late FakeMediarrApiClient fakeClient;

    setUp(() {
      fakeClient = FakeMediarrApiClient();
    });

    Future<void> pumpLibrary(
      WidgetTester tester, {
      required List<LibraryItem> items,
    }) async {
      // MovieDetailScreen renders a 300px poster sidebar + Expanded details
      // containing a Row whose natural width exceeds 500px (Quality Upgrade
      // header + Spacer + TextButton.icon). Use a TV-sized surface so the
      // row fits without overflowing — overflows are fatal in tests.
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiClientProvider.overrideWith((ref) => fakeClient),
            libraryProvider.overrideWith((ref, query) async {
              return (
                items: items,
                totalCount: items.length,
                totalPages: 1,
              );
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: LibraryScreen()),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets(
      'tapping a library movie fetches the movie and pushes MovieDetailScreen',
      (tester) async {
        final inception = const Movie(
          id: 7,
          title: 'Inception',
          year: 2010,
          overview: 'A thief who steals corporate secrets...',
          monitored: true,
          hasFile: true,
        );
        final matrix = const Movie(
          id: 8,
          title: 'The Matrix',
          year: 1999,
          monitored: true,
          hasFile: true,
        );
        fakeClient.getMovieReturn = inception;

        await pumpLibrary(tester, items: const [
          LibraryItem(id: 7, title: 'Inception', type: 'movie', year: 2010),
          LibraryItem(id: 8, title: 'The Matrix', type: 'movie', year: 1999),
        ]);

        // LibraryScreen rendered both cards
        expect(find.byType(LibraryItemCard), findsNWidgets(2));
        expect(find.text('Inception'), findsWidgets);
        expect(find.text('The Matrix'), findsWidgets);
        expect(find.byType(MovieDetailScreen), findsNothing);

        // Tap the Inception card
        await tester.tap(find.text('Inception').first);
        await tester.pumpAndSettle();

        // LibraryScreen fetched the right movie by id
        expect(fakeClient.getMovieCalls, [7]);

        // MovieDetailScreen is now mounted and shows Inception
        expect(find.byType(MovieDetailScreen), findsOneWidget);
        expect(find.text('Inception'), findsOneWidget);
        // The Matrix must NOT be the title rendered on the detail screen
        expect(find.text('The Matrix'), findsNothing);
      },
    );

    testWidgets(
      'tapping a library series fetches the series and pushes SeriesDetailScreen',
      (tester) async {
        final breakingBad = Series(
          id: 1,
          title: 'Breaking Bad',
          year: 2008,
          monitored: true,
          seasons: const [
            Season(id: 1, seasonNumber: 1, episodeCount: 7, episodeFileCount: 7),
          ],
          statistics: const {
            'totalEpisodes': 62,
            'episodesOnDisk': 62,
          },
        );
        final severance = Series(
          id: 5,
          title: 'Severance',
          year: 2022,
          monitored: true,
          seasons: const [
            Season(id: 1, seasonNumber: 1, episodeCount: 9),
          ],
          statistics: const {
            'totalEpisodes': 19,
          },
        );
        fakeClient.getSeriesByIdReturn = breakingBad;
        fakeClient.getSeriesDetailReturn = breakingBad;

        await pumpLibrary(tester, items: const [
          LibraryItem(id: 1, title: 'Breaking Bad', type: 'series', year: 2008),
          LibraryItem(id: 5, title: 'Severance', type: 'series', year: 2022),
        ]);

        expect(find.byType(LibraryItemCard), findsNWidgets(2));
        expect(find.byType(SeriesDetailScreen), findsNothing);

        // Tap Breaking Bad
        await tester.tap(find.text('Breaking Bad').first);
        await tester.pumpAndSettle();

        // Right series fetched
        expect(fakeClient.getSeriesByIdCalls, [1]);
        // SeriesDetailScreen refetches in initState for the episode list
        expect(fakeClient.getSeriesDetailCalls, contains(1));

        // SeriesDetailScreen mounted with Breaking Bad title
        expect(find.byType(SeriesDetailScreen), findsOneWidget);
        expect(find.text('Breaking Bad'), findsWidgets);
      },
    );

    testWidgets(
      'back navigation from MovieDetailScreen returns to LibraryScreen',
      (tester) async {
        fakeClient.getMovieReturn = const Movie(
          id: 7,
          title: 'Inception',
          year: 2010,
          monitored: true,
          hasFile: true,
        );

        await pumpLibrary(tester, items: const [
          LibraryItem(id: 7, title: 'Inception', type: 'movie', year: 2010),
        ]);

        await tester.tap(find.text('Inception').first);
        await tester.pumpAndSettle();
        expect(find.byType(MovieDetailScreen), findsOneWidget);

        // Tap the back IconButton on the detail screen header.
        final backButton = find.widgetWithIcon(IconButton, Icons.arrow_back);
        expect(backButton, findsOneWidget);
        await tester.tap(backButton);
        await tester.pumpAndSettle();

        // Detail screen popped; LibraryScreen is back
        expect(find.byType(MovieDetailScreen), findsNothing);
        expect(find.byType(LibraryScreen), findsOneWidget);
        expect(find.text('Inception'), findsWidgets);
      },
    );
  });
}