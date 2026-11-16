// FR-4 — the end-of-playback prompts and every modal in the playback flow must
// be fully operable with the D-pad alone and must always have an escape route.
//
// Owner report 2026-11-16 (defect 4): "In the continue or not at the end of a
// video, answers can bring up screens which aren't navigable at all by D-pad. A
// mouse is required. (This problem exists across the UI, where the user may get
// locked into a screen and the only way to get out is to reboot the system.)"
//
// Three separate traps reproduced here on the real `PlaybackScreen`:
//   1. While the Up Next card / completed overlay is up the root key handler
//      still treats Left/Right as a seek (when the HUD auto-hid, which is the
//      normal state when a video ends) and Back as a HUD toggle. Arrows are
//      swallowed and focus is moved out of the prompt's focus scope onto
//      controls hidden behind it — the remote then appears dead.
//   2. The subtitle picker opened as a `showDialog` route with no focused
//      control: the first Select does nothing, and the HUD's auto-hide window
//      parks focus back on the playback root while the picker is still on
//      screen, leaving it unreachable until the app restarts.
//   3. The error screen has a visible Back button but the Back key only toggles
//      the (unrendered) HUD, so the remote has no way out.
//
// The `FakeMediaPlayer` never reports `playing` on its own and the progress /
// countdown / HUD timers are periodic, so every wait here is a bounded pump,
// never `pumpAndSettle`.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_queue.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/features/playback/track_selection.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';
import '../../support/focus_probe.dart';

const _nextEpisode = PlaybackQueueItem(
  mediaId: 102,
  title: 'Purple Giraffe',
  seasonNumber: 1,
  episodeNumber: 2,
);

const _secondNextEpisode = PlaybackQueueItem(
  mediaId: 103,
  title: 'The Pineapple Incident',
  seasonNumber: 1,
  episodeNumber: 3,
);

/// One D-pad press with bounded pumps (periodic timers never settle).
Future<void> _press(WidgetTester tester, LogicalKeyboardKey key) async {
  await tester.sendKeyEvent(key);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
}

/// All text rendered inside the focused control, whitespace-normalised.
String _focusedLabel() =>
    focusedText().replaceAll(RegExp(r'\s+'), ' ').trim();

