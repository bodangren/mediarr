import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

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
          ...overrides,
        ],
      );
    }

    testWidgets('renders all section headers', (tester) async {
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

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Continue Watching'), findsOneWidget);
      expect(find.text('Upcoming'), findsOneWidget);
      expect(find.text('Recently Added'), findsOneWidget);
    });

    testWidgets('renders continue watching items', (tester) async {
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
    });

    testWidgets('renders upcoming items', (tester) async {
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

      expect(find.text('Upcoming Movie'), findsOneWidget);
      expect(find.text('2026-04-25'), findsOneWidget);
    });

    testWidgets('renders upcoming episodes with season/episode label',
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

      expect(find.text('Episode Title'), findsOneWidget);
      expect(find.text('S02E05'), findsOneWidget);
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

    testWidgets('shows empty state for upcoming when no items',
        (tester) async {
      final container = createContainer();
      addTearDown(container.dispose);

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

      expect(find.text('No upcoming releases'), findsOneWidget);
    });

    testWidgets('shows empty state for recently added when no events',
        (tester) async {
      final container = createContainer();
      addTearDown(container.dispose);

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

    testWidgets('hides continue watching when empty and not loading',
        (tester) async {
      final container = createContainer();
      addTearDown(container.dispose);

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

      // When empty and not loading, ContinueWatchingSection returns SizedBox.shrink()
      expect(find.text('Continue Watching'), findsNothing);
      expect(find.text('No upcoming releases'), findsOneWidget);
    });

    testWidgets('continue watching card is tappable', (tester) async {
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

      // Verify the card is present and tappable (InkWell wrapper)
      expect(find.text('Test Movie'), findsOneWidget);
      expect(find.byType(InkWell), findsOneWidget);
    });
  });
}
