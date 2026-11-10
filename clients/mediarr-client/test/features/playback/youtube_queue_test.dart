// YouTube "Play all" queue: the library hands the visible order to the player
// and the player walks it with the same Up Next/autoplay machinery episodes use.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_queue.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/shared/models/youtube_video.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

YoutubeVideo _video(int id, String title) => YoutubeVideo(
      id: id,
      videoId: 'v$id',
      title: title,
      streamUrl: '/stream/$id',
      thumbUrl: '',
      channel: 'Channel',
    );

void main() {
  group('YouTube play-all queue construction', () {
    test('starts after the selected video and preserves the shown order', () {
      final videos = [
        _video(10, 'First'),
        _video(11, 'Second'),
        _video(12, 'Third'),
      ];

      final queue = buildYoutubeQueue(videos, startVideoId: 11);

      expect(queue.map((item) => item.mediaId).toList(), [12]);
      expect(queue.single.title, 'Third');
    });

    test('is empty for the last video of the list', () {
      final videos = [_video(10, 'First'), _video(11, 'Second')];

      expect(buildYoutubeQueue(videos, startVideoId: 11), isEmpty);
    });

    test('is empty when the video is not in the shown list', () {
      final videos = [_video(10, 'First')];

      expect(buildYoutubeQueue(videos, startVideoId: 999), isEmpty);
    });
  });

  testWidgets('player advances a YouTube queue and derives its stream URL',
      (tester) async {
    final player = FakeMediaPlayer();
    final fakeApi = FakeMediarrApiClient();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => fakeApi),
          autoplayNextEpisodeProvider.overrideWith((ref) async => true),
          playbackServiceProvider.overrideWith((ref) => PlaybackService(
                ref.read(apiClientProvider.notifier),
                player: player,
                subtitleRenderer: FakeSubtitleRenderer(),
              )),
        ],
        child: MaterialApp(
          home: PlaybackScreen(
            streamUrl: 'http://example.com/first.mp4',
            title: 'First',
            mediaId: 10,
            mediaType: 'youtube',
            youtubeQueue: const [
              YoutubePlaybackItem(mediaId: 11, title: 'Second'),
            ],
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    player.emitStatus(MediaPlayerStatus.completed);
    await tester.pump();
    await tester.pump();

    expect(find.text('Up Next'), findsOneWidget);
    expect(find.text('YouTube'), findsOneWidget);
    expect(find.text('Second'), findsWidgets);

    await tester.tap(find.text('Play now'));
    await tester.pump();
    await tester.pump();

    expect(player.openCalls.last, endsWith('/api/youtube/videos/11/stream'),
        reason: 'A queued YouTube video must stream from its own endpoint, '
            'never the episode stream endpoint.');
    expect(find.text('Up Next'), findsNothing);
  });
}
