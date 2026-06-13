import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/library/series_detail_screen.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/season.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';
import 'package:mediarr_client/shared/widgets/media_detail/action_bar.dart';
import 'package:mediarr_client/shared/widgets/media_detail/episode_list.dart';
import 'package:mediarr_client/shared/widgets/media_detail/file_info_card.dart';
import 'package:mediarr_client/shared/widgets/media_detail/media_hero.dart';
import 'package:mediarr_client/shared/widgets/media_detail/metadata_section.dart';

import '../../support/fakes/fake_api_client.dart';

/// Widget tests for `SeriesDetailScreen` (Phase 4 of
/// `feature_flutter_media_detail_20260508`).
///
/// Per `test-strategy.md` §4 guardrail #1: the screen receives a fully-loaded
/// `Series` via `Navigator.push` (no go_router `:id` paths). Per §4 guardrail
/// #3: the screen is composed of the **shared** `MediaHero`, `MetadataSection`,
/// `ActionBar`, `FileInfoCard`, `EpisodeList` widgets (Phase 2 Green) — not
/// bespoke header / season-tile / episode-row. Per §5 Phase 4:
///   - loading/error/success surfaced for the `getSeriesDetail` fetch via the
///     `Completer` trick (this file's `getSeriesDetailCompleter`).
///   - season selector drives the visible episode list (pump with 2 seasons,
///     assert S1 episodes visible, tap S2 chip, assert S2 episodes visible).
///   - episode play action lives inside the shared `EpisodeList` and routes
///     to the player with `(episodeId, 'episode')`.
///   - per-episode search lives inside the shared `EpisodeList` and triggers
///     a `searchReleases` call (NOT the in-sheet `SubtitleSearchSheet` /
///     `QualityUpgradeSheet` patterns from the current bespoke screen).
///   - series-level action bar exposes "Search All Missing" (non-destructive)
///     and "Delete Series" (destructive via `ActionBar`'s AlertDialog flow).
///
/// These tests are intentionally RED at HEAD: the current 622-line
/// `SeriesDetailScreen` builds its own poster sidebar / metadata chips /
/// season-tile / episode-row, has no series-level action bar (no "Search All
/// Missing", no "Delete Series"), uses subtitle/quality modal sheets instead
/// of an in-`EpisodeList` per-episode search via `searchReleases`, and renders
/// season labels as "Season 1" / "Season 2" — not the chip-based "S1" / "S2"
/// selector the shared `EpisodeList` provides. Each failing test below is the
/// proof that the contract is incomplete; Phase 4 implement (Green) is the
/// role that must land the changes that flip them to GREEN.
void main() {
  group('SeriesDetailScreen', () {
    late FakeMediarrApiClient fakeClient;

    // --- Test fixtures ---

    Series twoSeasonSeries() => const Series(
          id: 1,
          title: 'Breaking Bad',
          year: 2008,
          overview: 'A chemistry teacher turned meth maker.',
          monitored: true,
          posterUrl: 'https://example.com/bb.jpg',
          network: 'AMC',
          status: 'ended',
          sizeOnDisk: 90 * 1024 * 1024 * 1024,
          seasons: [
            Season(
              id: 11,
              seasonNumber: 1,
              episodeCount: 7,
              episodeFileCount: 7,
              episodes: [
                Episode(
                  id: 101,
                  seasonNumber: 1,
                  episodeNumber: 1,
                  title: 'Pilot',
                  airDateUtc: '2008-01-20T00:00:00Z',
                  hasFile: true,
                  monitored: true,
                  quality: 'Bluray-1080p',
                ),
                Episode(
                  id: 102,
                  seasonNumber: 1,
                  episodeNumber: 2,
                  title: "Cat's in the Bag...",
                  airDateUtc: '2008-01-27T00:00:00Z',
                  hasFile: true,
                  monitored: true,
                  quality: 'Bluray-1080p',
                ),
              ],
            ),
            Season(
              id: 12,
              seasonNumber: 2,
              episodeCount: 13,
              episodeFileCount: 10,
              episodes: [
                Episode(
                  id: 201,
                  seasonNumber: 2,
                  episodeNumber: 1,
                  title: 'Seven Thirty-Seven',
                  hasFile: true,
                  monitored: true,
                  quality: 'Bluray-1080p',
                ),
                Episode(
                  id: 202,
                  seasonNumber: 2,
                  episodeNumber: 2,
                  title: 'Grilled',
                  hasFile: false,
                  monitored: true,
                ),
              ],
            ),
          ],
        );

    Series oneEpisodeSeries() => const Series(
          id: 5,
          title: 'Severance',
          year: 2022,
          overview: 'A workplace thriller.',
          monitored: true,
          seasons: [
            Season(
              id: 51,
              seasonNumber: 1,
              episodeCount: 1,
              episodeFileCount: 1,
              episodes: [
                Episode(
                  id: 501,
                  seasonNumber: 1,
                  episodeNumber: 1,
                  title: 'Good News About Hell',
                  hasFile: true,
                  monitored: true,
                  quality: 'WEB-DL-1080p',
                ),
              ],
            ),
          ],
        );

    setUp(() {
      fakeClient = FakeMediarrApiClient();
      fakeClient.getSeriesByIdReturn = twoSeasonSeries();
      fakeClient.getSeriesDetailReturn = twoSeasonSeries();
    });

    Future<void> pumpDetail(
      WidgetTester tester, {
      Series? series,
      bool settle = true,
    }) async {
      // The refactored SeriesDetailScreen composes the shared `MediaHero` /
      // `MetadataSection` / `ActionBar` widgets in a SingleChildScrollView
      // alongside the `EpisodeList`. The episode rows in the shared widget
      // use a Row with multiple Text + IconButton children whose natural
      // width exceeds 500px on the default 800×600 surface — overflows are
      // fatal in tests. Use a TV-sized surface so everything fits.
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiClientProvider.overrideWith((ref) => fakeClient),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: Scaffold(
              body: SeriesDetailScreen(series: series ?? twoSeasonSeries()),
            ),
          ),
        ),
      );
      if (settle) {
        await tester.pumpAndSettle();
      } else {
        // Single frame for async fetches that we deliberately want to hold
        // open (e.g. via [Completer] — the loading-state test).
        await tester.pump();
      }
    }

    testWidgets(
      'shows a loading indicator while the getSeriesDetail fetch is pending',
      (tester) async {
        final completer = Completer<Series?>();
        fakeClient.getSeriesDetailCompleter = completer;

        // settle:false — pumpDetail uses a single pump so the screen sits
        // in its loading state with the detail fetch still pending.
        await pumpDetail(tester, settle: false);
        expect(find.byType(CircularProgressIndicator), findsWidgets,
            reason:
                'SeriesDetailScreen must show a loading indicator while a '
                'getSeriesDetail fetch is in flight (Completer pending).');

        completer.complete(twoSeasonSeries());
        await tester.pumpAndSettle();
      },
    );

    testWidgets(
      'shows a distinct error state when the getSeriesDetail fetch fails '
      '(text containing "error")',
      (tester) async {
        fakeClient.getSeriesDetailError =
            Exception('Series service unavailable');

        await pumpDetail(tester);

        // The screen must surface the failure as a distinguishable UI element
        // whose text contains the word "error" — not just a spinner, not just
        // an exception.toString() dump. This matches the Phase 3
        // MovieDetailScreen error-state contract and the production-quality
        // affordance a user needs to recover.
        expect(
          find.byWidgetPredicate(
            (w) =>
                w is Text &&
                (w.data?.toLowerCase().contains('error') ?? false),
          ),
          findsOneWidget,
          reason:
              'SeriesDetailScreen must surface getSeriesDetail failures with a '
              'distinguishable error UI element (Text containing "error"), '
              'matching the Phase 3 MovieDetailScreen error-state contract.',
        );
      },
    );

    testWidgets(
      'success state composes the shared MediaHero, MetadataSection, '
      'FileInfoCard, ActionBar, and EpisodeList widgets',
      (tester) async {
        await pumpDetail(tester);

        expect(find.byType(MediaHero), findsOneWidget,
            reason:
                'SeriesDetailScreen must render its header through the shared '
                'MediaHero widget (Phase 2).');
        expect(find.byType(MetadataSection), findsOneWidget,
            reason:
                'SeriesDetailScreen must render its overview / metadata '
                'through the shared MetadataSection widget.');
        expect(find.byType(FileInfoCard), findsOneWidget,
            reason:
                'SeriesDetailScreen must render its file-info block through '
                'the shared FileInfoCard widget.');
        expect(find.byType(ActionBar), findsOneWidget,
            reason:
                'SeriesDetailScreen must expose its series-level actions '
 '(Search All Missing, Delete Series) through the shared ActionBar widget.');
        expect(find.byType(EpisodeList), findsOneWidget,
            reason:
                'SeriesDetailScreen must render its seasons + episodes through '
                'the shared EpisodeList widget (Phase 2).');
      },
    );

    testWidgets(
      'season selector filters the visible episode list — S1 visible by '
      'default, S2 chip switches the list',
      (tester) async {
        await pumpDetail(tester);

        // The shared EpisodeList uses chip labels "S1" / "S2" (per Phase 2
        // contract). The current bespoke screen uses "Season 1" / "Season 2"
        // full-text labels with expand/collapse, so this assertion fails at
        // HEAD — exactly the contract gap Phase 4 implement must close.
        expect(find.text('S1'), findsOneWidget,
            reason:
                'SeriesDetailScreen must render a chip-based season selector '
                'via the shared EpisodeList widget ("S1" label).');
        expect(find.text('S2'), findsOneWidget,
            reason:
                'SeriesDetailScreen must render a chip-based season selector '
                'via the shared EpisodeList widget ("S2" label).');

        // Default selected season is S1 — its episodes are visible.
        expect(find.text('Pilot'), findsOneWidget,
            reason: 'Season 1 episode "Pilot" must be visible by default.');
        expect(find.text("Cat's in the Bag..."), findsOneWidget,
            reason:
                'Season 1 episode "Cat\'s in the Bag..." must be visible by '
                'default.');
        // Season 2 episodes must NOT be visible.
        expect(find.text('Seven Thirty-Seven'), findsNothing,
            reason:
                'Season 2 episode "Seven Thirty-Seven" must not be visible '
                'until the S2 chip is tapped.');
        expect(find.text('Grilled'), findsNothing,
            reason:
                'Season 2 episode "Grilled" must not be visible until the S2 '
                'chip is tapped.');

        // Tap the S2 chip — season 2 episodes should now be visible.
        await tester.tap(find.text('S2'));
        await tester.pumpAndSettle();

        expect(find.text('Seven Thirty-Seven'), findsOneWidget,
            reason:
                'Season 2 episode "Seven Thirty-Seven" must be visible after '
                'tapping the S2 chip.');
        expect(find.text('Grilled'), findsOneWidget,
            reason:
                'Season 2 episode "Grilled" must be visible after tapping '
                'the S2 chip.');
        // Season 1 episodes must now be hidden.
        expect(find.text('Pilot'), findsNothing,
            reason:
                'Season 1 episode "Pilot" must be hidden after switching to '
                'S2 (the season selector is a filter, not an expand).');
        expect(find.text("Cat's in the Bag..."), findsNothing,
            reason:
                'Season 1 episode "Cat\'s in the Bag..." must be hidden after '
                'switching to S2.');
      },
    );

    testWidgets(
      'episode play action lives inside the shared EpisodeList and routes to '
      'the player with (episodeId, "episode")',
      (tester) async {
        // Use the one-episode fixture so the play action is unambiguous.
        fakeClient.getSeriesByIdReturn = oneEpisodeSeries();
        fakeClient.getSeriesDetailReturn = oneEpisodeSeries();
        await pumpDetail(tester, series: oneEpisodeSeries());

        // The play affordance must live inside the shared EpisodeList widget
        // (Phase 2 contract). The current bespoke screen renders its play
        // icon inside its own `_EpisodeRow` — find.byType(EpisodeList) is
        // findsNothing at HEAD.
        final playIcon = find.descendant(
          of: find.byType(EpisodeList),
          matching: find.byIcon(Icons.play_arrow),
        );
        expect(playIcon, findsWidgets,
            reason:
                'Episode play action must live inside the shared EpisodeList '
                'widget (Phase 2 contract — the bespoke _EpisodeRow must be '
                'replaced).');

        // Tap the play icon. Assert synchronously, BEFORE any further pump.
        // The tap handler runs synchronously, calls getStreamUrl, and pushes
        // the player route. We MUST NOT pumpAndSettle here: the pushed
        // PlaybackScreen instantiates a media_kit VideoController in
        // initState, which crashes the widget test environment because
        // MediaKit is not initialized outside the production runtime.
        // Asserting on the recorded call before any pump is the correct
        // contract test.
        await tester.tap(playIcon.first);
        expect(
          fakeClient.getStreamUrlCalls,
          contains((movieId: 501, type: 'episode')),
          reason:
              'Episode play must ask the API client for the stream URL with '
              'the loaded episode id (501) and type=episode.',
        );
      },
    );

    testWidgets(
      'per-episode search action lives inside the shared EpisodeList and '
      'triggers a searchReleases call for that episode',
      (tester) async {
        // Use the one-episode fixture so the search action is unambiguous.
        fakeClient.getSeriesByIdReturn = oneEpisodeSeries();
        fakeClient.getSeriesDetailReturn = oneEpisodeSeries();
        await pumpDetail(tester, series: oneEpisodeSeries());

        // The per-episode search affordance must live inside the shared
        // EpisodeList widget (Phase 2 contract) and use Icons.search — NOT
        // the current screen's Icons.subtitles (subtitle search) or
        // Icons.upgrade (quality upgrade) modal-sheet pattern.
        final searchIcon = find.descendant(
          of: find.byType(EpisodeList),
          matching: find.byIcon(Icons.search),
        );
        expect(searchIcon, findsWidgets,
            reason:
                'Per-episode search action must live inside the shared '
                'EpisodeList widget and use Icons.search (NOT the in-sheet '
                'Icons.subtitles / Icons.upgrade modal pattern).');

        // Tap the per-episode search icon — searchReleases is called.
        await tester.tap(searchIcon.first);
        await tester.pumpAndSettle();

        expect(fakeClient.searchReleasesCalls, isNotEmpty,
            reason:
                'Tapping the per-episode search action must trigger a '
                'searchReleases call on the API client.');
        // The first searchReleases call's type should be 'episode' (NOT
        // 'series' — that is the series-level Search All Missing contract).
        expect(fakeClient.searchReleasesCalls.first.type, 'episode',
            reason:
                'Per-episode search must call searchReleases with '
                'type=episode to distinguish it from the series-level '
                'Search All Missing (type=series).');
      },
    );

    testWidgets(
      'series-level "Search All Missing" action lives in the shared ActionBar '
      'and triggers a series-type searchReleases call',
      (tester) async {
        await pumpDetail(tester);

        // The series-level action must be a non-destructive ActionBarAction
        // inside the shared ActionBar widget with the exact label
        // "Search All Missing" (spec contract). At HEAD the bespoke screen
        // has no series-level action bar at all.
        final searchAllMissing = find.descendant(
          of: find.byType(ActionBar),
          matching: find.text('Search All Missing'),
        );
        expect(searchAllMissing, findsOneWidget,
            reason:
                'SeriesDetailScreen must expose "Search All Missing" as a '
                'series-level action via the shared ActionBar widget.');

        // Tap it — searchReleases is called with type=series.
        await tester.tap(searchAllMissing);
        await tester.pumpAndSettle();

        expect(fakeClient.searchReleasesCalls, isNotEmpty,
            reason:
                'Tapping "Search All Missing" must trigger a searchReleases '
                'call on the API client.');
        expect(fakeClient.searchReleasesCalls.last.type, 'series',
            reason:
                'Search All Missing must call searchReleases with '
                'type=series to distinguish it from per-episode search '
                '(type=episode).');
      },
    );

    testWidgets(
      'series-level "Delete Series" action lives in the shared ActionBar, '
      'shows an AlertDialog, and only fires the API delete call on confirm',
      (tester) async {
        await pumpDetail(tester);

        // The destructive series-level action must be an ActionBarAction
        // with the exact label "Delete Series" inside the shared ActionBar.
        final deleteSeriesButton = find.descendant(
          of: find.byType(ActionBar),
          matching: find.text('Delete Series'),
        );
        expect(deleteSeriesButton, findsOneWidget,
            reason:
                'SeriesDetailScreen must expose "Delete Series" as a '
                'series-level action via the shared ActionBar widget.');

        // Tap Delete Series → AlertDialog appears (ActionBar's destructive
        // flow), and no API call has fired yet.
        await tester.tap(deleteSeriesButton);
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsOneWidget,
            reason:
                'Tapping Delete Series must show a confirmation dialog '
                'before any destructive API call fires.');
        expect(fakeClient.deleteSeriesCalls, isEmpty,
            reason:
                'The destructive API call must NOT fire before the user '
                'confirms the AlertDialog.');

        // Tap Cancel → dialog dismissed, no API call.
        final cancelButton = find.descendant(
          of: find.byType(AlertDialog),
          matching: find.text('Cancel'),
        );
        expect(cancelButton, findsOneWidget);
        await tester.tap(cancelButton);
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsNothing,
            reason: 'Cancel must dismiss the dialog without firing the API.');
        expect(fakeClient.deleteSeriesCalls, isEmpty,
            reason:
                'Cancelling the Delete Series dialog must leave the API '
                'untouched.');

        // Tap Delete Series again → confirm → API call recorded.
        await tester.tap(deleteSeriesButton);
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsOneWidget);
        final confirmButton = find.descendant(
          of: find.byType(AlertDialog),
          matching: find.widgetWithText(TextButton, 'Delete Series'),
        );
        expect(confirmButton, findsOneWidget);
        await tester.tap(confirmButton);
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsNothing,
            reason:
                'Confirm must dismiss the dialog AND fire the underlying '
                'API call exactly once.');
        expect(fakeClient.deleteSeriesCalls, [1],
            reason:
                'Confirming Delete Series must call deleteSeries(1) on the '
                'API client — the loaded series.id from the fixture.');
      },
    );
  });
}
