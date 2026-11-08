import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/playback_queue.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Regression: the device reported
/// `LateInitializationError: Field '_queue' has already been initialized.`
/// when the screen was rebuilt with a new Up Next queue. The queue field used to
/// be `late final`, so `didUpdateWidget` could never legitimately replace it.
void main() {
  testWidgets('rebuilding with a new queue does not throw LateInitializationError', (tester) async {
    final apiClient = FakeMediarrApiClient();
    final player = FakeMediaPlayer();
    final renderer = FakeSubtitleRenderer();

    late StateSetter rebuild;
    var queue = <PlaybackQueueItem>[
      const PlaybackQueueItem(mediaId: 1, title: 'S01E01', seasonNumber: 1, episodeNumber: 1),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => apiClient),
          playbackServiceProvider.overrideWith((ref) => PlaybackService(
                ref.read(apiClientProvider.notifier),
                player: player,
                subtitleRenderer: renderer,
              )),
        ],
        child: MaterialApp(
          home: StatefulBuilder(
            builder: (context, setState) {
              rebuild = setState;
              return PlaybackScreen(
                streamUrl: 'http://example.com/episode.mp4',
                title: 'S01E01',
                mediaId: 1,
                mediaType: 'episode',
                queue: queue,
              );
            },
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    queue = [
      const PlaybackQueueItem(mediaId: 1, title: 'S01E01', seasonNumber: 1, episodeNumber: 1),
      const PlaybackQueueItem(mediaId: 2, title: 'S01E02', seasonNumber: 1, episodeNumber: 2),
    ];
    rebuild(() {});
    await tester.pump();
    await tester.pump();

    expect(tester.takeException(), isNull);
  });
}
