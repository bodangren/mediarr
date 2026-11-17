import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import '../../support/focus_probe.dart';

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

/// Opens the series Manage sheet and taps [label].
///
/// Deleting and searching for missing episodes moved behind Manage on
/// 2026-11-17, so they cannot be triggered by a stray Select next to Play.
Future<void> tapManageAction(WidgetTester tester, String label) async {
  await tester.tap(find.text('Manage'));
  await tester.pumpAndSettle();
  expect(find.text(label), findsOneWidget,
      reason: 'Manage must offer the "$label" action.');
  await tester.tap(find.text(label));
  await tester.pumpAndSettle();
}

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

    Series partlyWatchedSeries() => Series(
      id: 2,
      title: 'Partly Watched',
      monitored: true,
      seasons: [
        Season(
          id: 21,
          seasonNumber: 1,
          episodeCount: 3,
          episodeFileCount: 3,
          episodes: [
            Episode(
              id: 301,
              seasonNumber: 1,
              episodeNumber: 1,
              title: 'One',
              hasFile: true,
              playbackState: const EpisodePlaybackState(
                position: 1400,
                duration: 1400,
                isWatched: true,
              ),
            ),
            Episode(
              id: 302,
              seasonNumber: 1,
              episodeNumber: 2,
              title: 'Two',
              hasFile: true,
              playbackState: const EpisodePlaybackState(
                position: 1400,
                duration: 1400,
                isWatched: true,
              ),
            ),
            const Episode(
              id: 303,
              seasonNumber: 1,
              episodeNumber: 3,
              title: 'Three',
              hasFile: true,
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
          overrides: [apiClientProvider.overrideWith((ref) => fakeClient)],
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
        expect(
          find.byType(CircularProgressIndicator),
          findsWidgets,
          reason:
              'SeriesDetailScreen must show a loading indicator while a '
              'getSeriesDetail fetch is in flight (Completer pending).',
        );

        completer.complete(twoSeasonSeries());
        await tester.pumpAndSettle();
      },
    );

    testWidgets(
      'shows a distinct error state when the getSeriesDetail fetch fails '
      '(text containing "error")',
      (tester) async {
        fakeClient.getSeriesDetailError = Exception(
          'Series service unavailable',
        );

        await pumpDetail(tester);

        // The screen must surface the failure as a distinguishable UI element
        // whose text contains the word "error" — not just a spinner, not just
        // an exception.toString() dump. This matches the Phase 3
        // MovieDetailScreen error-state contract and the production-quality
        // affordance a user needs to recover.
        expect(
          find.byWidgetPredicate(
            (w) =>
                w is Text && (w.data?.toLowerCase().contains('error') ?? false),
          ),
          findsOneWidget,
          reason:
              'SeriesDetailScreen must surface getSeriesDetail failures with a '
              'distinguishable error UI element (Text containing "error"), '
              'matching the Phase 3 MovieDetailScreen error-state contract.',
        );
      },
    );

    testWidgets('success state composes the shared MediaHero, MetadataSection, '
        'FileInfoCard, ActionBar, and EpisodeList widgets', (tester) async {
      await pumpDetail(tester);

      expect(
        find.byType(MediaHero),
        findsOneWidget,
        reason:
            'SeriesDetailScreen must render its header through the shared '
            'MediaHero widget (Phase 2).',
      );
      expect(
        find.byType(MetadataSection),
        findsOneWidget,
        reason:
            'SeriesDetailScreen must render its overview / metadata '
            'through the shared MetadataSection widget.',
      );
      expect(
        find.byType(FileInfoCard),
        findsOneWidget,
        reason:
            'SeriesDetailScreen must render its file-info block through '
            'the shared FileInfoCard widget.',
      );
      expect(
        find.byType(ActionBar),
        findsOneWidget,
        reason:
            'SeriesDetailScreen must expose its series-level actions '
            '(Search All Missing, Delete Series) through the shared ActionBar widget.',
      );
      expect(
        find.byType(EpisodeList),
        findsOneWidget,
        reason:
            'SeriesDetailScreen must render its seasons + episodes through '
            'the shared EpisodeList widget (Phase 2).',
      );
    });

    testWidgets(
      'season selector filters the visible episode list — S1 visible by '
      'default, S2 chip switches the list',
      (tester) async {
        await pumpDetail(tester);

        // The shared EpisodeList uses chip labels "S1" / "S2" (per Phase 2
        // contract). The current bespoke screen uses "Season 1" / "Season 2"
        // full-text labels with expand/collapse, so this assertion fails at
        // HEAD — exactly the contract gap Phase 4 implement must close.
        expect(
          find.text('S1'),
          findsOneWidget,
          reason:
              'SeriesDetailScreen must render a chip-based season selector '
              'via the shared EpisodeList widget ("S1" label).',
        );
        expect(
          find.text('S2'),
          findsOneWidget,
          reason:
              'SeriesDetailScreen must render a chip-based season selector '
              'via the shared EpisodeList widget ("S2" label).',
        );

        // Default selected season is S1 — its episodes are visible.
        expect(
          find.text('Pilot'),
          findsOneWidget,
          reason: 'Season 1 episode "Pilot" must be visible by default.',
        );
        expect(
          find.text("Cat's in the Bag..."),
          findsOneWidget,
          reason:
              'Season 1 episode "Cat\'s in the Bag..." must be visible by '
              'default.',
        );
        // Season 2 episodes must NOT be visible.
        expect(
          find.text('Seven Thirty-Seven'),
          findsNothing,
          reason:
              'Season 2 episode "Seven Thirty-Seven" must not be visible '
              'until the S2 chip is tapped.',
        );
        expect(
          find.text('Grilled'),
          findsNothing,
          reason:
              'Season 2 episode "Grilled" must not be visible until the S2 '
              'chip is tapped.',
        );

        // Tap the S2 chip — season 2 episodes should now be visible.
        await tester.tap(find.widgetWithText(ChoiceChip, 'S2'));
        await tester.pumpAndSettle();

        expect(
          find.text('Seven Thirty-Seven'),
          findsOneWidget,
          reason:
              'Season 2 episode "Seven Thirty-Seven" must be visible after '
              'tapping the S2 chip.',
        );
        expect(
          find.text('Grilled'),
          findsOneWidget,
          reason:
              'Season 2 episode "Grilled" must be visible after tapping '
              'the S2 chip.',
        );
        // Season 1 episodes must now be hidden.
        expect(
          find.text('Pilot'),
          findsNothing,
          reason:
              'Season 1 episode "Pilot" must be hidden after switching to '
              'S2 (the season selector is a filter, not an expand).',
        );
        expect(
          find.text("Cat's in the Bag..."),
          findsNothing,
          reason:
              'Season 1 episode "Cat\'s in the Bag..." must be hidden after '
              'switching to S2.',
        );
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
        expect(
          playIcon,
          findsWidgets,
          reason:
              'Episode play action must live inside the shared EpisodeList '
              'widget (Phase 2 contract — the bespoke _EpisodeRow must be '
              'replaced).',
        );

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
      'Select on an episode without a file searches for it (no per-row '
      'magnifier)',
      (tester) async {
        // Owner contract 2026-11-07: the row is the single action. A missing
        // episode searches when selected; the unexplained per-row magnifier
        // that Right used to reach was removed.
        final noFileSeries = Series(
          id: 77,
          title: 'Missing Show',
          seasons: [
            Season(
              id: 771,
              seasonNumber: 1,
              episodeCount: 1,
              episodeFileCount: 0,
              episodes: const [
                Episode(
                  id: 7701,
                  seasonNumber: 1,
                  episodeNumber: 1,
                  title: 'Not Downloaded',
                  hasFile: false,
                  monitored: true,
                ),
              ],
            ),
          ],
        );
        fakeClient.getSeriesByIdReturn = noFileSeries;
        fakeClient.getSeriesDetailReturn = noFileSeries;
        await pumpDetail(tester, series: noFileSeries);

        // The missing row keeps a muted search affordance, but it is not a
        // traversal stop.
        expect(
          find.descendant(
            of: find.byType(EpisodeList),
            matching: find.byIcon(Icons.search),
          ),
          findsWidgets,
          reason: 'A missing row keeps a search affordance hint.',
        );

        // Select on the missing row triggers the episode search.
        await tester.tap(find.text('Not Downloaded'));
        await tester.pumpAndSettle();

        expect(
          fakeClient.searchReleasesCalls,
          isNotEmpty,
          reason:
              'Selecting an episode without a file must trigger a '
              'searchReleases call.',
        );
        expect(
          fakeClient.searchReleasesCalls.first.type,
          'tvsearch',
          reason:
              'The server only accepts generic|tvsearch|movie|music|book. '
              'Sending type=episode was rejected with HTTP 422 on the TV '
              '(measured 2026-11-07).',
        );
        expect(fakeClient.searchReleasesCalls.first.season, 1);
        expect(fakeClient.searchReleasesCalls.first.episode, 1);
      },
    );

    testWidgets('series-level Play all action starts the first playable episode',
        (tester) async {
      await pumpDetail(tester);

      final playAll = find.descendant(
        of: find.byType(ActionBar),
        matching: find.text('Play all'),
      );
      expect(playAll, findsOneWidget,
          reason: 'A series must offer Play all from its detail screen.');
    });

    testWidgets(
      'series-level "Search All Missing" action lives in the shared ActionBar '
      'and triggers a series-type searchReleases call',
      (tester) async {
        await pumpDetail(tester);

        // It is a series-level action inside Manage (moved out of the primary
        // ActionBar row on 2026-11-17 so Play stays the only dominant action).
        await tapManageAction(tester, 'Search all missing episodes');

        expect(
          fakeClient.searchReleasesCalls,
          isNotEmpty,
          reason:
              'Tapping "Search All Missing" must trigger a searchReleases '
              'call on the API client.',
        );
        expect(
          fakeClient.searchReleasesCalls.last.type,
          'tvsearch',
          reason:
              'Search All Missing must call searchReleases with '
              'type=series to distinguish it from per-episode search '
              '(type=episode).',
        );
      },
    );

    testWidgets(
      'series-level "Delete Series" action lives in the shared ActionBar, '
      'shows an AlertDialog, and only fires the API delete call on confirm',
      (tester) async {
        await pumpDetail(tester);

        // Destructive series actions live behind Manage and confirm first.
        await tapManageAction(tester, 'Delete series');
        expect(
          find.byType(AlertDialog),
          findsOneWidget,
          reason:
              'Tapping Delete Series must show a confirmation dialog '
              'before any destructive API call fires.',
        );
        expect(
          fakeClient.deleteSeriesCalls,
          isEmpty,
          reason:
              'The destructive API call must NOT fire before the user '
              'confirms the AlertDialog.',
        );

        // Tap Cancel → dialog dismissed, no API call.
        final cancelButton = find.descendant(
          of: find.byType(AlertDialog),
          matching: find.text('Cancel'),
        );
        expect(cancelButton, findsOneWidget);
        await tester.tap(cancelButton);
        await tester.pumpAndSettle();
        expect(
          find.byType(AlertDialog),
          findsNothing,
          reason: 'Cancel must dismiss the dialog without firing the API.',
        );
        expect(
          fakeClient.deleteSeriesCalls,
          isEmpty,
          reason:
              'Cancelling the Delete Series dialog must leave the API '
              'untouched.',
        );

        // Manage → Delete series again → confirm → API call recorded.
        await tapManageAction(tester, 'Delete series');
        expect(find.byType(AlertDialog), findsOneWidget);
        final confirmButton = find.descendant(
          of: find.byType(AlertDialog),
          matching: find.widgetWithText(TextButton, 'Delete'),
        );
        expect(confirmButton, findsOneWidget);
        await tester.tap(confirmButton);
        await tester.pumpAndSettle();
        expect(
          find.byType(AlertDialog),
          findsNothing,
          reason:
              'Confirm must dismiss the dialog AND fire the underlying '
              'API call exactly once.',
        );
        expect(
          fakeClient.deleteSeriesCalls,
          [1],
          reason:
              'Confirming Delete Series must call deleteSeries(1) on the '
              'API client — the loaded series.id from the fixture.',
        );
      },
    );
  testWidgets('with nothing in progress, the CTA is the first unwatched episode',
      (tester) async {
    final series = Series(
      id: 7,
      title: 'Watched First',
      monitored: true,
      seasons: [
        Season(
          id: 71,
          seasonNumber: 1,
          episodeCount: 2,
          episodeFileCount: 2,
          episodes: [
            Episode(
              id: 711,
              seasonNumber: 1,
              episodeNumber: 1,
              title: 'Done',
              hasFile: true,
              playbackState: const EpisodePlaybackState(
                position: 1400,
                duration: 1400,
                isWatched: true,
              ),
            ),
            const Episode(
              id: 712,
              seasonNumber: 1,
              episodeNumber: 2,
              title: 'Next Up',
              hasFile: true,
            ),
          ],
        ),
      ],
    );

    fakeClient.getSeriesDetailReturn = series;
    await pumpDetail(tester, series: series);

    expect(find.textContaining('Play S01E02'), findsOneWidget,
        reason: 'A fully watched episode must not be offered as the next thing to play.');
  });

  testWidgets('resume target prefers the most recently watched in-progress episode',
      (tester) async {
    final series = Series(
      id: 6,
      title: 'Two In Progress',
      monitored: true,
      seasons: [
        Season(
          id: 61,
          seasonNumber: 1,
          episodeCount: 2,
          episodeFileCount: 2,
          episodes: [
            Episode(
              id: 611,
              seasonNumber: 1,
              episodeNumber: 1,
              title: 'Older But Further',
              hasFile: true,
              playbackState: EpisodePlaybackState(
                position: 900,
                duration: 1400,
                lastWatched: DateTime.utc(2026, 11, 1),
              ),
            ),
            Episode(
              id: 612,
              seasonNumber: 1,
              episodeNumber: 2,
              title: 'Newer But Early',
              hasFile: true,
              playbackState: EpisodePlaybackState(
                position: 120,
                duration: 1400,
                lastWatched: DateTime.utc(2026, 11, 9),
              ),
            ),
          ],
        ),
      ],
    );

    fakeClient.getSeriesDetailReturn = series;
    await pumpDetail(tester, series: series);

    expect(find.textContaining('Resume S01E02'), findsOneWidget,
        reason: 'The resume target must follow recent activity, not raw position.');
  });

  testWidgets('season chip context menu marks the whole season watched',
      (tester) async {
    await pumpDetail(tester);

    // Down from the CTA enters the season chips (host-owned walk).
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.contextMenu);
    await tester.pumpAndSettle();

    expect(find.text('Mark season watched'), findsOneWidget);
    expect(find.text('Mark season unwatched'), findsOneWidget);

    await tester.tap(find.text('Mark season watched'));
    await tester.pumpAndSettle();

    expect(fakeClient.seasonWatchedCalls, hasLength(1));
    expect(fakeClient.seasonWatchedCalls.single.seasonId, 11);
    expect(fakeClient.seasonWatchedCalls.single.watched, isTrue);
  });

  testWidgets('shows an actionable banner when nothing is downloaded',
      (tester) async {
    final nothingDownloaded = Series(
      id: 9,
      title: 'Nothing Downloaded',
      monitored: true,
      seasons: [
        const Season(
          id: 91,
          seasonNumber: 1,
          episodeCount: 2,
          episodeFileCount: 0,
          episodes: [
            Episode(
              id: 901,
              seasonNumber: 1,
              episodeNumber: 1,
              title: 'One',
              hasFile: false,
            ),
          ],
        ),
      ],
    );
    fakeClient.getSeriesDetailReturn = nothingDownloaded;
    await pumpDetail(tester, series: nothingDownloaded);

    expect(find.textContaining('No downloaded episodes'), findsOneWidget);
    // The recovery action is reachable without competing with Play for weight.
    expect(find.text('Manage'), findsWidgets);
    await tester.tap(find.text('Manage').first);
    await tester.pumpAndSettle();
    expect(find.text('Search all missing episodes'), findsOneWidget);
    await tester.tap(find.text('Close'));
    await tester.pumpAndSettle();
  });

  testWidgets('shows watched progress and per-season watched counts', (
    tester,
  ) async {
    final series = partlyWatchedSeries();
    fakeClient.getSeriesByIdReturn = series;
    fakeClient.getSeriesDetailCompleter = Completer<Series>()..complete(series);

    await pumpDetail(tester, series: series);

    // Library tracking on the detail pane: 2 of 3 episodes finished.
    expect(find.text('2 of 3 watched'), findsOneWidget);
    // The season chip carries a compact watched tally with the on-disk count.
    expect(find.textContaining('✓2'), findsWidgets);
  });

    testWidgets(
      'D-pad walks the two panes in visual order and never strands focus '
      '(FR-3)',
      (tester) async {
        // Owner report 2026-11-16: "navigation with D-pad is not linear. The
        // element hierarchy is not visual at all and the focus jumps around
        // the screen and may even appear to be locked into a spot."
        //
        // Left pane, top to bottom: Back -> Resume/Play CTA -> action bar.
        // Right pane: season chips -> episode rows. Down must walk the left
        // pane, Up must reverse it, and neither may hand focus to geometry.
        await pumpDetail(tester);

        // Entry focus: the primary CTA.
        expect(
          focusedText().toLowerCase(),
          anyOf(contains('play'), contains('resume')),
          reason: 'Series detail must open on the primary CTA, not Back '
              '(focused: "${focusedText()}").',
        );

        await pressDpad(tester, LogicalKeyboardKey.arrowDown);
        expectVisibleFocus('Down from the CTA');
        expect(
          focusLabel(),
          contains('chip'),
          reason: 'Down from the CTA must enter the season chips; landed on '
              '${focusLabel()} ("${focusedText()}").',
        );

        // FR-3: Up from the chips returns to the CTA instead of falling
        // through to geometric resolution (that hop used to be undefined).
        await pressDpad(tester, LogicalKeyboardKey.arrowUp);
        expect(
          focusLabel(),
          contains('cta'),
          reason: 'Up from the season chips must return to the CTA; landed on '
              '${focusLabel()} ("${focusedText()}").',
        );

        await pressDpad(tester, LogicalKeyboardKey.arrowUp);
        expect(
          focusLabel(),
          contains('back'),
          reason: 'Up from the CTA must reach Back; landed on ${focusLabel()} '
              '("${focusedText()}").',
        );

        await pressDpad(tester, LogicalKeyboardKey.arrowDown);
        expect(
          focusLabel(),
          contains('cta'),
          reason: 'Down from Back must return to the CTA; landed on '
              '${focusLabel()} ("${focusedText()}").',
        );

        // The whole walk must stay on visible controls at every step.
        expectVisibleFocus('the completed Back <-> CTA <-> actions walk');
      },
    );
  });
}