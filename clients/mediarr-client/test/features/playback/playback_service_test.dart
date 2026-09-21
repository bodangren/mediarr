import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/features/playback/track_selection.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_media_player.dart';

void main() {
  group('normalizeResumeOffset', () {
    test('keeps positive offsets unchanged', () {
      expect(
        normalizeResumeOffset(const Duration(seconds: 90)),
        const Duration(seconds: 90),
      );
    });

    test('clamps negative offsets to zero', () {
      expect(
        normalizeResumeOffset(const Duration(seconds: -5)),
        Duration.zero,
      );
    });
  });

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
        subtitleTracks: [
          SubtitleTrackInfo(id: 's1', language: 'eng', title: 'English'),
          SubtitleTrackInfo(id: 's2', language: 'spa', title: 'Spanish'),
        ],
        selectedSubtitleIndex: 0,
      );
      expect(withSubs.subtitleTracks.length, 2);
      expect(withSubs.subtitleTracks.first.language, 'eng');
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

  group('PlaybackService — default track selection (FR-6)', () {
    late FakeMediaPlayer player;
    late FakeSubtitleRenderer renderer;
    late PlaybackService service;

    setUp(() {
      player = FakeMediaPlayer();
      renderer = FakeSubtitleRenderer();
      service = PlaybackService(
        MediarrApiClient(),
        player: player,
        subtitleRenderer: renderer,
      );
    });

    tearDown(() async {
      await service.stop();
      await player.dispose();
    });

    testWidgets(
      'multi-track fixture (eng+jpn audio, zho+eng subs) selects eng/zho',
      (tester) async {
        await tester.runAsync(() async {
          // Pump microtasks so the service's `_listenToPlayer` subscriptions
          // are wired before we emit on the streams.
          await Future<void>.delayed(Duration.zero);

          player.emitTracks(const MediaTrackLists(
            audio: [
              AudioTrackInfo(id: 'a-jpn', language: 'jpn', title: 'Japanese'),
              AudioTrackInfo(id: 'a-eng', language: 'eng', title: 'English'),
            ],
            subtitle: [
              SubtitleTrackInfo(id: 's-eng', language: 'eng', title: 'English'),
              SubtitleTrackInfo(id: 's-zho', language: 'zho', title: 'Chinese'),
            ],
          ));

          // Allow the stream event to land on the listener.
          await Future<void>.delayed(Duration.zero);
        });

        expect(service.state.audioTracks.length, 2);
        expect(service.state.subtitleTracks.length, 2);
        expect(service.state.selectedAudioIndex, 1,
            reason: 'English audio track must be selected over Japanese.');
        expect(service.state.selectedSubtitleIndex, 1,
            reason: 'Chinese Simplified subtitle track must be selected '
                'over English.');
        expect(player.setAudioTrackCalls, contains('a-eng'));
        expect(player.setSubtitleTrackCalls, contains('s-zho'));
      },
    );

    testWidgets(
      'eng-only audio + zho-only subs fixture selects eng/no-sub fallback '
      'path is unreachable here',
      (tester) async {
        await tester.runAsync(() async {
          await Future<void>.delayed(Duration.zero);
          player.emitTracks(const MediaTrackLists(
            audio: [
              AudioTrackInfo(id: 'a-eng', language: 'eng', title: 'English'),
            ],
            subtitle: [
              SubtitleTrackInfo(id: 's-zho', language: 'zho', title: 'Chinese'),
            ],
          ));
          await Future<void>.delayed(Duration.zero);
        });

        expect(service.state.selectedAudioIndex, 0);
        expect(service.state.selectedSubtitleIndex, 0);
        expect(player.setAudioTrackCalls, contains('a-eng'));
        expect(player.setSubtitleTrackCalls, contains('s-zho'));
      },
    );

    testWidgets(
      'no-eng fixture (jpn audio, eng subs) selects first-audio/no-subs',
      (tester) async {
        await tester.runAsync(() async {
          await Future<void>.delayed(Duration.zero);
          player.emitTracks(const MediaTrackLists(
            audio: [
              AudioTrackInfo(id: 'a-jpn', language: 'jpn', title: 'Japanese'),
              AudioTrackInfo(id: 'a-spa', language: 'spa', title: 'Spanish'),
            ],
            subtitle: [
              SubtitleTrackInfo(id: 's-eng', language: 'eng', title: 'English'),
            ],
          ));
          await Future<void>.delayed(Duration.zero);
        });

        expect(service.state.selectedAudioIndex, 0,
            reason:
                'No English audio track — first audio track must be chosen.');
        expect(service.state.selectedSubtitleIndex, isNull,
            reason: 'No Chinese Simplified sub — must NOT silently fall '
                'back to English.');
        expect(player.setSubtitleTrackCalls.last, isNull,
            reason: 'Subtitle must be explicitly disabled (not left on '
                'a non-zho track).');
      },
    );

    testWidgets(
      'zh-Hans + zh-Hant fixture picks Simplified (zh-Hans)',
      (tester) async {
        await tester.runAsync(() async {
          await Future<void>.delayed(Duration.zero);
          player.emitTracks(const MediaTrackLists(
            audio: [
              AudioTrackInfo(id: 'a-eng', language: 'eng', title: 'English'),
            ],
            subtitle: [
              SubtitleTrackInfo(id: 's-hant', language: 'zh-Hant', title: 'Traditional'),
              SubtitleTrackInfo(id: 's-hans', language: 'zh-Hans', title: 'Simplified'),
            ],
          ));
          await Future<void>.delayed(Duration.zero);
        });

        expect(service.state.selectedSubtitleIndex, 1);
        expect(player.setSubtitleTrackCalls, contains('s-hans'));
      },
    );

    testWidgets(
      'empty subtitle list leaves selection null and disables subs',
      (tester) async {
        await tester.runAsync(() async {
          await Future<void>.delayed(Duration.zero);
          player.emitTracks(const MediaTrackLists(
            audio: [
              AudioTrackInfo(id: 'a-eng', language: 'eng', title: 'English'),
            ],
          ));
          await Future<void>.delayed(Duration.zero);
        });

        expect(service.state.subtitleTracks, isEmpty);
        expect(service.state.selectedSubtitleIndex, isNull);
        expect(player.setSubtitleTrackCalls, isNotEmpty);
        expect(player.setSubtitleTrackCalls.last, isNull);
      },
    );

    testWidgets('manual selectSubtitle overrides the default', (tester) async {
      await tester.runAsync(() async {
        await Future<void>.delayed(Duration.zero);
        player.emitTracks(const MediaTrackLists(
          audio: [
            AudioTrackInfo(id: 'a-eng', language: 'eng', title: 'English'),
          ],
          subtitle: [
            SubtitleTrackInfo(id: 's-zho', language: 'zho', title: 'Chinese'),
            SubtitleTrackInfo(id: 's-eng', language: 'eng', title: 'English'),
            SubtitleTrackInfo(id: 's-jpn', language: 'jpn', title: 'Japanese'),
          ],
        ));
        await Future<void>.delayed(Duration.zero);
      });

      // Default selection: Chinese.
      expect(service.state.selectedSubtitleIndex, 0);

      service.selectSubtitle(2);
      expect(service.state.selectedSubtitleIndex, 2);
      expect(player.setSubtitleTrackCalls.last, 's-jpn');
    });

    testWidgets('selectSubtitle(null) disables subtitles and clears index',
        (tester) async {
      await tester.runAsync(() async {
        await Future<void>.delayed(Duration.zero);
        player.emitTracks(const MediaTrackLists(
          audio: [
            AudioTrackInfo(id: 'a-eng', language: 'eng', title: 'English'),
          ],
          subtitle: [
            SubtitleTrackInfo(id: 's-zho', language: 'zho', title: 'Chinese'),
          ],
        ));
        await Future<void>.delayed(Duration.zero);
      });

      service.selectSubtitle(0);
      expect(service.state.selectedSubtitleIndex, 0);

      service.selectSubtitle(null);
      expect(service.state.selectedSubtitleIndex, isNull);
      expect(player.setSubtitleTrackCalls.last, isNull);
    });
  });

  group('PlaybackService — subtitle timing nudge (FR-7)', () {
    late FakeMediaPlayer player;
    late FakeSubtitleRenderer renderer;
    late PlaybackService service;

    setUp(() {
      player = FakeMediaPlayer();
      renderer = FakeSubtitleRenderer();
      service = PlaybackService(
        MediarrApiClient(),
        player: player,
        subtitleRenderer: renderer,
      );
    });

    tearDown(() async {
      await service.stop();
      await player.dispose();
    });

    test('nudgeSubtitleDelay accumulates offsets', () async {
      await service.nudgeSubtitleDelay(const Duration(milliseconds: 500));
      await service.nudgeSubtitleDelay(const Duration(seconds: 1));
      expect(service.state.subtitleDelay, const Duration(milliseconds: 1500));
      expect(renderer.setDelays, [
        const Duration(milliseconds: 500),
        const Duration(milliseconds: 1500),
      ]);
    });

    test('nudgeSubtitleDelay clamps to ±60s', () async {
      for (var i = 0; i < 20; i++) {
        await service.nudgeSubtitleDelay(const Duration(seconds: 5));
      }
      expect(service.state.subtitleDelay, const Duration(seconds: 60));

      for (var i = 0; i < 30; i++) {
        await service.nudgeSubtitleDelay(const Duration(seconds: -5));
      }
      expect(service.state.subtitleDelay, const Duration(seconds: -60));
    });

    test('nudgeSubtitleDelay sets a toast label', () async {
      await service.nudgeSubtitleDelay(const Duration(milliseconds: 500));
      expect(service.state.subtitleDelayToast, 'Subs +0.5s');
    });

    test('resetSubtitleDelay returns offset and renderer to zero', () async {
      await service.nudgeSubtitleDelay(const Duration(seconds: 5));
      await service.nudgeSubtitleDelay(const Duration(seconds: 1));
      expect(service.state.subtitleDelay, const Duration(seconds: 6));

      await service.resetSubtitleDelay();
      expect(service.state.subtitleDelay, Duration.zero);
      expect(renderer.setDelays.last, Duration.zero);
      expect(service.state.subtitleDelayToast, isNull);
    });

    test('renderer receives the shifted timestamps (sub-delay contract)', () async {
      await service.nudgeSubtitleDelay(const Duration(milliseconds: 1500));
      // The renderer must receive exactly the cumulative offset; the player
      // converts this into the actual libmpv sub-delay property in
      // production. Tests assert the contract here.
      expect(renderer.setDelays.last, const Duration(milliseconds: 1500));

      await service.resetSubtitleDelay();
      expect(renderer.setDelays.last, Duration.zero);
    });

    test(
      'per-media reset: play() clears subtitleDelay even after nudges',
      () async {
        await service.nudgeSubtitleDelay(const Duration(seconds: 3));
        expect(service.state.subtitleDelay, const Duration(seconds: 3));

        await service.play(
          streamUrl: 'http://example.com/movie.mp4',
          title: 'Some Movie',
          mediaId: 7,
          mediaType: 'movie',
        );

        expect(service.state.subtitleDelay, Duration.zero);
        expect(service.state.subtitleDelayToast, isNull);
        expect(renderer.setDelays.last, Duration.zero);
      },
    );

    test(
      'per-media reset: a fresh nudge on the new media item starts from zero',
      () async {
        await service.play(
          streamUrl: 'http://example.com/movie-a.mp4',
          title: 'Movie A',
          mediaId: 1,
          mediaType: 'movie',
        );
        await service.nudgeSubtitleDelay(const Duration(seconds: 2));

        await service.play(
          streamUrl: 'http://example.com/movie-b.mp4',
          title: 'Movie B',
          mediaId: 2,
          mediaType: 'movie',
        );

        // Fresh media — offset reset.
        expect(service.state.subtitleDelay, Duration.zero);

        await service.nudgeSubtitleDelay(const Duration(milliseconds: 500));
        expect(service.state.subtitleDelay, const Duration(milliseconds: 500));
      },
    );

    test('subtitleNudgeSteps covers the Kodi-style set', () {
      expect(subtitleNudgeSteps, contains(const Duration(milliseconds: -5000)));
      expect(subtitleNudgeSteps, contains(const Duration(milliseconds: -1000)));
      expect(subtitleNudgeSteps, contains(const Duration(milliseconds: -500)));
      expect(subtitleNudgeSteps, contains(const Duration(milliseconds: 500)));
      expect(subtitleNudgeSteps, contains(const Duration(milliseconds: 1000)));
      expect(subtitleNudgeSteps, contains(const Duration(milliseconds: 5000)));
    });
  });
}
