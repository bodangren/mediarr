import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Device defect 2026-11-09: episode resume spent its retry budget while the stream was still
/// buffering (seeks dropped), then played from 0. Attempts must only be spent once playback runs and
/// the duration is known.
void main() {
  test('does not spend resume attempts while the stream is still loading', () async {
    final player = FakeMediaPlayer();
    final service = PlaybackService(
      FakeMediarrApiClient(),
      player: player,
      resumeRetryInterval: const Duration(milliseconds: 5),
    );
    addTearDown(service.dispose);

    await service.play(
      streamUrl: 'http://example.com/ep.mp4',
      title: 'Entourage',
      mediaId: 321,
      mediaType: 'episode',
      resumeFrom: const Duration(seconds: 600),
    );

    // Still opening/buffering, position stays at 0.
    player.emitPosition(Duration.zero);
    player.emitPosition(const Duration(milliseconds: 200));
    await Future<void>.delayed(const Duration(milliseconds: 100));
    expect(player.seekCalls, isEmpty, reason: 'No seek should be issued before the player is running.');

    // Now the player is running with a known duration; the service must seek.
    player.emitDuration(const Duration(seconds: 1300));
    player.emitStatus(MediaPlayerStatus.playing);
    player.emitPosition(Duration.zero);
    await Future<void>.delayed(const Duration(milliseconds: 150));
    expect(player.seekCalls, contains(const Duration(seconds: 600)));
    service.resetForNewPlayback();
  });
}
