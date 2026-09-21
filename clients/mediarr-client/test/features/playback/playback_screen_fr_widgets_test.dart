import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/features/playback/track_selection.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Widget tests that mount `PlaybackScreen` against a `FakeMediaPlayer` and
/// `FakeSubtitleRenderer` so the FR-6 (silent default track selection) and
/// FR-7 (subtitle timing nudge) behaviours can be exercised end-to-end
/// inside the Flutter widget test environment.
///
/// `media_kit`'s native player cannot be constructed in unit tests, so the
/// service is built with a `FakeMediaPlayer` and the screen detects that
/// `service.player` throws (it requires a real `MediaKitMediaPlayer`) — the
/// placeholder video surface is rendered instead. The transport overlay,
/// subtitle nudge bar, toast, and picker dialog all still render normally,
/// which is what these tests need.
///
/// `ProviderScope` is used (not `UncontrolledProviderScope`) so the
/// container is disposed when the widget tree unmounts, which cancels the
/// service's progress / overlay timers. The `player` and `renderer` are
/// captured by closure inside the override so the test still holds live
/// references and can assert against `setAudioTrackCalls` / `setDelays`
/// after the widget is mounted.
/// Bounded settle for this harness.
///
/// `FakeMediaPlayer` never emits a `playing` status, so the screen stays
/// in `PlaybackStatus.loading` and the indeterminate loading indicator
/// keeps requesting frames forever — `pumpAndSettle` therefore never
/// settles. Use one pump to process the tap and a single bounded clock
/// advance (past the 150 ms dialog route animation) instead.
Future<void> pumpUntilSettled(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

void main() {
  group('PlaybackScreen — FR-6 silent default track selection', () {
    late FakeMediarrApiClient apiClient;
    late FakeMediaPlayer player;
    late FakeSubtitleRenderer renderer;

    Future<void> pumpScreen(WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiClientProvider.overrideWith((ref) => apiClient),
            playbackServiceProvider.overrideWith((ref) {
              return PlaybackService(
                ref.read(apiClientProvider.notifier),
                player: player,
                subtitleRenderer: renderer,
              );
            }),
          ],
          child: const MaterialApp(
            home: PlaybackScreen(
              streamUrl: 'http://example.com/movie.mp4',
              title: 'Some Movie',
              mediaId: 7,
              mediaType: 'movie',
            ),
          ),
        ),
      );
      // Let initState run and the Future.microtask queue drain so
      // PlaybackScreen calls service.play().
      await tester.pump();
      await tester.pump();
    }

    setUp(() {
      apiClient = FakeMediarrApiClient();
      player = FakeMediaPlayer();
      renderer = FakeSubtitleRenderer();
    });

    testWidgets(
      'multi-track fixture (eng+jpn audio, zho+eng subs) selects eng/zho '
      'and shows no picker first',
      (tester) async {
        await pumpScreen(tester);

        // Player received the stream URL from the route.
        expect(player.openCalls, ['http://example.com/movie.mp4']);

        // Simulate the player discovering the multi-track fixture.
        await tester.runAsync(() async {
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
          await Future<void>.delayed(Duration.zero);
        });

        final container = ProviderScope.containerOf(
          tester.element(find.byType(PlaybackScreen)),
        );
        final state = container.read(playbackServiceProvider);
        expect(state.audioTracks.length, 2);
        expect(state.subtitleTracks.length, 2);
        expect(state.selectedAudioIndex, 1,
            reason: 'English audio track must be selected over Japanese.');
        expect(state.selectedSubtitleIndex, 1,
            reason: 'Chinese Simplified subtitle track must be selected '
                'over English.');
        expect(player.setAudioTrackCalls, contains('a-eng'));
        expect(player.setSubtitleTrackCalls, contains('s-zho'));

        // No picker dialog is shown automatically — the manual closed-caption
        // button is the only entry point.
        expect(find.byType(AlertDialog), findsNothing,
            reason: 'No subtitle picker must appear before the user taps '
                'the closed-caption button.');
      },
    );

    testWidgets(
      'no-eng audio fixture selects the first audio track and disables '
      'subs when no Chinese sub is present',
      (tester) async {
        await pumpScreen(tester);

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

        final container = ProviderScope.containerOf(
          tester.element(find.byType(PlaybackScreen)),
        );
        final state = container.read(playbackServiceProvider);
        expect(state.selectedAudioIndex, 0,
            reason: 'No English audio track — first audio track must win.');
        expect(state.selectedSubtitleIndex, isNull,
            reason: 'No Chinese Simplified sub — must NOT silently fall '
                'back to English.');
        expect(player.setSubtitleTrackCalls.last, isNull,
            reason: 'Subtitle must be explicitly disabled.');
        expect(find.byType(AlertDialog), findsNothing);
      },
    );

    testWidgets(
      'manual picker is reachable via the closed-caption button on the '
      'transport overlay (FR-6 manual override path)',
      (tester) async {
        await pumpScreen(tester);

        await tester.runAsync(() async {
          await Future<void>.delayed(Duration.zero);
          player.emitTracks(const MediaTrackLists(
            audio: [
              AudioTrackInfo(id: 'a-eng', language: 'eng', title: 'English'),
            ],
            subtitle: [
              SubtitleTrackInfo(id: 's-zho', language: 'zho', title: 'Chinese'),
              SubtitleTrackInfo(id: 's-eng', language: 'eng', title: 'English'),
            ],
          ));
          await Future<void>.delayed(Duration.zero);
        });

        // Rebuild the overlay with the emitted tracks before tapping — the
        // picker's onPressed otherwise captures the pre-emission state.
        await tester.pump();

        // The picker is hidden by default.
        expect(find.byType(AlertDialog), findsNothing);

        // The closed-caption button is the only entry point. Tap it.
        await tester.tap(find.byIcon(Icons.closed_caption));
        await pumpUntilSettled(tester);

        // The picker is now visible, with the default (zho) track checked.
        // Track rows render as "title · language" (see _trackLabel).
        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('Chinese · zho'), findsOneWidget);
        expect(find.text('English · eng'), findsOneWidget);
      },
    );
  });

  group('PlaybackScreen — FR-7 subtitle timing nudge', () {
    late FakeMediarrApiClient apiClient;
    late FakeMediaPlayer player;
    late FakeSubtitleRenderer renderer;

    Future<void> pumpScreen(WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiClientProvider.overrideWith((ref) => apiClient),
            playbackServiceProvider.overrideWith((ref) {
              return PlaybackService(
                ref.read(apiClientProvider.notifier),
                player: player,
                subtitleRenderer: renderer,
              );
            }),
          ],
          child: const MaterialApp(
            home: PlaybackScreen(
              streamUrl: 'http://example.com/movie.mp4',
              title: 'Some Movie',
              mediaId: 7,
              mediaType: 'movie',
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump();
    }

    setUp(() {
      apiClient = FakeMediarrApiClient();
      player = FakeMediaPlayer();
      renderer = FakeSubtitleRenderer();
    });

    testWidgets(
      'tapping +1s shifts the renderer delay by 1s and shows the toast',
      (tester) async {
        await pumpScreen(tester);

        // Renderer starts at zero (PlaybackService.play() resets the offset).
        expect(renderer.setDelays.last, Duration.zero);

        await tester.tap(find.text('+1s'));
        await pumpUntilSettled(tester);

        expect(
          renderer.setDelays.last,
          const Duration(seconds: 1),
          reason: 'The renderer must receive the cumulative +1s offset.',
        );

        // The toast is rendered with the formatted label.
        expect(find.text('Subs +1s'), findsOneWidget);

        // The service state reflects the cumulative offset.
        final container = ProviderScope.containerOf(
          tester.element(find.byType(PlaybackScreen)),
        );
        final state = container.read(playbackServiceProvider);
        expect(state.subtitleDelay, const Duration(seconds: 1));
      },
    );

    testWidgets(
      'tapping +0.5s then -1s shifts the renderer by -0.5s and renders '
      '"Subs -0.5s" toast',
      (tester) async {
        await pumpScreen(tester);

        await tester.tap(find.text('+0.5s'));
        await pumpUntilSettled(tester);
        await tester.tap(find.text('-1s'));
        await pumpUntilSettled(tester);

        expect(renderer.setDelays.last, const Duration(milliseconds: -500));
        expect(find.text('Subs -0.5s'), findsOneWidget);

        final container = ProviderScope.containerOf(
          tester.element(find.byType(PlaybackScreen)),
        );
        final state = container.read(playbackServiceProvider);
        expect(state.subtitleDelay, const Duration(milliseconds: -500));
      },
    );

    testWidgets(
      'tapping Reset returns the renderer delay to zero and clears the toast',
      (tester) async {
        await pumpScreen(tester);

        await tester.tap(find.text('+5s'));
        await pumpUntilSettled(tester);
        expect(renderer.setDelays.last, const Duration(seconds: 5));

        await tester.tap(find.text('Reset'));
        await pumpUntilSettled(tester);

        expect(renderer.setDelays.last, Duration.zero,
            reason: 'Reset must push the zero offset to the renderer.');
        expect(find.textContaining('Subs'), findsNothing,
            reason: 'After Reset the toast label is cleared.');
        final container = ProviderScope.containerOf(
          tester.element(find.byType(PlaybackScreen)),
        );
        final state = container.read(playbackServiceProvider);
        expect(state.subtitleDelay, Duration.zero);
        expect(state.subtitleDelayToast, isNull);
      },
    );

    testWidgets(
      'tapping +5s twice accumulates to +10s and the renderer receives '
      'each intermediate offset',
      (tester) async {
        await pumpScreen(tester);

        await tester.tap(find.text('+5s'));
        await pumpUntilSettled(tester);
        await tester.tap(find.text('+5s'));
        await pumpUntilSettled(tester);

        // Renderer was driven twice with the cumulative offsets.
        expect(renderer.setDelays.length, greaterThanOrEqualTo(2));
        expect(renderer.setDelays.last, const Duration(seconds: 10));
        expect(find.text('Subs +10s'), findsOneWidget);

        final container = ProviderScope.containerOf(
          tester.element(find.byType(PlaybackScreen)),
        );
        final state = container.read(playbackServiceProvider);
        expect(state.subtitleDelay, const Duration(seconds: 10));
      },
    );

    testWidgets(
      'the nudge control ships every Kodi-style step '
      '(-5s, -1s, -0.5s, +0.5s, +1s, +5s) plus Reset',
      (tester) async {
        await pumpScreen(tester);

        // All nudge buttons are visible at the same time.
        expect(find.text('-5s'), findsOneWidget);
        expect(find.text('-1s'), findsOneWidget);
        expect(find.text('-0.5s'), findsOneWidget);
        expect(find.text('+0.5s'), findsOneWidget);
        expect(find.text('+1s'), findsOneWidget);
        expect(find.text('+5s'), findsOneWidget);
        expect(find.text('Reset'), findsOneWidget);
      },
    );
  });
}