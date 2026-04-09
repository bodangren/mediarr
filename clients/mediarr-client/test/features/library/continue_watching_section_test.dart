import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

void main() {
  group('ContinueWatchingSection', () {
    testWidgets('renders items and progress values', (tester) async {
      final items = [
        ContinueWatchingItem(
          mediaType: 'MOVIE',
          mediaId: 1,
          title: 'Movie One',
          position: 600,
          duration: 1200,
          progress: 0.5,
          lastWatched: DateTime.parse('2026-04-09T00:00:00.000Z'),
        ),
        ContinueWatchingItem(
          mediaType: 'EPISODE',
          mediaId: 2,
          title: 'Series One',
          episodeTitle: 'Pilot',
          seasonNumber: 1,
          episodeNumber: 1,
          position: 180,
          duration: 1800,
          progress: 0.1,
          lastWatched: DateTime.parse('2026-04-09T00:01:00.000Z'),
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: Scaffold(
            body: ContinueWatchingSection(
              items: items,
              isLoading: false,
              onResume: (_) {},
            ),
          ),
        ),
      );

      expect(find.text('Continue Watching'), findsOneWidget);
      expect(find.text('Movie One'), findsOneWidget);
      expect(find.text('Series One'), findsOneWidget);
      expect(find.textContaining('S01E01'), findsOneWidget);

      final progressBars =
          tester.widgetList<LinearProgressIndicator>(find.byType(LinearProgressIndicator)).toList();
      expect(progressBars, hasLength(2));
      expect(progressBars[0].value, 0.5);
      expect(progressBars[1].value, 0.1);
    });

    testWidgets('hides section when items are empty', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: const Scaffold(
            body: ContinueWatchingSection(
              items: [],
              isLoading: false,
              onResume: _noopResume,
            ),
          ),
        ),
      );

      expect(find.text('Continue Watching'), findsNothing);
      expect(find.byType(LinearProgressIndicator), findsNothing);
    });

    testWidgets('invokes onResume when tapping an item', (tester) async {
      ContinueWatchingItem? tapped;
      final item = ContinueWatchingItem(
        mediaType: 'MOVIE',
        mediaId: 7,
        title: 'Resume Me',
        position: 42,
        duration: 420,
        progress: 0.1,
        lastWatched: DateTime.parse('2026-04-09T00:00:00.000Z'),
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: Scaffold(
            body: ContinueWatchingSection(
              items: [item],
              isLoading: false,
              onResume: (selected) => tapped = selected,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Resume Me'));
      await tester.pumpAndSettle();

      expect(tapped, isNotNull);
      expect(tapped?.mediaId, 7);
    });
  });
}

void _noopResume(ContinueWatchingItem _) {}
