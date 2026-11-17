import 'package:cached_network_image/cached_network_image.dart';
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
    testWidgets(
        'opens on the first season that has a file, not an empty specials '
        'season', (tester) async {
      // Owner defect 2026-11-07: Murderbot's S0 has one missing special, and
      // the list opened there, so Select did nothing visible. The default
      // season is the first one a viewer can actually watch.
      await tester.pumpWidget(
        buildTestApp(
          child: EpisodeList(
            data: const EpisodeListSeason(
              seasons: [
                EpisodeListSeasonData(
                  seasonNumber: 0,
                  totalCount: 1,
                  onDiskCount: 0,
                  episodes: [
                    EpisodeListItem(
                      id: 900,
                      episodeNumber: 1,
                      title: 'Unmasked',
                      hasFile: false,
                    ),
                  ],
                ),
                EpisodeListSeasonData(
                  seasonNumber: 1,
                  totalCount: 2,
                  onDiskCount: 2,
                  episodes: [
                    EpisodeListItem(
                      id: 901,
                      episodeNumber: 1,
                      title: 'FreeCommerce',
                      hasFile: true,
                    ),
                  ],
                ),
              ],
            ),
            onPlayEpisode: (_) {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('FreeCommerce'), findsOneWidget,
          reason: 'The season with the file must be the one shown first.');
      expect(find.text('Unmasked'), findsNothing);
    });

    testWidgets('falls back to the first season when nothing has a file', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildTestApp(
          child: const EpisodeList(
            data: EpisodeListSeason(
              seasons: [
                EpisodeListSeasonData(
                  seasonNumber: 1,
                  totalCount: 1,
                  onDiskCount: 0,
                  episodes: [
                    EpisodeListItem(
                      id: 1,
                      episodeNumber: 1,
                      title: 'Only Episode',
                      hasFile: false,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Only Episode'), findsOneWidget);
    });

    testWidgets('renders a season chip per season', (tester) async {
      await tester.pumpWidget(
        buildTestApp(child: EpisodeList(data: twoSeasons())),
      );

      // Both season chips are visible.
      expect(find.text('S1'), findsOneWidget);
      expect(find.text('S2'), findsOneWidget);
    });

    testWidgets('renders on-disk / total counts on the season chips', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildTestApp(child: EpisodeList(data: twoSeasons())),
      );

      // Season 1: 7/7 on disk.
      expect(find.textContaining('7/7'), findsOneWidget);
      // Season 2: 10/13 on disk.
      expect(find.textContaining('10/13'), findsOneWidget);
    });

    testWidgets('renders only the selected season\'s episodes by default', (
      tester,
    ) async {
      // selectedSeasonNumber: 1 — only season 1's episodes should be in the
      // tree initially.
      await tester.pumpWidget(
        buildTestApp(
          child: EpisodeList(data: twoSeasons(), selectedSeasonNumber: 1),
        ),
      );

      expect(find.text('Pilot'), findsOneWidget);
      expect(find.text("Cat's in the Bag..."), findsOneWidget);
      // Season 2 episode titles must not be in the tree.
      expect(find.text('Seven Thirty-Seven'), findsNothing);
      expect(find.text('Grilled'), findsNothing);
    });

    testWidgets('tapping a season chip switches the visible episode list', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildTestApp(
          child: EpisodeList(data: twoSeasons(), selectedSeasonNumber: 1),
        ),
      );

      // Initially on season 1.
      expect(find.text('Pilot'), findsOneWidget);
      expect(find.text('Seven Thirty-Seven'), findsNothing);

      // Tap the S2 chip.
      await tester.tap(find.widgetWithText(ChoiceChip, 'S2'));
      await tester.pumpAndSettle();

      // Now season 2's episodes are visible and season 1's are not.
      expect(find.text('Seven Thirty-Seven'), findsOneWidget);
      expect(find.text('Grilled'), findsOneWidget);
      expect(find.text('Pilot'), findsNothing);
    });


    testWidgets('the selected season is stated by a check, not by the accent fill',
        (tester) async {
      // Kimi K3.1's 2026-11-17 review: the selected season used the same filled
      // purple as the focused Play button, so "selected" read as "focused".
      await tester.pumpWidget(
        buildTestApp(
          child: EpisodeList(
            data: const EpisodeListSeason(
              seasons: [
                EpisodeListSeasonData(
                  seasonNumber: 1,
                  totalCount: 6,
                  onDiskCount: 6,
                  episodes: [
                    EpisodeListItem(id: 101, episodeNumber: 1, title: 'One', hasFile: true),
                  ],
                ),
                EpisodeListSeasonData(
                  seasonNumber: 2,
                  totalCount: 4,
                  onDiskCount: 0,
                  episodes: [
                    EpisodeListItem(id: 201, episodeNumber: 1, title: 'Two', hasFile: false),
                  ],
                ),
              ],
            ),
            selectedSeasonNumber: 1,
            onPlayEpisode: (_) {},
            onSearchEpisode: (_) {},
          ),
        ),
      );

      final chips = tester.widgetList<ChoiceChip>(find.byType(ChoiceChip)).toList();
      final selected = chips.firstWhere((c) => c.selected);
      expect(selected.selectedColor, isNot(MediarrColors.accentPrimary),
          reason: 'The accent fill belongs to focus; a selected chip must not '
              'look focused.');
      // The tick marks the selected season.
      expect(find.byIcon(Icons.check), findsOneWidget);
    });
    testWidgets('a missing episode offers search, not a play triangle', (
      tester,
    ) async {
      // A missing episode cannot play. It used to render a play triangle next to
      // its search glyph, promising playback it cannot deliver (seen on Monarch
      // S2 on the TV, 2026-11-18).
      var searchTaps = <int>[];

      await tester.pumpWidget(
        buildTestApp(
          child: EpisodeList(
            data: const EpisodeListSeason(
              seasons: [
                EpisodeListSeasonData(
                  seasonNumber: 2,
                  totalCount: 1,
                  onDiskCount: 0,
                  episodes: [
                    EpisodeListItem(
                      id: 201,
                      episodeNumber: 1,
                      title: 'Cause and Effect',
                      hasFile: false,
                    ),
                  ],
                ),
              ],
            ),
            selectedSeasonNumber: 2,
            onPlayEpisode: (_) {},
            onSearchEpisode: (item) => searchTaps.add(item.id),
          ),
        ),
      );

      expect(find.byIcon(Icons.play_arrow), findsNothing,
          reason: 'A missing episode must not advertise playback.');
      expect(find.byIcon(Icons.search), findsOneWidget,
          reason: 'Search is the only action a missing episode can offer.');

      await tester.tap(find.text('Cause and Effect'));
      await tester.pumpAndSettle();
      expect(searchTaps, [201],
          reason: 'Select on a missing episode should search for it.');
    });

    testWidgets('rows play on tap and expose no per-row search stop', (
      tester,
    ) async {
      var playTaps = <int>[];
      var searchTaps = <int>[];

      await tester.pumpWidget(
        buildTestApp(
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
        ),
      );

      // Episode row is present.
      expect(find.text('Pilot'), findsOneWidget);

      // The row is a single focus stop with a play affordance. The per-row
      // magnifier was removed on 2026-11-07: the owner reached it by pressing
      // Right on an episode and had no idea what it did.
      expect(find.byIcon(Icons.play_arrow), findsWidgets);
      expect(find.byIcon(Icons.search), findsNothing,
          reason: 'A playable episode must not offer an unexplained per-row '
              'search control.');

      // Tapping the row is what plays the episode.
      await tester.tap(find.text('Pilot'));
      await tester.pumpAndSettle();
      expect(playTaps, [101]);
      expect(searchTaps, isEmpty);
    });

    testWidgets('marks watched episodes and shows in-progress progress bars', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildTestApp(
          child: const EpisodeList(
            data: EpisodeListSeason(
              seasons: [
                EpisodeListSeasonData(
                  seasonNumber: 1,
                  totalCount: 3,
                  onDiskCount: 3,
                  episodes: [
                    EpisodeListItem(
                      id: 301,
                      episodeNumber: 1,
                      title: 'Finished',
                      hasFile: true,
                      isWatched: true,
                    ),
                    EpisodeListItem(
                      id: 302,
                      episodeNumber: 2,
                      title: 'Halfway',
                      hasFile: true,
                      progress: 0.5,
                    ),
                    EpisodeListItem(
                      id: 303,
                      episodeNumber: 3,
                      title: 'Untouched',
                      hasFile: true,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );

      // Watched rows carry the check and no progress bar.
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      // Only the in-progress row shows a bar.
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      final bar = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(bar.value, closeTo(0.5, 0.001));
    });

    testWidgets('shows an empty state when there are no seasons', (
      tester,
    ) async {
      // Per test-strategy §6: Series with zero seasons / zero episodes must
      // show an empty state, not crash.
      await tester.pumpWidget(
        buildTestApp(
          child: const EpisodeList(data: EpisodeListSeason(seasons: [])),
        ),
      );

      // Some "no seasons" / "no episodes" placeholder text must be rendered
      // and the widget must not have thrown.
      expect(find.textContaining('No'), findsWidgets);
      expect(tester.takeException(), isNull);
    });
    testWidgets('shows an episode still when the server provides one', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildTestApp(
          child: const EpisodeList(
            data: EpisodeListSeason(
              seasons: [
                EpisodeListSeasonData(
                  seasonNumber: 1,
                  totalCount: 2,
                  onDiskCount: 2,
                  episodes: [
                    EpisodeListItem(
                      id: 401,
                      episodeNumber: 1,
                      title: 'With still',
                      hasFile: true,
                      thumbUrl: '/api/episodes/401/thumbnail',
                    ),
                    EpisodeListItem(
                      id: 402,
                      episodeNumber: 2,
                      title: 'No still',
                      hasFile: true,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );

      // The server-generated still is requested for the row that has one; the
      // text-only row keeps its previous layout.
      final images = find.byType(CachedNetworkImage);
      expect(images, findsOneWidget);
      expect(
        tester.widget<CachedNetworkImage>(images).imageUrl,
        contains('/api/episodes/401/thumbnail'),
      );
    });

  });
}