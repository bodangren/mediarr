import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

/// Widget tests for the Netflix-style HomeScreen (FR-11).
///
/// Layout: hero banner (real media item) + horizontal rows (Continue Watching,
/// Recently Added, Movies, TV Shows). Recently Added fetches real media via
/// `/api/media/library?sortBy=added&sortDir=desc`, NOT the activity log.
void main() {
  group('HomeScreen', () {
    ProviderContainer createContainer({
      List<Override> overrides = const [],
    }) {
      return ProviderContainer(
        overrides: [
          continueWatchingProvider.overrideWith((ref) async => const []),
          // Override upcomingProvider for any leftover callers.
          upcomingProvider.overrideWith((ref) async => const []),
          recentlyAddedProvider.overrideWith((ref) async => const <LibraryItem>[]),
          homeMoviesProvider.overrideWith((ref) async => const []),
          homeSeriesProvider.overrideWith((ref) async => const []),
          ...overrides,
        ],
      );
    }

    void setLargeViewport(WidgetTester tester) {
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
    }

    testWidgets('renders all horizontal row headers (Netflix layout)',
        (tester) async {
      final container = createContainer();
      addTearDown(container.dispose);
      setLargeViewport(tester);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const HomeScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Continue Watching'), findsNothing,
          reason:
              'Empty Continue Watching row is hidden (it returns SizedBox.shrink).');
      expect(find.text('Recently Added'), findsOneWidget);
      expect(find.text('Movies'), findsOneWidget);
      expect(find.text('TV Shows'), findsOneWidget);
    });

    testWidgets('renders continue watching items when present', (tester) async {
      final container = createContainer(
        overrides: [
          continueWatchingProvider.overrideWith(
            (ref) async => [
              ContinueWatchingItem(
                mediaId: 1,
                mediaType: 'movie',
                title: 'Test Movie',
                progress: 0.5,
                position: 1800,
                duration: 3600,
                lastWatched: DateTime.now(),
              ),
            ],
          ),
        ],
      );
      addTearDown(container.dispose);
      setLargeViewport(tester);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const HomeScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Test Movie'), findsWidgets);
      // FR-3: the card shows the percent at the progress bar and the
      // `Resume at mm:ss` line under the title.
      expect(find.text('50%'), findsOneWidget);
      expect(find.text('Resume at 30:00'), findsOneWidget);
      expect(find.text('Continue Watching'), findsOneWidget);
    });

    testWidgets(
      'hero shows the continue-watching item title + synopsis NOT the '
      'generic "Welcome to Mediarr" fallback',
      (tester) async {
        final container = createContainer(
          overrides: [
            continueWatchingProvider.overrideWith(
              (ref) async => [
                ContinueWatchingItem(
                  mediaId: 7,
                  mediaType: 'movie',
                  title: 'Hero Movie',
                  progress: 0.2,
                  position: 600,
                  duration: 3000,
                  lastWatched: DateTime.now(),
                  backdropUrl: 'https://example.com/hero.jpg',
                ),
              ],
            ),
          ],
        );
        addTearDown(container.dispose);
        setLargeViewport(tester);

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp(
              theme: mediarrDarkTheme,
              home: const HomeScreen(),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Hero Movie'), findsWidgets,
            reason:
                'Hero must surface the continue-watching item title instead '
                'of the generic "Welcome to Mediarr" fallback when one '
                'exists.');
        expect(find.text('Welcome to Mediarr'), findsNothing);
      },
    );

    testWidgets(
      'Recently Added row uses real media items (posters + titles), NOT '
      'the activity log labels',
      (tester) async {
        final container = createContainer(
          overrides: [
            recentlyAddedProvider.overrideWith(
              (ref) async => [
                LibraryItem(
                  id: 1,
                  title: 'The Matrix',
                  type: 'movie',
                  year: 1999,
                  posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
                  added: DateTime.parse('2026-09-21T22:18:24Z'),
                ),
                LibraryItem(
                  id: 2,
                  title: 'Rick and Morty',
                  type: 'series',
                  year: 2025,
                  posterUrl: 'https://image.tmdb.org/t/p/w500/poster2.jpg',
                  added: DateTime.parse('2026-09-22T12:29:55Z'),
                ),
              ],
            ),
          ],
        );
        addTearDown(container.dispose);
        setLargeViewport(tester);

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp(
              theme: mediarrDarkTheme,
              home: const HomeScreen(),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('The Matrix'), findsWidgets,
            reason:
                'Recently Added must render real media items (movie titles) '
                'instead of activity-log labels like "Newest"/"Older".');
        expect(find.text('Rick and Morty'), findsWidgets);
        expect(find.text('Newest'), findsNothing,
            reason: 'The activity-log "Newest" label must not appear.');
        expect(find.text('Older'), findsNothing,
            reason: 'The activity-log "Older" label must not appear.');
      },
    );

    testWidgets(
      'hero falls back to first recently-added media item when no continue-watching entry',
      (tester) async {
        final container = createContainer(
          overrides: [
            recentlyAddedProvider.overrideWith(
              (ref) async => const [
                LibraryItem(
                  id: 1,
                  title: 'Recently Added Movie',
                  type: 'movie',
                  year: 2024,
                  overview: 'A test overview that the hero must show.',
                  posterUrl: 'https://example.com/poster.jpg',
                ),
              ],
            ),
          ],
        );
        addTearDown(container.dispose);
        setLargeViewport(tester);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const HomeScreen(),
          ),
        ),
      );
        await tester.pumpAndSettle();

        expect(find.text('Recently Added Movie'), findsWidgets,
            reason: 'Hero must surface the first recently-added media item '
                'when no continue-watching item is available.');
        expect(find.text('A test overview that the hero must show.'),
            findsOneWidget,
            reason: 'Hero must render the media item synopsis.');
        expect(find.text('Welcome to Mediarr'), findsNothing);
      },
    );

    testWidgets('shows fallback copy in Recently Added when empty',
        (tester) async {
      final container = createContainer();
      addTearDown(container.dispose);
      setLargeViewport(tester);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const HomeScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('No recent media'), findsOneWidget);
    });

    testWidgets('hides Continue Watching when empty and not loading',
        (tester) async {
      final container = createContainer();
      addTearDown(container.dispose);
      setLargeViewport(tester);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const HomeScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Continue Watching'), findsNothing);
    });
  });
}
