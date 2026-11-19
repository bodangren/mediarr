import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Regression cover for 2026-11-19.
///
/// The progress beacon fired every 10 s whatever the play state, so a paused
/// player reported a frozen position forever: the owner left the TV paused for
/// 7.5 hours and the server saw a "live" session the whole time (which used to
/// defer the post-import library scan, and still means thousands of pointless
/// writes). The pause/seek/stop paths write the position once instead.
void main() {
  late FakeMediarrApiClient apiClient;
  late FakeMediaPlayer player;

  setUp(() {
    apiClient = FakeMediarrApiClient();
    player = FakeMediaPlayer();
  });

  PlaybackService serviceWith(List<int> reports) {
    return PlaybackService(
      apiClient,
      player: player,
      progressReporter: ({
        required int mediaId,
        required String type,
        required int positionSeconds,
        required int durationSeconds,
      }) async {
        reports.add(positionSeconds);
      },
    );
  }

  test('beacons while playing', () {
    fakeAsync((async) {
      final reports = <int>[];
      final service = serviceWith(reports);
      service.play(
        streamUrl: 'http://example.com/v.mp4',
        title: 'T',
        mediaId: 5,
        mediaType: 'episode',
      );
      async.flushMicrotasks();
      player.emitPosition(const Duration(seconds: 120));
      player.emitDuration(const Duration(seconds: 600));
      player.emitStatus(MediaPlayerStatus.playing);
      async.flushMicrotasks();

      async.elapse(const Duration(seconds: 25));
      expect(reports, isNotEmpty, reason: 'a playing session must sync progress');
      service.stop();
      async.flushMicrotasks();
    });
  });

  test('stops beaconing once paused', () {
    fakeAsync((async) {
      final reports = <int>[];
      final service = serviceWith(reports);
      service.play(
        streamUrl: 'http://example.com/v.mp4',
        title: 'T',
        mediaId: 5,
        mediaType: 'episode',
      );
      async.flushMicrotasks();
      player.emitPosition(const Duration(seconds: 120));
      player.emitDuration(const Duration(seconds: 600));
      player.emitStatus(MediaPlayerStatus.playing);
      async.flushMicrotasks();
      async.elapse(const Duration(seconds: 25));
      expect(reports, isNotEmpty);

      player.emitStatus(MediaPlayerStatus.paused);
      async.flushMicrotasks();
      final afterPause = reports.length;

      // Ten beacon intervals of silence: the whole point of the fix.
      async.elapse(const Duration(seconds: 100));
      expect(
        reports.length,
        afterPause,
        reason: 'a paused player must not report a frozen position',
      );
      service.stop();
      async.flushMicrotasks();
    });
  });

  test('writes the position once when the viewer pauses', () {
    fakeAsync((async) {
      final reports = <int>[];
      final service = serviceWith(reports);
      service.play(
        streamUrl: 'http://example.com/v.mp4',
        title: 'T',
        mediaId: 5,
        mediaType: 'episode',
      );
      async.flushMicrotasks();
      player.emitPosition(const Duration(seconds: 300));
      player.emitDuration(const Duration(seconds: 900));
      player.emitStatus(MediaPlayerStatus.playing);
      async.flushMicrotasks();
      async.elapse(const Duration(seconds: 11));
      final beforePause = reports.length;

      // The player reports the paused state, then the service is told to pause.
      player.emitStatus(MediaPlayerStatus.paused);
      async.flushMicrotasks();
      service.pauseMedia();
      async.flushMicrotasks();

      expect(reports.length, beforePause + 1, reason: 'the bookmark is written once');
      expect(reports.last, 300);
      service.stop();
      async.flushMicrotasks();
    });
  });
}
