import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Behaviour pin for the device defect (2026-11-09): the player can accept
/// `open(startAt: 600)` yet begin streaming at 0, and the service must notice and re-seek instead of
/// leaving the viewer at the beginning (the progress guard then protects the stored bookmark).
void main() {
  test('re-seeks when the player ignores the resume start offset', () async {
    final player = FakeMediaPlayer();
    final service = PlaybackService(FakeMediarrApiClient(), player: player);
    addTearDown(service.dispose);

    await service.play(
      streamUrl: 'http://example.com/ep.mp4',
      title: 'Entourage',
      mediaId: 321,
      mediaType: 'episode',
      resumeFrom: const Duration(seconds: 600),
    );
    player.emitDuration(const Duration(seconds: 1300));
    player.emitStatus(MediaPlayerStatus.playing);

    // The player starts at 0 despite the requested start offset.
    for (var second = 0; second <= 3; second++) {
      player.emitPosition(Duration(seconds: second));
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }
    // Retry is throttled at 2 s; give it one window.
    await Future<void>.delayed(const Duration(milliseconds: 2200));

    expect(
      player.seekCalls,
      contains(const Duration(seconds: 600)),
      reason: 'The service must re-seek to the stored resume position when open(startAt:) was ignored.',
    );
    service.resetForNewPlayback();
  });
}
