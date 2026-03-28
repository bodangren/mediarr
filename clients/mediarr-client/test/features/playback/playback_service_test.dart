import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';

void main() {
  group('PlaybackState', () {
    test('default state is idle', () {
      const state = PlaybackState();
      expect(state.status, PlaybackStatus.idle);
      expect(state.position, Duration.zero);
      expect(state.duration, Duration.zero);
      expect(state.mediaTitle, isNull);
      expect(state.mediaId, isNull);
      expect(state.mediaType, isNull);
      expect(state.error, isNull);
      expect(state.overlayVisible, true);
      expect(state.subtitleTracks, isEmpty);
      expect(state.selectedSubtitleIndex, isNull);
    });

    test('progress is 0 when duration is 0', () {
      const state = PlaybackState();
      expect(state.progress, 0.0);
    });

    test('progress computes correctly', () {
      const state = PlaybackState(
        position: Duration(seconds: 30),
        duration: Duration(seconds: 120),
      );
      expect(state.progress, 0.25);
    });

    test('progress at 100%', () {
      const state = PlaybackState(
        position: Duration(seconds: 60),
        duration: Duration(seconds: 60),
      );
      expect(state.progress, 1.0);
    });

    test('copyWith preserves unchanged fields', () {
      const original = PlaybackState(
        status: PlaybackStatus.playing,
        mediaTitle: 'Test Movie',
        mediaId: 42,
        mediaType: 'movie',
        position: Duration(seconds: 10),
        duration: Duration(minutes: 2),
      );

      final updated = original.copyWith(position: const Duration(seconds: 20));

      expect(updated.status, PlaybackStatus.playing);
      expect(updated.mediaTitle, 'Test Movie');
      expect(updated.mediaId, 42);
      expect(updated.mediaType, 'movie');
      expect(updated.position, const Duration(seconds: 20));
      expect(updated.duration, const Duration(minutes: 2));
    });

    test('copyWith can change status', () {
      const state = PlaybackState(status: PlaybackStatus.playing);
      final paused = state.copyWith(status: PlaybackStatus.paused);
      expect(paused.status, PlaybackStatus.paused);
    });

    test('copyWith can set error', () {
      const state = PlaybackState();
      final errorState = state.copyWith(
        status: PlaybackStatus.error,
        error: 'Network timeout',
      );
      expect(errorState.status, PlaybackStatus.error);
      expect(errorState.error, 'Network timeout');
    });

    test('copyWith can update overlay visibility', () {
      const state = PlaybackState(overlayVisible: true);
      final hidden = state.copyWith(overlayVisible: false);
      expect(hidden.overlayVisible, false);
    });

    test('copyWith can update subtitle tracks', () {
      const state = PlaybackState();
      final withSubs = state.copyWith(
        subtitleTracks: ['English', 'Spanish'],
        selectedSubtitleIndex: 0,
      );
      expect(withSubs.subtitleTracks, ['English', 'Spanish']);
      expect(withSubs.selectedSubtitleIndex, 0);
    });
  });

  group('PlaybackStatus', () {
    test('has all expected values', () {
      expect(PlaybackStatus.values, contains(PlaybackStatus.idle));
      expect(PlaybackStatus.values, contains(PlaybackStatus.loading));
      expect(PlaybackStatus.values, contains(PlaybackStatus.playing));
      expect(PlaybackStatus.values, contains(PlaybackStatus.paused));
      expect(PlaybackStatus.values, contains(PlaybackStatus.buffering));
      expect(PlaybackStatus.values, contains(PlaybackStatus.error));
      expect(PlaybackStatus.values, contains(PlaybackStatus.completed));
    });
  });
}
