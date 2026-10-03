// FR-2 episode focus contract on the REAL SeriesDetailScreen at the device
// viewport (1920x1080, density 240 -> 1280x720 logical).
//
// Measured defect before this contract (2026-10-03), driving the real screen
// with the D-pad:
//
//   ENTRY   -> "Back"
//   DOWN 1  -> "S1 7/7"              (season chip)
//   DOWN 2  -> "Search All Missing"   (bottom ActionBar, all 7 episodes skipped)
//   DOWN 3  -> "Search All Missing"   (stuck forever)
//
// Root cause: `_EpisodeRow` rendered no traversal stop at all. Only the two
// icons at the right of each row were focusable, so directional focus had no
// episode node to land on and the full-width ActionBar won on geometry.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/features/library/series_detail_screen.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/season.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';
import 'package:mediarr_client/shared/widgets/media_detail/action_bar.dart';
import 'package:mediarr_client/shared/widgets/media_detail/episode_list.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';
import '../../support/focus_probe.dart';

/// A two-season series. Season 2 deliberately has **no files**, so the
/// missing-episode path (Select searches instead of playing) is exercised.
Series _series({int seasonOneEpisodes = 7, int seasonTwoEpisodes = 3}) {
  Season season(int number, int count, {required bool withFiles}) {
    return Season(
      id: number * 10,
      seasonNumber: number,
      episodeCount: count,
      episodeFileCount: withFiles ? count : 0,
      episodes: List.generate(
        count,
        (i) => Episode(
          id: number * 100 + i + 1,
          seasonNumber: number,
          episodeNumber: i + 1,
          title: 'S${number}E${i + 1}',
          airDateUtc: '2008-01-20T00:00:00Z',
          hasFile: withFiles,
          monitored: true,
          quality: 'Bluray-1080p',
        ),
      ),
    );
  }

  return Series(
    id: 1,
    title: 'Breaking Bad',
    year: 2008,
    overview: 'A chemistry teacher turned meth maker.',
    monitored: true,
    network: 'AMC',
    seasons: [
      season(1, seasonOneEpisodes, withFiles: true),
      season(2, seasonTwoEpisodes, withFiles: false),
    ],
  );
}

