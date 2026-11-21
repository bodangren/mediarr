import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Owner request 2026-11-21: "have the client notify the server when there is playback so
/// that the server can throttle downloads and transcoding". Playing => signal; pausing =>
/// paused; closing => stop.
void main() {
  test('signals playing, paused and stop across a session', () async {
    final player = FakeMediaPlayer();
    final api = FakeMediarrApiClient();
    final service = PlaybackService(api, player: player);
    addTearDown(service.dispose);

    await service.play(
      streamUrl: 'http://x/stream',
      title: 'Entourage',
      mediaId: 321,
      mediaType: 'episode',
    );
    player.emitDuration(const Duration(seconds: 1300));
    player.emitStatus(MediaPlayerStatus.playing);
    await Future<void>.delayed(const Duration(milliseconds: 50));

    expect(api.playbackSessionSignals, isNotEmpty);
    expect(api.playbackSessionSignals.last.state, 'playing');
    expect(api.playbackSessionSignals.last.mediaId, 321);
    expect(api.playbackSessionSignals.last.type, 'episode');

    player.emitStatus(MediaPlayerStatus.paused);
    await Future<void>.delayed(const Duration(milliseconds: 50));
    expect(api.playbackSessionSignals.last.state, 'paused');
    expect(api.playbackSessionSignals.last.stop, isFalse);

    service.dispose();
    await Future<void>.delayed(const Duration(milliseconds: 20));
    expect(api.playbackSessionSignals.last.stop, isTrue);
  });
}
