import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

class _RecordingApi extends FakeMediarrApiClient {
  final List<String> messages = [];

  @override
  Future<void> reportClientError({
    required String message,
    String? stack,
    String severity = 'error',
    String? route,
    Map<String, dynamic>? context,
  }) async {
    messages.add(message);
  }
}

/// Device defect 2026-11-09: episodes resumed at 0:00 and no diagnostic was recorded even after the
/// retry budget was exhausted — the exhaustion branch was unreachable because the throttle predicate
/// returned first. This pins BOTH behaviours: it re-seeks, and when seeking never lands it reports once
/// with the attempted target.
void main() {
  test('reports a one-shot failure when the player never honours the resume seek', () async {
    final player = FakeMediaPlayer();
    final api = _RecordingApi();
    final service = PlaybackService(
      api,
      player: player,
      resumeRetryInterval: const Duration(milliseconds: 5),
      maxResumeAttempts: 2,
    );
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
    // The player keeps reporting the start of the file despite seek() succeeding.
    for (var second = 0; second < 25; second++) {
      player.emitPosition(Duration(seconds: second % 5));
      await Future<void>.delayed(const Duration(milliseconds: 20));
    }
    await Future<void>.delayed(const Duration(milliseconds: 200));

    expect(player.seekCalls.where((call) => call == const Duration(seconds: 600)), isNotEmpty,
        reason: 'status=${service.state.status} duration=${service.state.duration}');
    expect(api.messages.where((message) => message.contains('resume seek did not take effect')), isNotEmpty);
    // Only one record per play, not one per tick.
    expect(api.messages.where((message) => message.contains('resume seek did not take effect')).length, 1);
    service.resetForNewPlayback();
  });
}
