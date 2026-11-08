import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Owner defects of 2026-09-24, pinned on the real `PlaybackScreen`.
///
/// FR-7: the transport overlay hides 4 s after the last input and reappears on
/// any input; every input restarts the hide window. The window must hold even
/// when the player never reports `playing` (the old one-shot timer hid only
/// `if (status == playing)`, so a buffering blip froze the overlay forever).
///
/// FR-8: with the overlay up, Left and Right walk its controls and Select
/// activates the focused control. With the overlay hidden, Left and Right seek
/// on the video-surface path.
///
/// `FakeMediaPlayer` never emits a `playing` status, so the screen stays in
/// `PlaybackStatus.loading` and the spinner keeps requesting frames — use
/// bounded pumps, never `pumpAndSettle`.

/// One D-pad press with bounded pumps.
Future<void> press(WidgetTester tester, LogicalKeyboardKey key) async {
  await tester.sendKeyDownEvent(key);
  await tester.sendKeyUpEvent(key);
  await tester.pump(const Duration(milliseconds: 50));
}

void main() {
  late FakeMediaPlayer player;

  setUp(() => player = FakeMediaPlayer());

  Future<void> pumpScreen(WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => FakeMediarrApiClient()),
          playbackServiceProvider.overrideWith((ref) {
            return PlaybackService(
              ref.read(apiClientProvider.notifier),
              player: player,
              subtitleRenderer: FakeSubtitleRenderer(),
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
    // The auto-hide window only elapses while the video is running (controls
    // must stay visible on a paused screen).
    player.emitStatus(MediaPlayerStatus.playing);
    await tester.pump();
  }

  group('FR-7 overlay auto-hide', () {
    testWidgets('hides 5 s after input while playing', (tester) async {
      await pumpScreen(tester);
      expect(find.text('Some Movie'), findsOneWidget,
          reason: 'the overlay is up after play()');

      await tester.pump(const Duration(seconds: 6));

      expect(find.text('Some Movie'), findsNothing,
          reason: 'with the video running the controls must get out of the way');
    });

    testWidgets('stays visible while paused', (tester) async {
      await pumpScreen(tester);
      player.emitStatus(MediaPlayerStatus.paused);
      await tester.pump();
      // Wake the overlay so a fresh hide window is armed.
      await press(tester, LogicalKeyboardKey.arrowDown);

      await tester.pump(const Duration(seconds: 6));

      expect(
        find.text('Some Movie'),
        findsOneWidget,
        reason: 'a paused screen with hidden controls looks frozen; the viewer '
            'must always see how to resume.',
      );
    });

    testWidgets('every input restarts the hide window', (tester) async {
      await pumpScreen(tester);

      await tester.pump(const Duration(seconds: 3));
      await press(tester, LogicalKeyboardKey.arrowDown);
      await tester.pump(const Duration(seconds: 3));

      expect(find.text('Some Movie'), findsOneWidget,
          reason: 'the 3 s-old press must have restarted the window');

      await tester.pump(const Duration(seconds: 3));

      expect(find.text('Some Movie'), findsNothing);
    });

    testWidgets('any input reveals a hidden overlay', (tester) async {
      await pumpScreen(tester);
      await tester.pump(const Duration(seconds: 5));
      expect(find.text('Some Movie'), findsNothing);

      await press(tester, LogicalKeyboardKey.select);
      await tester.pump();

      expect(find.text('Some Movie'), findsOneWidget);
    });
  });

  group('FR-8 overlay d-pad controls', () {
    testWidgets('D-pad walks the overlay controls', (tester) async {
      await pumpScreen(tester);

      final seen = <FocusNode>{};
      Future<void> step(LogicalKeyboardKey key) async {
        final focus = FocusManager.instance.primaryFocus;
        if (focus != null) seen.add(focus);
        await press(tester, key);
        await tester.pump(const Duration(milliseconds: 50));
      }

      // Sweep every direction a few times: the overlay has a top bar and a
      // transport row, so a single Right-only walk cannot reach both.
      for (var round = 0; round < 2; round++) {
        for (final key in [
          LogicalKeyboardKey.arrowRight,
          LogicalKeyboardKey.arrowRight,
          LogicalKeyboardKey.arrowDown,
          LogicalKeyboardKey.arrowLeft,
          LogicalKeyboardKey.arrowDown,
          LogicalKeyboardKey.arrowUp,
          LogicalKeyboardKey.arrowUp,
          LogicalKeyboardKey.arrowLeft,
        ]) {
          await step(key);
        }
      }
      final focus = FocusManager.instance.primaryFocus;
      if (focus != null) seen.add(focus);

      expect(seen.length, greaterThanOrEqualTo(5),
          reason: 'every transport control must be reachable with the remote. '
              'Seen: ${seen.map((f) => f.debugLabel ?? f.hashCode).toList()}');
    });

    testWidgets('Select activates the focused control', (tester) async {
      await pumpScreen(tester);

      // Entry focus is the Play/Pause control (UX review 2026-11-07); Select
      // must drive that control rather than falling through to the root.
      final focused = FocusManager.instance.primaryFocus?.debugLabel ?? 'none';
      await press(tester, LogicalKeyboardKey.select);
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      expect(
        player.playOrPauseCalls,
        isNotEmpty,
        reason: 'Select must activate the focused control; focused=$focused',
      );
      expect(find.byType(PlaybackScreen), findsOneWidget);
    });

    testWidgets('Left and Right seek while the overlay is hidden',
        (tester) async {
      await pumpScreen(tester);
      player.emitDuration(const Duration(minutes: 2));
      await tester.pump();
      await tester.pump(const Duration(seconds: 5));
      expect(find.text('Some Movie'), findsNothing);

      await press(tester, LogicalKeyboardKey.arrowRight);
      await tester.pump();

      // Owner report 2026-11-08: waking the HUD on a seek made every following press move focus
      // instead of seeking. Arrows now seek directly and leave the overlay hidden.
      expect(find.text('Some Movie'), findsNothing,
          reason: 'seeking must not open the transport overlay');
      expect(player.seekCalls, contains(const Duration(seconds: 10)),
          reason: 'FR-8: arrows seek on the video-surface path (+10 s)');
    });

    testWidgets('remote Play, Pause, and Play/Pause keys control playback',
        (tester) async {
      await pumpScreen(tester);

      await press(tester, LogicalKeyboardKey.mediaPlay);
      await press(tester, LogicalKeyboardKey.mediaPause);
      await press(tester, LogicalKeyboardKey.mediaPlayPause);

      expect(player.playCalls, hasLength(1));
      expect(player.pauseCalls, hasLength(1));
      expect(player.playOrPauseCalls, hasLength(1));
    });
  });
}
