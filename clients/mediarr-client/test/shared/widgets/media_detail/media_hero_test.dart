import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/widgets/media_detail/media_hero.dart';

/// Widget tests for `MediaHero` — feature-agnostic hero block used by both
/// `MovieDetailScreen` (Phase 3) and `SeriesDetailScreen` (Phase 4).
///
/// Per `test-strategy.md` §4 guardrail #3: this widget takes primitives +
/// callbacks. No Movie/Series/Episode/Season imports. Backdrop, poster,
/// title, subtitle, and a list of action buttons are configurable.
void main() {
  Widget buildTestApp({required Widget child}) {
    return MaterialApp(
      theme: mediarrDarkTheme,
      home: Scaffold(body: child),
    );
  }

  group('MediaHero', () {
    testWidgets('renders title and subtitle', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const MediaHero(
          title: 'Inception',
          subtitle: '2010 · 148 min',
        ),
      ));

      expect(find.text('Inception'), findsOneWidget);
      expect(find.text('2010 · 148 min'), findsOneWidget);
    });

    testWidgets('shows a designed fallback instead of a gray placeholder',
        (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const MediaHero(title: 'No Poster'),
      ));

      // F11: with no landscape backdrop the hero renders a designed gradient
      // and the title. The gray placeholder icon is gone, and a portrait
      // poster is never cropped into the banner.
      expect(find.text('No Poster'), findsOneWidget);
      expect(find.byType(Icon), findsNothing);
    });

    testWidgets('renders action buttons with icons and labels', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: MediaHero(
          title: 'Severance',
          actions: const [
            MediaHeroAction(
              label: 'Play',
              icon: Icons.play_arrow,
              onPressed: null,
            ),
            MediaHeroAction(
              label: 'Search',
              icon: Icons.search,
              onPressed: null,
            ),
          ],
        ),
      ));

      expect(find.text('Play'), findsOneWidget);
      expect(find.text('Search'), findsOneWidget);
      expect(find.byIcon(Icons.play_arrow), findsOneWidget);
      expect(find.byIcon(Icons.search), findsOneWidget);
    });

    testWidgets('fires onPressed when an action button is tapped', (tester) async {
      var playTaps = 0;
      var searchTaps = 0;

      await tester.pumpWidget(buildTestApp(
        child: MediaHero(
          title: 'Inception',
          actions: [
            MediaHeroAction(
              label: 'Play',
              icon: Icons.play_arrow,
              onPressed: () => playTaps++,
            ),
            MediaHeroAction(
              label: 'Search',
              icon: Icons.search,
              onPressed: () => searchTaps++,
            ),
          ],
        ),
      ));

      await tester.tap(find.text('Play'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Search'));
      await tester.pumpAndSettle();

      expect(playTaps, 1);
      expect(searchTaps, 1);
    });

    testWidgets('renders with empty actions list without crashing', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const MediaHero(
          title: 'Read-only Hero',
          actions: [],
        ),
      ));

      expect(find.text('Read-only Hero'), findsOneWidget);
    });

    testWidgets(
      'a long title is fitted instead of ellipsed in a narrow pane (FR-2)',
      (tester) async {
        // Series detail puts the hero in a two-pane layout: a 4/9 left column
        // of the ~1119 px TV content area, so the title only gets ~300 px.
        // At the fixed 44 px size "How I Met Your Mother" needs a third line
        // and was clipped with an ellipsis (owner report 2026-11-16).
        const title = 'How I Met Your Mother';
        await tester.pumpWidget(
          buildTestApp(
            child: const SizedBox(
              width: 300,
              height: 240,
              child: MediaHero(title: title),
            ),
          ),
        );

        final paragraph = tester.renderObject<RenderParagraph>(
          find.text(title),
        );
        expect(
          paragraph.didExceedMaxLines,
          isFalse,
          reason:
              'The series title must render in full. "How I Met Your Mother" '
              'was ellipsed at the fixed 44 px size in the series-detail pane.',
        );
        expect(
          paragraph.text.style!.fontSize,
          lessThan(44),
          reason:
              'The hero must auto-shrink a long title rather than clip it.',
        );
      },
    );
  });
}
