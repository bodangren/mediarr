import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';

import '../../support/fakes/fake_media_player.dart';
import '../../support/fakes/fake_api_client.dart';

/// Owner report 2026-11-21: video fell to a few frames per second after ~10 minutes and a
/// ten-second rewind fixed it. Measurement showed mpv silently falling back from
/// `mediacodec-copy` to software (`hwdec-current=no`); the rewind re-opens the decoder.
/// The watchdog automates that rewind.
void main() {
  test('re-seeks after a decoder fallback, once per minute', () async {
    final player = FakeMediaPlayer()..hardwareDecoderValue = 'mediacodec-copy';
    final api = FakeMediarrApiClient();
    final service = PlaybackService(api, player: player);
    addTearDown(service.dispose);

    await service.play(
      streamUrl: 'http://x/stream',
      title: 'Entourage',
      mediaId: 1,
      mediaType: 'episode',
    );
    player.emitDuration(const Duration(seconds: 1300));
    player.emitStatus(MediaPlayerStatus.playing);
    player.emitPosition(const Duration(seconds: 600));
    // Stream events are delivered asynchronously; let the service reach 'playing'.
    await Future<void>.delayed(const Duration(milliseconds: 50));
    // Hardware decoder is the baseline while playback runs.
    expect(await service.checkDecoderHealth(), isFalse);

    // Simulate the silent fallback.
    // First tick establishes the hardware baseline.
    expect(await service.checkDecoderHealth(), isFalse);
    player.hardwareDecoderValue = 'no';
    expect(await service.checkDecoderHealth(), isTrue, reason: 'fallback must trigger a heal');
    final seeks = player.seekCalls;
    expect(seeks, isNotEmpty);

    // Rate limit: a second tick inside the minute does nothing.
    expect(await service.checkDecoderHealth(), isFalse);
  });

  test('does nothing while the decoder stays hardware', () async {
    final player = FakeMediaPlayer();
    final service = PlaybackService(FakeMediarrApiClient(), player: player);
    addTearDown(service.dispose);
    await service.play(
      streamUrl: 'http://x/stream',
      title: 'Entourage',
      mediaId: 2,
      mediaType: 'episode',
    );
    player.emitStatus(MediaPlayerStatus.playing);
    expect(await service.checkDecoderHealth(), isFalse);
    expect(player.seekCalls, isEmpty);
  });
}
