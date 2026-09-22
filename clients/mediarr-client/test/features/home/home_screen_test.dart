import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

/// Widget tests for the Netflix-style HomeScreen (FR-11).
///
/// Layout: hero banner + horizontal rows (Continue Watching, Recently Added,
/// Movies, TV Shows). The old "Upcoming" row was promoted into the hero.
void main() {
  group('HomeScreen', () {
    ProviderContainer createContainer({
      List<Override> overrides = const [],
    }) {
      return ProviderContainer(
        overrides: [
          continueWatchingProvider.overrideWith((ref) async => const []),
          upcomingProvider.overrideWith((ref) async => const []),
          recentlyAddedProvider.overrideWith((ref) async => const []),
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

      expect(find.text('Test Movie'), findsOneWidget);
      expect(find.text('50% · Resume at 30:00'), findsOneWidget);
      expect(find.text('Continue Watching'), findsOneWidget);
    });

    testWidgets('renders upcoming items in the hero banner subtitle',
        (tester) async {
      final container = createContainer(
        overrides: [
          upcomingProvider.overrideWith(
            (ref) async => [
              const UpcomingItem(
                id: 1,
                title: 'Upcoming Movie',
                type: 'movie',
                date: '2026-04-25',
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

      // Hero banner uses the first upcoming item as its title and shows
      // "Coming 2026-04-25" as the subtitle.
      expect(find.text('Upcoming Movie'), findsWidgets);
      expect(find.textContaining('2026-04-25'), findsWidgets);
    });

    testWidgets('upcoming episodes render in the hero with date subtitle',
        (tester) async {
      final container = createContainer(
        overrides: [
          upcomingProvider.overrideWith(
            (ref) async => [
              const UpcomingItem(
                id: 1,
                title: 'Episode Title',
                type: 'episode',
                date: '2026-04-25',
                seasonNumber: 2,
                episodeNumber: 5,
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

      expect(find.text('Episode Title'), findsWidgets);
      expect(find.textContaining('2026-04-25'), findsWidgets);
    });

    testWidgets('renders recently added activity events', (tester) async {
      final container = createContainer(
        overrides: [
          recentlyAddedProvider.overrideWith(
            (ref) async => [
              ActivityEvent(
                id: 1,
                eventType: 'download',
                sourceModule: 'TorrentManager',
                summary: 'Movie downloaded',
                success: true,
                occurredAt: DateTime.now(),
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

      expect(find.text('Movie downloaded'), findsOneWidget);
      expect(find.text('TorrentManager'), findsOneWidget);
    });

    testWidgets('shows fallback copy in Recently Added when no events',
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

      expect(find.text('No recent activity'), findsOneWidget);
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

    testWidgets('continue watching card has a tappable focusable element',
        (tester) async {
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

      expect(find.text('Test Movie'), findsOneWidget);
      // The card is tappable via InkWell in ContinueWatchingSection.
      expect(find.byType(InkWell), findsWidgets);
    });
  });
}