Future<FakeMediarrApiClient> _pumpSeries(
  WidgetTester tester,
  Series series,
) async {
  tester.view.physicalSize = const Size(1920, 1080);
  tester.view.devicePixelRatio = 1.5;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final fake = FakeMediarrApiClient()..getSeriesDetailReturn = series;
  final container = ProviderContainer(
    overrides: [
      apiClientProvider.overrideWith((ref) => fake),
      // Selecting an episode routes to PlaybackScreen. A real
      // MediaKitMediaPlayer needs native media_kit libraries that do not exist
      // in a widget test, so the service is built on the fake player, the same
      // way playback_overlay_test.dart does it.
      playbackServiceProvider.overrideWith(
        (ref) => PlaybackService(
          ref.read(apiClientProvider.notifier),
          player: FakeMediaPlayer(),
          subtitleRenderer: FakeSubtitleRenderer(),
        ),
      ),
    ],
  );
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: mediarrDarkTheme,
        home: LeanbackScaffold(
          currentPath: '/series',
          child: SeriesDetailScreen(series: series),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return fake;
}

/// Presses Down [times] and returns the visible text of each new focus stop.
Future<List<String>> _walkDown(WidgetTester tester, int times) async {
  final stops = <String>[];
  for (var i = 0; i < times; i++) {
    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    stops.add(focusedText());
  }
  return stops;
}

/// Sends one key and pumps a bounded number of frames.
///
/// `pressDpad` uses `pumpAndSettle`, which never returns after a navigation
/// into `PlaybackScreen`: the fake player never reports `playing`, so the
/// status stays `loading` and the buffering spinner animates forever.
Future<void> pressOnce(WidgetTester tester, LogicalKeyboardKey key) async {
  await tester.sendKeyEvent(key);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  group('FR-2 Down from the season chips walks the episodes', () {
    testWidgets('Down reaches episode 1 and walks episodes in order', (
      tester,
    ) async {
      await _pumpSeries(tester, _series());

      // Entry focus is the Back control.
      expect(focusedText(), contains('Back'));

      // First Down lands on the season chip block, as it does today.
      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      expect(focusedText(), contains('S1'));

      // The next Down must land on episode 1, not on the ActionBar.
      final stops = await _walkDown(tester, 4);

      expect(
        stops.first,
        contains('S1E1'),
        reason:
            'Down from the season chips must reach episode 1; it landed '
            'on "${stops.first}". Episodes are unreachable with the remote.',
      );
      expect(stops[1], contains('S1E2'));
      expect(stops[2], contains('S1E3'));
      expect(stops[3], contains('S1E4'));

      // Every stop must render a visible focus cue.
      for (var i = 0; i < stops.length; i++) {
        expectVisibleFocus('Down to episode ${i + 1}');
      }
    });

    testWidgets('Down past the last episode lands on the non-destructive '
        'series action, never on Delete', (tester) async {
      await _pumpSeries(tester, _series(seasonOneEpisodes: 3));

      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      final stops = await _walkDown(tester, 4);

      expect(
        stops[3],
        contains('Search All Missing'),
        reason:
            'Down after the last episode must land on Search All Missing; '
            'it landed on "${stops[3]}". Landing on Delete Series would put a '
            'destructive action one stray Select away.',
      );
      expectVisibleFocus('Down past the last episode');
      expect(find.byType(ActionBar), findsOneWidget);
    });

    testWidgets('Right from an episode row reaches its search control', (
      tester,
    ) async {
      await _pumpSeries(tester, _series(seasonOneEpisodes: 2));

      // Chip, then episode 1.
      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      expect(focusedText(), contains('S1E1'));

      // Right reaches the per-episode search action inside the row.
      await pressDpad(tester, LogicalKeyboardKey.arrowRight);
      expectVisibleFocus('Right to the episode search control');
      expect(
        find.byIcon(Icons.search),
        findsWidgets,
        reason: 'The per-episode search control must stay reachable.',
      );
    });
  });

  group('FR-2 selecting an episode', () {
    testWidgets('Select on an episode with a file plays that episode', (
      tester,
    ) async {
      final fake = await _pumpSeries(tester, _series(seasonOneEpisodes: 2));

      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      expect(focusedText(), contains('S1E1'));

      await pressOnce(tester, LogicalKeyboardKey.select);

      // The stream URL is built from the episode id, never the database id of
      // something else.
      expect(
        fake.getStreamUrlCalls.map((c) => c.movieId),
        contains(101),
        reason: 'Select on episode 1 must ask for episode id 101.',
      );
      expect(fake.getStreamUrlCalls.every((c) => c.type == 'episode'), isTrue);
    });

    testWidgets('Select on an episode without a file searches for it', (
      tester,
    ) async {
      // Season 2 has no files, so selecting one of its episodes must not be a
      // silent no-op: the screen triggers a search instead.
      final fake = await _pumpSeries(tester, _series(seasonOneEpisodes: 2));

      // Switch to season 2 by selecting the S2 chip.
      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      expect(focusedText(), contains('S1'));
      await pressDpad(tester, LogicalKeyboardKey.arrowRight);
      await pressOnce(tester, LogicalKeyboardKey.select);

      // Down into season 2's first episode.
      final stops = await _walkDown(tester, 1);
      expect(stops.first, contains('S2E1'));

      await pressOnce(tester, LogicalKeyboardKey.select);

      expect(
        fake.searchReleasesCalls,
        isNotEmpty,
        reason:
            'Selecting an episode without a file must search for it, not '
            'do nothing. Today onPlayEpisode is a silent no-op in that case.',
      );
      expect(
        fake.searchReleasesCalls.first.query,
        contains('Breaking Bad S02E01'),
      );
      expect(fake.getStreamUrlCalls, isEmpty);
    });
  });

  group('FR-2 episode list ordering', () {
    testWidgets('season chips come before episode rows in traversal order', (
      tester,
    ) async {
      await _pumpSeries(tester, _series(seasonOneEpisodes: 4));

      // Entry focus must be the Back control on the detail screen, not the
      // rail: the rail is a sibling route shell, and the detail screen is
      // pushed inside it.
      expect(
        focusedText(),
        contains('Back'),
        reason: 'entry focus was "${focusLabel()}" / "${focusedText()}"',
      );

      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      expect(
        focusedText(),
        contains('S1'),
        reason: 'The chip block must be the first stop below the hero.',
      );

      // Right walks the season chips.
      await pressDpad(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedText(), contains('S2'));

      // Select switches the season, then Down enters that season.
      await pressDpad(tester, LogicalKeyboardKey.select);
      expect(
        find.text('S1E1'),
        findsNothing,
        reason: 'Selecting S2 must swap the visible episode list.',
      );
      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      expect(
        focusedText(),
        contains('S2E1'),
        reason: 'Down from the S2 chip must enter season 2.',
      );

      // Left from the chip block must still reach the rail. That is the shell's
      // existing contract (library_dpad_test.dart pins it), so the episode walk
      // must not swallow it.
      await pressDpad(tester, LogicalKeyboardKey.arrowLeft);
      expectVisibleFocus('Left from the chip block to the rail');
      expect(
        focusedText(),
        anyOf(contains('Home'), contains('Movies'), contains('Series')),
      );
    });

    testWidgets('the episode list exposes its focus nodes to the host', (
      tester,
    ) async {
      await _pumpSeries(tester, _series(seasonOneEpisodes: 3));

      expect(find.byType(EpisodeList), findsOneWidget);
      // The rows are real focus stops with the shared focus cue, and the list
      // owns their nodes so the walk is deterministic (FR-2).
      expect(
        find.byWidgetPredicate(
          (widget) => widget is Focus && widget.debugLabel == 'EpisodeList.row',
        ),
        findsNWidgets(3),
      );
    });
  });
}
