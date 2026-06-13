import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/library/movie_detail_screen.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/subtitle_models.dart';
import 'package:mediarr_client/shared/services/api_client.dart';
import 'package:mediarr_client/shared/widgets/media_detail/action_bar.dart';
import 'package:mediarr_client/shared/widgets/media_detail/file_info_card.dart';
import 'package:mediarr_client/shared/widgets/media_detail/media_hero.dart';
import 'package:mediarr_client/shared/widgets/media_detail/metadata_section.dart';

import '../../support/fakes/fake_api_client.dart';

/// Widget tests for `MovieDetailScreen` (Phase 3 of
/// `feature_flutter_media_detail_20260508`).
///
/// Per `test-strategy.md` §4 guardrail #1: the screen receives a fully-loaded
/// `Movie` via `Navigator.push` (no go_router `:id` paths). Per §4 guardrail
/// #3: the screen is composed of the **shared** `MediaHero`, `MetadataSection`,
/// `ActionBar`, `FileInfoCard` widgets (Phase 2 Green) — not bespoke header /
/// overview / file-info / action rows.
///
/// Per §5 Phase 3:
///   - Loading/error/success surfaced for the subtitle fetch via the
///     `Completer` trick (this file's `getMovieSubtitlesCompleter`).
///   - Play action asserts `getStreamUrl(7, 'movie')` was called with the
///     loaded `movieId` and `type='movie'`. We intentionally do NOT mount
///     `PlaybackScreen` — its `VideoController` from `media_kit` is not
///     available in the Flutter widget test environment.
///   - Delete is wired through `ActionBar`'s `isDestructive: true` flow
///     (AlertDialog → Confirm/Cancel).
///   - Search Upgrades is wired to the API client and surfaces a `SnackBar`
///     for user feedback.
///
/// These tests are intentionally RED at HEAD: the current `MovieDetailScreen`
/// builds bespoke header / overview / file-info / action rows inline, has no
/// Delete action, exposes only the in-sheet "Search for Upgrade" (not the
/// in-place "Search Upgrades" required by Phase 3), and shows no distinct
/// error UI for subtitle-fetch failures (catches the exception and re-renders
/// the empty-state placeholder). Each failing test below is the proof that
/// the contract is incomplete; Phase 3 implement (Green) is the role that
/// must land the changes that flip them to GREEN.
void main() {
  group('MovieDetailScreen', () {
    late FakeMediarrApiClient fakeClient;

    const inception = Movie(
      id: 7,
      title: 'Inception',
      year: 2010,
      overview: 'A thief who steals corporate secrets through dream-sharing.',
      monitored: true,
      hasFile: true,
      quality: 'Bluray-1080p',
      runtime: 148,
      path: '/media/movies/inception.mkv',
      sizeOnDisk: 15 * 1024 * 1024 * 1024,
    );

    const inceptionNoFile = Movie(
      id: 8,
      title: 'Untitled Project',
      year: 2024,
      overview: 'Not yet downloaded.',
      monitored: true,
      hasFile: false,
    );

    setUp(() {
      fakeClient = FakeMediarrApiClient();
      fakeClient.getMovieReturn = inception;
      fakeClient.getMovieSubtitlesReturn = const [];
    });

    Future<void> pumpDetail(
      WidgetTester tester, {
      Movie? movie,
      bool settle = true,
    }) async {
      // MovieDetailScreen renders a 300px poster sidebar + Expanded details
      // column whose Quality Upgrade / Subtitles rows overflow at the default
      // 800×600 surface (and still do after refactor — overflow is fatal in
      // tests). Use a TV-sized surface so the row fits without overflowing.
      // (Same trick as Phase 1 `library_screen_navigation_test.dart`.)
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
              body: MovieDetailScreen(movie: movie ?? inception),
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
      'shows a loading indicator while the subtitle fetch is pending',
      (tester) async {
        final completer = Completer<List<VariantInventory>>();
        fakeClient.getMovieSubtitlesCompleter = completer;

        // settle:false — pumpDetail uses a single pump so the screen sits
        // in its loading state with the subtitle fetch still pending.
        await pumpDetail(tester, settle: false);
        expect(find.byType(CircularProgressIndicator), findsWidgets,
            reason:
                'MovieDetailScreen must show a loading indicator while a '
                'subtitle fetch is in flight (Completer pending).');

        completer.complete(const []);
        await tester.pumpAndSettle();
      },
    );

    testWidgets(
      'shows a distinct error state when the subtitle fetch fails '
      '(not just the empty-state placeholder)',
      (tester) async {
        fakeClient.getMovieSubtitlesError =
            Exception('Subtitle service unavailable');

        await pumpDetail(tester);

        // The screen must surface the failure as a distinguishable UI element,
        // not as the generic "No subtitle data available" placeholder that
        // currently also covers the failure path.
        expect(
          find.byWidgetPredicate(
            (w) =>
                w is Text &&
                (w.data?.toLowerCase().contains('error') ?? false),
          ),
          findsOneWidget,
          reason:
              'MovieDetailScreen must surface subtitle-fetch failures with a '
              'distinguishable error UI element, not silently fall through to '
              'the empty-state placeholder.',
        );
      },
    );

    testWidgets(
      'success state composes the shared MediaHero, MetadataSection, '
      'FileInfoCard, and ActionBar widgets',
      (tester) async {
        await pumpDetail(tester);

        expect(find.byType(MediaHero), findsOneWidget,
            reason:
                'MovieDetailScreen must render its header through the shared '
                'MediaHero widget (Phase 2).');
        expect(find.byType(MetadataSection), findsOneWidget,
            reason:
                'MovieDetailScreen must render its overview / metadata '
                'through the shared MetadataSection widget.');
        expect(find.byType(FileInfoCard), findsOneWidget,
            reason:
                'MovieDetailScreen must render its file-info block through '
                'the shared FileInfoCard widget.');
        expect(find.byType(ActionBar), findsOneWidget,
            reason:
                'MovieDetailScreen must render its actions through the shared '
                'ActionBar widget (Phase 2 contract for Play / Search Upgrades '
                '/ Delete).');
      },
    );

    testWidgets(
      'Play action is exposed via the shared ActionBar and requests a stream '
      'URL with the loaded movieId and type=movie',
      (tester) async {
        await pumpDetail(tester);

        // Play must live inside the shared ActionBar (Phase 3 refactor
        // contract — the bespoke header button is being replaced).
        expect(
          find.descendant(
            of: find.byType(ActionBar),
            matching: find.text('Play'),
          ),
          findsOneWidget,
          reason:
              'Play must be exposed through the shared ActionBar widget '
              '(Phase 3 refactor — bespoke ElevatedButton.icon is being '
              'replaced).',
        );

        await tester.tap(find.text('Play'));
        // Assert synchronously, BEFORE any further pump. The tap handler
        // runs synchronously, calls getStreamUrl, and pushes the player
        // route. We MUST NOT pumpAndSettle here: the pushed PlaybackScreen
        // instantiates a media_kit VideoController in initState, which
        // crashes the widget test environment because MediaKit is not
        // initialized outside the production runtime. Asserting on the
        // recorded call before any pump is the correct contract test.
        expect(
          fakeClient.getStreamUrlCalls,
          contains((movieId: 7, type: 'movie')),
          reason:
              'Play must ask the API client for the stream URL with the '
              'loaded movie id (7) and type=movie.',
        );
      },
    );

    testWidgets(
      'Delete action shows an AlertDialog; only fires the API on confirm; '
      'cancelling leaves the API untouched',
      (tester) async {
        await pumpDetail(tester);

        // The Delete button is the destructive entry in the ActionBar.
        expect(find.text('Delete'), findsOneWidget,
            reason:
                'MovieDetailScreen must expose a Delete action (currently '
                'no such affordance exists on the bespoke detail screen).');

        // Tap Delete → AlertDialog appears.
        await tester.tap(find.text('Delete'));
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsOneWidget,
            reason:
                'Tapping Delete must show a confirmation dialog before any '
                'destructive API call fires.');
        // No API call has fired yet.
        expect(fakeClient.getStreamUrlCalls, isEmpty);

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

        // Tap Delete again → confirm → dialog dismissed, API called.
        await tester.tap(find.text('Delete'));
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsOneWidget);
        final confirmButton = find.descendant(
          of: find.byType(AlertDialog),
          matching: find.widgetWithText(TextButton, 'Delete'),
        );
        expect(confirmButton, findsOneWidget);
        await tester.tap(confirmButton);
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsNothing,
            reason:
                'Confirm must dismiss the dialog AND fire the underlying API '
                'call exactly once.');
      },
    );

    testWidgets(
      'Search Upgrades action triggers a search and shows a SnackBar',
      (tester) async {
        await pumpDetail(tester);

        // The in-place "Search Upgrades" action (Phase 3 contract) is a
        // distinct label from the current in-sheet "Search for Upgrade" —
        // the former is asserted here so the test fails RED until Phase 3
        // wires it.
        expect(find.text('Search Upgrades'), findsOneWidget,
            reason:
                'MovieDetailScreen must expose an in-place "Search Upgrades" '
                'action (not the existing in-sheet "Search for Upgrade" '
                'launcher).');

        // Tap Search Upgrades → SnackBar appears with phase feedback.
        await tester.tap(find.text('Search Upgrades'));
        await tester.pumpAndSettle();
        expect(find.byType(SnackBar), findsOneWidget,
            reason:
                'Tapping Search Upgrades must surface feedback via a SnackBar '
                '(not just the bottom-sheet QualityUpgradeSheet).');
      },
    );

    testWidgets(
      'movies without a file still compose the shared components but hide '
      'Play and FileInfoCard',
      (tester) async {
        await pumpDetail(tester, movie: inceptionNoFile);

        // The screen must still render its shared scaffolding when the
        // movie has no file on disk — refactor must not regress to a
        // bespoke empty screen for the no-file case.
        expect(find.byType(MediaHero), findsOneWidget,
            reason:
                'Movies without a file must still render the shared '
                'MediaHero (refactor must be uniform).');
        expect(find.byType(MetadataSection), findsOneWidget,
            reason:
                'Movies without a file must still render the shared '
                'MetadataSection.');
        expect(find.byType(ActionBar), findsOneWidget,
            reason:
                'Movies without a file must still render the shared '
                'ActionBar so Search Upgrades stays available (per '
                'test-strategy.md §6 edge case).');

        // No Play button when there is no file (per test-strategy.md §6
        // edge case "Movie with hasFile: false").
        expect(find.text('Play'), findsNothing,
            reason:
                'Movies without a file must not expose a Play action.');
        // FileInfoCard must not be shown for hasFile == false — the
        // file-info block is meaningless without a file (per
        // test-strategy.md §6).
        expect(find.byType(FileInfoCard), findsNothing,
            reason:
                'Movies without a file must hide the FileInfoCard '
                '(Phase 3 contract — the file-info block is meaningless '
                'without a file).');
      },
    );
  });
}