void main() {
  late FakeMediaPlayer player;
  late FakeMediarrApiClient api;

  setUp(() {
    player = FakeMediaPlayer();
    api = FakeMediarrApiClient();
  });

  /// Mounts a browse screen with a focusable control, then pushes playback on
  /// top of it — the escape route must land somewhere navigable.
  Future<void> pumpPlayback(
    WidgetTester tester, {
    List<PlaybackQueueItem> queue = const [],
    bool autoplayEnabled = true,
    String mediaType = 'episode',
  }) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final navigatorKey = GlobalKey<NavigatorState>();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => api),
          autoplayNextEpisodeProvider
              .overrideWith((ref) async => autoplayEnabled),
          playbackServiceProvider.overrideWith((ref) => PlaybackService(
                ref.read(apiClientProvider.notifier),
                player: player,
                subtitleRenderer: FakeSubtitleRenderer(),
              )),
        ],
        child: MaterialApp(
          navigatorKey: navigatorKey,
          home: Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () {},
                child: const Text('Library home'),
              ),
            ),
          ),
        ),
      ),
    );

    navigatorKey.currentState!.push(
      MaterialPageRoute<void>(
        builder: (_) => PlaybackScreen(
          streamUrl: 'http://example.com/101.mp4',
          title: 'How I Met Your Mother S01E01',
          mediaId: 101,
          mediaType: mediaType,
          queue: queue,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
  }

  /// Emits the end of the stream, which is what the player reports at the end.
  Future<void> complete(WidgetTester tester) async {
    player.emitStatus(MediaPlayerStatus.completed);
    await tester.pump();
    await tester.pump();
  }

  /// Hides the transport HUD, which is its normal state when a long video ends.
  Future<void> hideHud(WidgetTester tester) async {
    player.emitStatus(MediaPlayerStatus.playing);
    await tester.pump();
    await tester.pump(const Duration(seconds: 6));
  }

  /// Emits subtitle tracks so the picker has rows to offer.
  Future<void> emitSubtitleTracks(WidgetTester tester) async {
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
    await tester.pump();
  }

  /// Walks the transport HUD to the closed-caption control with the D-pad and
  /// opens the picker with Select — exactly the remote path.
  Future<void> openSubtitlePicker(WidgetTester tester) async {
    await emitSubtitleTracks(tester);
    // Entry focus is Play/Pause; the transport row is Rewind, Play, Forward,
    // captions (no Next Episode for a movie).
    await _press(tester, LogicalKeyboardKey.arrowRight);
    await _press(tester, LogicalKeyboardKey.arrowRight);
    await _press(tester, LogicalKeyboardKey.select);
    await tester.pump(const Duration(milliseconds: 400));
  }

  group('FR-4 Up Next prompt', () {
    testWidgets('D-pad reaches both answers', (tester) async {
      await pumpPlayback(tester, queue: const [_nextEpisode]);
      await complete(tester);

      expect(find.text('Up Next'), findsOneWidget);
      expect(_focusedLabel(), contains('Play now'));

      await _press(tester, LogicalKeyboardKey.arrowRight);
      expect(_focusedLabel(), contains('Cancel'));
      expectVisibleFocus('arrow Right on the Up Next card');

      await _press(tester, LogicalKeyboardKey.arrowLeft);
      expect(_focusedLabel(), contains('Play now'));
      expectVisibleFocus('arrow Left on the Up Next card');
    });

    testWidgets('arrows walk the prompt when the HUD already auto-hid',
        (tester) async {
      // On the device a video ends long after the 5 s HUD window: the HUD is
      // hidden when the Up Next card appears. Left/Right must walk the card,
      // not seek the finished stream and swallow the press.
      await pumpPlayback(tester, queue: const [_nextEpisode]);
      await hideHud(tester);
      await complete(tester);

      expect(find.text('Up Next'), findsOneWidget);
      final seeksBefore = player.seekCalls.length;

      await _press(tester, LogicalKeyboardKey.arrowRight);

      expect(
        _focusedLabel(),
        contains('Cancel'),
        reason: 'With the HUD hidden, Right must still move focus from Play now '
            'to Cancel instead of being consumed as a seek.',
      );
      expectVisibleFocus('arrow Right with the HUD hidden');
      expect(
        player.seekCalls.length,
        seeksBefore,
        reason: 'No seek may be issued while the end-of-playback prompt owns '
            'the remote.',
      );
    });

    testWidgets('Back dismisses the prompt onto the completed overlay, focused',
        (tester) async {
      await pumpPlayback(tester, queue: const [_nextEpisode]);
      await hideHud(tester);
      await complete(tester);

      await _press(tester, LogicalKeyboardKey.escape);

      expect(
        find.text('Up Next'),
        findsNothing,
        reason: 'Back is the prompt\'s escape route: it must answer "not '
            'continue", never leave the viewer stuck on the countdown.',
      );
      expect(find.text('Playback Complete'), findsOneWidget);
      expect(
        _focusedLabel(),
        contains('Replay'),
        reason: 'Back must land focus on the completed overlay\'s Replay, not '
            'on the playback root (invisible) or controls hidden behind it.',
      );
      expectVisibleFocus('Back from the Up Next prompt');
    });

    testWidgets('system Back dismisses the prompt', (tester) async {
      await pumpPlayback(tester, queue: const [_nextEpisode]);
      await hideHud(tester);
      await complete(tester);

      await tester.binding.handlePopRoute();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Up Next'), findsNothing);
      expect(find.text('Playback Complete'), findsOneWidget);
      expectVisibleFocus('system Back from the Up Next prompt');
    });

    testWidgets('two Backs leave playback for the browse screen',
        (tester) async {
      await pumpPlayback(tester, queue: const [_nextEpisode]);
      await hideHud(tester);
      await complete(tester);

      await _press(tester, LogicalKeyboardKey.escape);
      expect(find.text('Playback Complete'), findsOneWidget);

      await _press(tester, LogicalKeyboardKey.escape);
      await tester.pump(const Duration(milliseconds: 500));

      expect(
        find.byType(PlaybackScreen),
        findsNothing,
        reason: 'The second Back on the completed overlay must leave playback; '
            'a remote must never be locked into the finished screen.',
      );
      expect(find.text('Library home'), findsOneWidget);
    });
  });

  group('FR-4 completed overlay', () {
    testWidgets('D-pad reaches Replay, Next Episode and Back', (tester) async {
      await pumpPlayback(
        tester,
        queue: const [_nextEpisode, _secondNextEpisode],
        autoplayEnabled: false,
      );
      await complete(tester);

      expect(find.text('Playback Complete'), findsOneWidget);
      expect(_focusedLabel(), contains('Replay'));

      await _press(tester, LogicalKeyboardKey.arrowRight);
      expect(_focusedLabel(), contains('Next Episode'));
      expectVisibleFocus('Right to Next Episode');

      await _press(tester, LogicalKeyboardKey.arrowRight);
      expect(_focusedLabel(), contains('Back'));
      expectVisibleFocus('Right to Back');

      await _press(tester, LogicalKeyboardKey.arrowLeft);
      expect(_focusedLabel(), contains('Next Episode'));
    });

    testWidgets('Back exits playback instead of parking focus on hidden controls',
        (tester) async {
      await pumpPlayback(tester, autoplayEnabled: false);
      await hideHud(tester);
      await complete(tester);

      expect(find.text('Playback Complete'), findsOneWidget);
      expect(_focusedLabel(), contains('Replay'));

      await _press(tester, LogicalKeyboardKey.escape);
      await tester.pump(const Duration(milliseconds: 500));

      expect(
        find.byType(PlaybackScreen),
        findsNothing,
        reason: 'Back on the completed overlay must be its visible Back action: '
            'leave playback. It used to only toggle the HUD and park focus on '
            'controls hidden behind the overlay (owner report 2026-11-16).',
      );
      expect(find.text('Library home'), findsOneWidget);
    });

    testWidgets('media keys cannot pull focus behind the overlay',
        (tester) async {
      await pumpPlayback(tester, autoplayEnabled: false);
      await hideHud(tester);
      await complete(tester);

      expect(_focusedLabel(), contains('Replay'));

      await _press(tester, LogicalKeyboardKey.mediaPlayPause);

      expect(
        _focusedLabel(),
        contains('Replay'),
        reason: 'A remote Play/Pause press while the completed overlay is up '
            'must not mount the transport HUD behind it and steal focus.',
      );
      expectVisibleFocus('Play/Pause key on the completed overlay');
    });

    testWidgets('the transport HUD never renders behind the overlay',
        (tester) async {
      // The stream ends while the HUD is up (the usual case right after the
      // viewer paused or pressed a key). The HUD's Play control must be gone:
      // controls behind the scrim are invisible but still focusable, which is
      // how the remote got lost there.
      await pumpPlayback(tester, autoplayEnabled: false);
      await complete(tester);

      expect(find.text('Playback Complete'), findsOneWidget);
      expect(
        find.byIcon(Icons.play_circle_filled),
        findsNothing,
        reason: 'The transport HUD must not stay mounted (and focusable) '
            'behind the completed overlay.',
      );
    });

    testWidgets('no arrow press moves focus off the overlay', (tester) async {
      await pumpPlayback(
        tester,
        queue: const [_nextEpisode, _secondNextEpisode],
        autoplayEnabled: false,
      );
      await complete(tester);

      const answers = {'Replay', 'Next Episode', 'Back'};
      for (final key in [
        LogicalKeyboardKey.arrowDown,
        LogicalKeyboardKey.arrowUp,
        LogicalKeyboardKey.arrowRight,
        LogicalKeyboardKey.arrowLeft,
        LogicalKeyboardKey.arrowDown,
        LogicalKeyboardKey.arrowRight,
      ]) {
        await _press(tester, key);
        expectVisibleFocus('$key on the completed overlay');
        expect(
          answers.any(_focusedLabel().contains),
          isTrue,
          reason: 'Focus escaped the completed overlay to "${_focusedLabel()}" '
              'after $key — controls behind the scrim are invisible, so the '
              'remote appears dead.',
        );
      }
    });
  });

  group('FR-4 subtitle picker', () {
    testWidgets('opens via D-pad with a visible control focused',
        (tester) async {
      await pumpPlayback(tester, mediaType: 'movie');

      await openSubtitlePicker(tester);

      expect(find.byType(AlertDialog), findsOneWidget);
      expect(
        focusIsInteractive(),
        isTrue,
        reason: 'The picker used to open with the modal route scope focused and '
            'no control active: the first Select did nothing ("a mouse is '
            'required"). Now on "${focusLabel()}".',
      );
      expect(_focusedLabel(), isNotEmpty,
          reason: 'A row or Close must own focus when the picker opens.');
    });

    testWidgets('arrows walk Off and every track row', (tester) async {
      await pumpPlayback(tester, mediaType: 'movie');
      await openSubtitlePicker(tester);

      final seen = <String>{_focusedLabel()};
      for (final key in [
        LogicalKeyboardKey.arrowUp,
        LogicalKeyboardKey.arrowDown,
        LogicalKeyboardKey.arrowDown,
        LogicalKeyboardKey.arrowDown,
        LogicalKeyboardKey.arrowUp,
      ]) {
        await _press(tester, key);
        expectVisibleFocus('$key in the subtitle picker');
        seen.add(_focusedLabel());
      }

      expect(seen.any((label) => label.contains('Off')), isTrue,
          reason: 'The "Off" row must be reachable by D-pad. Seen: $seen');
      expect(seen.any((label) => label.contains('Chinese · zho')), isTrue,
          reason: 'The Chinese row must be reachable. Seen: $seen');
      expect(seen.any((label) => label.contains('English · eng')), isTrue,
          reason: 'The English row must be reachable. Seen: $seen');
    });

    testWidgets('Select answers the picker and closes it', (tester) async {
      await pumpPlayback(tester, mediaType: 'movie');
      await openSubtitlePicker(tester);

      // Entry focus is the selected (Chinese) row; Up reaches "Off".
      await _press(tester, LogicalKeyboardKey.arrowUp);
      expect(_focusedLabel(), contains('Off'));

      await _press(tester, LogicalKeyboardKey.select);
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.byType(AlertDialog), findsNothing,
          reason: 'Select on a row must answer and dismiss the picker.');
      expect(player.setSubtitleTrackCalls.last, isNull,
          reason: '"Off" must disable subtitles.');
      expect(find.byType(PlaybackScreen), findsOneWidget);
    });

    testWidgets('Escape closes the picker onto a visible control',
        (tester) async {
      await pumpPlayback(tester, mediaType: 'movie');
      await openSubtitlePicker(tester);

      await _press(tester, LogicalKeyboardKey.escape);

      expect(find.byType(AlertDialog), findsNothing,
          reason: 'Escape/Back must close the picker.');
      expect(find.byType(PlaybackScreen), findsOneWidget);
      expectVisibleFocus('Escape from the subtitle picker');
    });

    testWidgets('system Back closes the picker', (tester) async {
      await pumpPlayback(tester, mediaType: 'movie');
      await openSubtitlePicker(tester);

      await tester.binding.handlePopRoute();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.byType(AlertDialog), findsNothing);
      expect(find.byType(PlaybackScreen), findsOneWidget);
      expectVisibleFocus('system Back from the subtitle picker');
    });

    testWidgets('the picker survives the HUD auto-hide window', (tester) async {
      await pumpPlayback(tester, mediaType: 'movie');
      // The video runs, so the HUD's 5 s auto-hide window is armed when the
      // picker opens.
      player.emitStatus(MediaPlayerStatus.playing);
      await tester.pump();
      await openSubtitlePicker(tester);

      // The HUD auto-hide window elapses while the picker is open. This used to
      // park focus back on the playback root beneath the dialog, leaving the
      // picker on screen and unreachable until a reboot.
      await tester.pump(const Duration(seconds: 6));

      expect(find.byType(AlertDialog), findsOneWidget);
      expect(
        focusIsInteractive(),
        isTrue,
        reason: 'The picker must keep its own focus while the HUD hides. Now on '
            '"${focusLabel()}".',
      );
      await _press(tester, LogicalKeyboardKey.arrowDown);
      expectVisibleFocus('arrow Down after the HUD hid under the picker');
    });
  });

  group('FR-4 error screen', () {
    testWidgets('Back leaves the error screen', (tester) async {
      await pumpPlayback(tester, mediaType: 'movie');
      player.emitError('decoder failure');
      await tester.pump();
      await tester.pump();

      expect(find.text("Couldn't play this video"), findsOneWidget);
      expect(_focusedLabel(), contains('Retry'));

      await _press(tester, LogicalKeyboardKey.escape);
      await tester.pump(const Duration(milliseconds: 500));

      expect(
        find.byType(PlaybackScreen),
        findsNothing,
        reason: 'The error screen shows a Back action; the Back key must be '
            'the same action instead of toggling an unrendered HUD.',
      );
      expect(find.text('Library home'), findsOneWidget);
    });
  });
}
