import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/models/subtitle_availability.dart';
import 'package:mediarr_client/shared/widgets/media_detail/episode_list.dart';
import 'package:mediarr_client/shared/widgets/poster_card.dart';
import 'package:mediarr_client/shared/widgets/subtitle_badge.dart';

/// FR-5 (owner report 2026-11-16): "All videos should have a badge which
/// indicates whether the required chinese / english subs exist."
///
/// The badge reads server truth (`subtitleAvailability`), so these tests pin the
/// four states and the two placements that carry it: a poster tile and an
/// episode row. A null availability must render nothing rather than a
/// misleading "无字幕".
void main() {
  Widget app(Widget child) =>
      MaterialApp(theme: mediarrDarkTheme, home: Scaffold(body: child));

  group('SubtitleBadge', () {
    testWidgets('says 中英 when both languages exist', (tester) async {
      await tester.pumpWidget(
        app(const SubtitleBadge(availability: SubtitleAvailability(zh: true, en: true))),
      );
      expect(find.text('中英'), findsOneWidget);
    });

    testWidgets('says 中文 for Chinese only', (tester) async {
      await tester.pumpWidget(
        app(const SubtitleBadge(availability: SubtitleAvailability(zh: true))),
      );
      expect(find.text('中文'), findsOneWidget);
    });

    testWidgets('says EN for English only', (tester) async {
      await tester.pumpWidget(
        app(const SubtitleBadge(availability: SubtitleAvailability(en: true))),
      );
      expect(find.text('EN'), findsOneWidget);
    });

    testWidgets('marks 无字幕 when neither exists', (tester) async {
      await tester.pumpWidget(
        app(const SubtitleBadge(availability: SubtitleAvailability.none)),
      );
      expect(find.text('无字幕'), findsOneWidget);
    });
  });

  group('badge placement', () {
    testWidgets('poster tile shows the badge when the payload carries it', (
      tester,
    ) async {
      await tester.pumpWidget(
        app(
          const SizedBox(
            width: 165,
            height: 285,
            child: PosterCard(
              title: 'Rock Star',
              hasFile: true,
              subtitleAvailability: SubtitleAvailability(zh: true, en: true),
            ),
          ),
        ),
      );
      expect(find.text('中英'), findsOneWidget);
    });

    testWidgets('poster tile hides the badge when availability is unknown', (
      tester,
    ) async {
      await tester.pumpWidget(
        app(
          const SizedBox(
            width: 165,
            height: 285,
            child: PosterCard(title: 'Rock Star', hasFile: true),
          ),
        ),
      );
      expect(find.byType(SubtitleBadge), findsNothing);
    });

    testWidgets('episode row shows a per-episode badge for a downloaded file', (
      tester,
    ) async {
      final data = EpisodeListSeason(
        seasons: [
          EpisodeListSeasonData(
            seasonNumber: 1,
            totalCount: 2,
            onDiskCount: 2,
            episodes: const [
              EpisodeListItem(
                id: 1,
                episodeNumber: 1,
                title: 'Pilot',
                hasFile: true,
                subtitleAvailability: SubtitleAvailability(zh: true),
              ),
              EpisodeListItem(
                id: 2,
                episodeNumber: 2,
                title: 'Second',
                hasFile: true,
                subtitleAvailability: SubtitleAvailability(en: true),
              ),
            ],
          ),
        ],
      );

      await tester.pumpWidget(
        app(SingleChildScrollView(child: EpisodeList(data: data))),
      );

      expect(find.text('中文'), findsOneWidget);
      expect(find.text('EN'), findsOneWidget);
    });
  });
}
