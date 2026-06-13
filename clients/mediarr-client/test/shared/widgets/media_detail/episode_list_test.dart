import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/widgets/media_detail/episode_list.dart';

/// Widget tests for `EpisodeList` — feature-agnostic episode list used by
/// `SeriesDetailScreen` (Phase 4).
///
/// Per `test-strategy.md` §4 guardrail #3: no Episode/Season imports. The
/// widget takes a list of `EpisodeListSeason` records (seasonNumber, total
/// count, on-disk count, episodes) plus per-episode `onPlay` / `onSearch` /
/// `onToggleMonitored` callbacks. Tapping a season chip filters the visible
/// episode list.
void main() {
  Widget buildTestApp({required Widget child}) {
    return MaterialApp(
      theme: mediarrDarkTheme,
      home: Scaffold(body: child),
    );
  }

  EpisodeListSeason twoSeasons() => const EpisodeListSeason(
        seasons: [
          EpisodeListSeasonData(
            seasonNumber: 1,
            totalCount: 7,
            onDiskCount: 7,
            episodes: [
              EpisodeListItem(
                id: 101,
                episodeNumber: 1,
                title: 'Pilot',
                hasFile: true,
                quality: 'Bluray-1080p',
              ),
              EpisodeListItem(
                id: 102,
                episodeNumber: 2,
                title: "Cat's in the Bag...",
                hasFile: true,
                quality: 'Bluray-1080p',
              ),
            ],
          ),
          EpisodeListSeasonData(
            seasonNumber: 2,
            totalCount: 13,
            onDiskCount: 10,
            episodes: [
              EpisodeListItem(
                id: 201,
                episodeNumber: 1,
                title: 'Seven Thirty-Seven',
                hasFile: true,
                quality: 'Bluray-1080p',
              ),
              EpisodeListItem(
                id: 202,
                episodeNumber: 2,
                title: 'Grilled',
                hasFile: false,
              ),
            ],
          ),
        ],
      );

  group('EpisodeList', () {
    testWidgets('renders a season chip per season', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: EpisodeList(data: twoSeasons()),
      ));

      // Both season chips are visible.
      expect(find.text('S1'), findsOneWidget);
      expect(find.text('S2'), findsOneWidget);
    });

    testWidgets('renders on-disk / total counts on the season chips',
        (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: EpisodeList(data: twoSeasons()),
      ));

      // Season 1: 7/7 on disk.
      expect(find.textContaining('7/7'), findsOneWidget);
      // Season 2: 10/13 on disk.
      expect(find.textContaining('10/13'), findsOneWidget);
    });

    testWidgets('renders only the selected season\'s episodes by default',
        (tester) async {
      // selectedSeasonNumber: 1 — only season 1's episodes should be in the
      // tree initially.
      await tester.pumpWidget(buildTestApp(
        child: const EpisodeList(
          data: twoSeasons(),
          selectedSeasonNumber: 1,
        ),
      ));

      expect(find.text('Pilot'), findsOneWidget);
      expect(find.text("Cat's in the Bag..."), findsOneWidget);
      // Season 2 episode titles must not be in the tree.
      expect(find.text('Seven Thirty-Seven'), findsNothing);
      expect(find.text('Grilled'), findsNothing);
    });

    testWidgets('tapping a season chip switches the visible episode list',
        (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const EpisodeList(
          data: twoSeasons(),
          selectedSeasonNumber: 1,
        ),
      ));

      // Initially on season 1.
      expect(find.text('Pilot'), findsOneWidget);
      expect(find.text('Seven Thirty-Seven'), findsNothing);

      // Tap the S2 chip.
      await tester.tap(find.text('S2'));
      await tester.pumpAndSettle();

      // Now season 2's episodes are visible and season 1's are not.
      expect(find.text('Seven Thirty-Seven'), findsOneWidget);
      expect(find.text('Grilled'), findsOneWidget);
      expect(find.text('Pilot'), findsNothing);
    });

    testWidgets('renders per-episode action icons and fires callbacks on tap',
        (tester) async {
      var playTaps = <int>[];
      var searchTaps = <int>[];

      await tester.pumpWidget(buildTestApp(
        child: EpisodeList(
          data: const EpisodeListSeason(
            seasons: [
              EpisodeListSeasonData(
                seasonNumber: 1,
                totalCount: 1,
                onDiskCount: 1,
                episodes: [
                  EpisodeListItem(
                    id: 101,
                    episodeNumber: 1,
                    title: 'Pilot',
                    hasFile: true,
                    quality: 'Bluray-1080p',
                  ),
                ],
              ),
            ],
          ),
          selectedSeasonNumber: 1,
          onPlayEpisode: (item) => playTaps.add(item.id),
          onSearchEpisode: (item) => searchTaps.add(item.id),
        ),
      ));

      // Episode row is present.
      expect(find.text('Pilot'), findsOneWidget);

      // Per-episode Play and Search icons are present.
      expect(find.byIcon(Icons.play_arrow), findsWidgets);
      expect(find.byIcon(Icons.search), findsWidgets);

      // Tap the first Play icon in the row.
      await tester.tap(find.byIcon(Icons.play_arrow).first);
      await tester.pumpAndSettle();
      expect(playTaps, [101]);

      // Tap the first Search icon in the row.
      await tester.tap(find.byIcon(Icons.search).first);
      await tester.pumpAndSettle();
      expect(searchTaps, [101]);
    });

    testWidgets('shows an empty state when there are no seasons', (tester) async {
      // Per test-strategy §6: Series with zero seasons / zero episodes must
      // show an empty state, not crash.
      await tester.pumpWidget(buildTestApp(
        child: const EpisodeList(
          data: EpisodeListSeason(seasons: []),
        ),
      ));

      // Some "no seasons" / "no episodes" placeholder text must be rendered
      // and the widget must not have thrown.
      expect(find.textContaining('No'), findsWidgets);
      expect(tester.takeException(), isNull);
    });
  });
}
