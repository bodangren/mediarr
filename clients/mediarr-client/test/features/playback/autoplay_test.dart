// FR-3 next-episode autoplay, on the real PlaybackScreen with FakeMediaPlayer.
//
// Before this phase the capability existed but was dead: `PlaybackScreen`
// accepted a `nextEpisode` callback and rendered a `Next Episode` button and a
// skip-next transport button, but no caller ever passed one, so nothing could
// ever advance.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_queue.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_navigation.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/features/settings/settings_screen.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/season.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

List<PlaybackQueueItem> _queue() => const [
      PlaybackQueueItem(
        mediaId: 102,
        title: 'Cat\'s in the Bag...',
        seasonNumber: 1,
        episodeNumber: 2,
      ),
      PlaybackQueueItem(
        mediaId: 103,
        title: '...And the Bag\'s in the River',
        seasonNumber: 1,
        episodeNumber: 3,
      ),
    ];

void main() {
  late FakeMediaPlayer player;
  late FakeMediarrApiClient fakeApi;

  setUp(() {
    player = FakeMediaPlayer();
    fakeApi = FakeMediarrApiClient();
  });

  Future<void> pumpScreen(
    WidgetTester tester, {
    required int mediaId,
    String mediaType = 'episode',
    List<PlaybackQueueItem> queue = const [],
    bool autoplayEnabled = true,
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => fakeApi),
          autoplayNextEpisodeProvider.overrideWith((ref) async => autoplayEnabled),
          playbackServiceProvider.overrideWith((ref) => PlaybackService(
                ref.read(apiClientProvider.notifier),
                player: player,
                subtitleRenderer: FakeSubtitleRenderer(),
              )),
        ],
        child: MaterialApp(
          home: PlaybackScreen(
            streamUrl: 'http://example.com/$mediaId.mp4',
            title: 'Breaking Bad - S01E01',
            mediaId: mediaId,
            mediaType: mediaType,
            queue: queue,
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
  }

  /// Ends the current episode, which is what the player reports at the end of
  /// a stream.
  Future<void> completeEpisode(WidgetTester tester) async {
    player.emitStatus(MediaPlayerStatus.completed);
    await tester.pump();
    await tester.pump();
  }

  group('FR-3 queue construction', () {
    test('builds the remaining episodes of the season, then the next season', () {
      final series = Series(
        id: 1,
        title: 'Breaking Bad',
        seasons: [
          Season(
            id: 10,
            seasonNumber: 1,
            episodes: List.generate(
              3,
              (i) => Episode(
                id: 100 + i + 1,
                seasonNumber: 1,
                episodeNumber: i + 1,
                title: 'S1E${i + 1}',
                hasFile: true,
              ),
            ),
          ),
          Season(
            id: 20,
            seasonNumber: 2,
            episodes: List.generate(
              2,
              (i) => Episode(
                id: 200 + i + 1,
                seasonNumber: 2,
                episodeNumber: i + 1,
                title: 'S2E${i + 1}',
                hasFile: true,
              ),
            ),
          ),
        ],
      );

      final queue = buildEpisodeQueue(series, episodeId: 101);

      expect(
        queue.map((item) => item.mediaId).toList(),
        [102, 103, 201, 202],
        reason: 'The queue must continue through the season and then into the '
            'next season.',
      );
      expect(queue.first.title, 'S1E2');
      expect(queue.last.seasonNumber, 2);
      expect(queue.last.episodeNumber, 2);
    });

    test('is empty for the last episode of the last season', () {
      final series = Series(
        id: 1,
        title: 'Breaking Bad',
        seasons: [
          Season(
            id: 10,
            seasonNumber: 1,
            episodes: [
              Episode(
                id: 101,
                seasonNumber: 1,
                episodeNumber: 1,
                hasFile: true,
              ),
            ],
          ),
        ],
      );

      expect(buildEpisodeQueue(series, episodeId: 101), isEmpty);
    });

    test('is empty when the episode is not in the series', () {
      final series = Series(
        id: 1,
        title: 'Breaking Bad',
        seasons: [
          Season(
            id: 10,
            seasonNumber: 1,
            episodes: [
              Episode(
                id: 101,
                seasonNumber: 1,
                episodeNumber: 1,
                hasFile: true,
              ),
            ],
          ),
        ],
      );

      expect(buildEpisodeQueue(series, episodeId: 999), isEmpty);
    });
  });

  group('FR-3 Up Next countdown', () {
    testWidgets('shows the next episode with a countdown when an episode ends',
        (tester) async {
      await pumpScreen(tester, mediaId: 101, queue: _queue());

      await completeEpisode(tester);

      expect(find.text('Up Next'), findsOneWidget);
      expect(find.textContaining("Cat's in the Bag..."), findsWidgets);
      expect(find.text('Play now'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
      // The countdown starts at 15 s (FR-3).
      expect(find.textContaining('15'), findsWidgets);
    });

    testWidgets('does not start the next episode before the countdown ends',
        (tester) async {
      await pumpScreen(tester, mediaId: 101, queue: _queue());
      final opensBefore = player.openCalls.length;

      await completeEpisode(tester);
      await tester.pump(const Duration(seconds: 14));

      expect(
        player.openCalls.length,
        opensBefore,
        reason: 'Nothing may start while the countdown is still running.',
      );
      expect(find.text('Up Next'), findsOneWidget);
    });

    testWidgets('starts the next episode when the countdown expires',
        (tester) async {
      await pumpScreen(tester, mediaId: 101, queue: _queue());
      final opensBefore = player.openCalls.length;

      await completeEpisode(tester);
      await tester.pump(const Duration(seconds: 16));

      expect(
        player.openCalls.length,
        opensBefore + 1,
        reason: 'The countdown expiry must start the next episode.',
      );
      expect(find.text('Up Next'), findsNothing);
    });

    testWidgets('a D-pad press cancels the countdown, so nothing auto-starts',
        (tester) async {
      await pumpScreen(tester, mediaId: 101, queue: _queue());
      final opensBefore = player.openCalls.length;

      await completeEpisode(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
      // Well past the original countdown window.
      await tester.pump(const Duration(seconds: 30));

      expect(
        player.openCalls.length,
        opensBefore,
        reason: 'A key press must cancel autoplay: nobody may be forced into '
            'watching something they did not choose.',
      );
      expect(find.text('Up Next'), findsOneWidget);
    });

    testWidgets('Play now starts the next episode immediately', (tester) async {
      await pumpScreen(tester, mediaId: 101, queue: _queue());
      final opensBefore = player.openCalls.length;

      await completeEpisode(tester);
      await tester.tap(find.text('Play now'));
      await tester.pump();
      await tester.pump();

      expect(player.openCalls.length, opensBefore + 1);
    });

    testWidgets('Cancel returns to the completed overlay with a Next control',
        (tester) async {
      await pumpScreen(tester, mediaId: 101, queue: _queue());
      final opensBefore = player.openCalls.length;

      await completeEpisode(tester);
      await tester.tap(find.text('Cancel'));
      await tester.pump();
      await tester.pump();
      await tester.pump(const Duration(seconds: 30));

      expect(player.openCalls.length, opensBefore);
      expect(find.text('Up Next'), findsNothing);
      expect(find.text('Next Episode'), findsOneWidget);
      expect(find.text('Replay'), findsOneWidget);
    });
  });

  group('FR-3 when autoplay is off or there is nothing next', () {
    testWidgets('the toggle off stops anything from starting', (tester) async {
      await pumpScreen(
        tester,
        mediaId: 101,
        queue: _queue(),
        autoplayEnabled: false,
      );
      final opensBefore = player.openCalls.length;

      await completeEpisode(tester);
      await tester.pump(const Duration(seconds: 30));

      expect(player.openCalls.length, opensBefore);
      expect(find.text('Up Next'), findsNothing);
      expect(find.text('Playback Complete'), findsOneWidget);
    });

    testWidgets('the last episode offers no next control', (tester) async {
      await pumpScreen(tester, mediaId: 101);

      await completeEpisode(tester);

      expect(find.text('Up Next'), findsNothing);
      expect(find.text('Next Episode'), findsNothing);
      expect(find.text('Playback Complete'), findsOneWidget);
    });

    testWidgets('a movie never advances', (tester) async {
      await pumpScreen(tester, mediaId: 7, mediaType: 'movie');
      final opensBefore = player.openCalls.length;

      await completeEpisode(tester);
      await tester.pump(const Duration(seconds: 30));

      expect(
        player.openCalls.length,
        opensBefore,
        reason: 'Movies must never auto-advance, even with a queue present.',
      );
      expect(find.text('Playback Complete'), findsOneWidget);
    });
  });

  group('FR-3 route boundary', () {
    test('reads a well-formed queue', () {
      final queue = readPlaybackQueueFromExtra({
        'streamUrl': 'http://x/1',
        'queue': [
          {
            'mediaId': 102,
            'title': 'Next',
            'seasonNumber': 1,
            'episodeNumber': 2,
          },
        ],
      });

      expect(queue, hasLength(1));
      expect(queue.single.mediaId, 102);
      expect(queue.single.label, 'S01E02');
    });

    test('drops malformed entries instead of trusting them', () {
      final queue = readPlaybackQueueFromExtra({
        'queue': [
          'not an item',
          42,
          {'mediaId': 'nope', 'title': 'x', 'seasonNumber': 1, 'episodeNumber': 2},
          {'title': 'x', 'seasonNumber': 1, 'episodeNumber': 2},
          null,
        ],
      });

      expect(
        queue,
        isEmpty,
        reason: 'A malformed queue must disable autoplay, not crash playback.',
      );
    });

    test('returns an empty queue for a missing or foreign extra', () {
      expect(readPlaybackQueueFromExtra(null), isEmpty);
      expect(readPlaybackQueueFromExtra('nope'), isEmpty);
      expect(readPlaybackQueueFromExtra(<String, dynamic>{}), isEmpty);
    });
  });

  group('FR-3 settings toggle', () {
    testWidgets('is on by default and toggles to off', (tester) async {
      SharedPreferences.setMockInitialValues({});

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiClientProvider.overrideWith((ref) => FakeMediarrApiClient()),
          ],
          child: const MaterialApp(home: SettingsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Autoplay next episode'), findsOneWidget);
      expect(find.text('On'), findsOneWidget);

      await tester.tap(find.text('Autoplay next episode'));
      await tester.pumpAndSettle();

      expect(find.text('Off'), findsOneWidget);

      final prefs = await SharedPreferences.getInstance();
      expect(
        prefs.getBool(kAutoplayNextEpisodeKey),
        isFalse,
        reason: 'The choice must persist, not live in memory.',
      );
    });
  });

  group('FR-3 transport', () {
    testWidgets('skip next is present when a next episode exists',
        (tester) async {
      await pumpScreen(tester, mediaId: 101, queue: _queue());

      // The transport overlay is visible after start.
      await tester.pump();
      expect(find.byIcon(Icons.skip_next), findsOneWidget);
    });

    testWidgets('skip next is absent for the last episode', (tester) async {
      await pumpScreen(tester, mediaId: 101);

      await tester.pump();
      expect(find.byIcon(Icons.skip_next), findsNothing);
    });
  });
}