// FR-8b: the transport overlay must be D-pad navigable.
//
// Owner-reported defect (2026-10-03): "The player overlay is not navigable.
// arrows don't do anything. Only enter to start and stop works, and it brings
// up the overlay controls."
//
// Root cause: the transient overlays (transport, Up Next, completed) live in
// the same focus scope as the root key-handler Focus. Flutter's `autofocus`
// only requests focus when the enclosing scope has no focused child; the root
// node takes focus whenever the overlay hides (FR-8), so on remount the
// overlay's autofocus silently does nothing. Focus stays on the root node,
// whose full-screen rect with `skipTraversal` yields no directional
// candidates — arrows do nothing. Select falls through to the root fallback
// and toggles play/pause, which matches the report exactly.
//
// The walk tests distinguish focus stops by node identity, not by label: all
// `_IconActionButton`s create identically-labeled `FocusableAction` nodes, so
// a label-only probe cannot tell two controls apart.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_queue.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';
import '../../support/focus_probe.dart';

const _queue = [
  PlaybackQueueItem(
    mediaId: 102,
    title: 'Purple Giraffe',
    seasonNumber: 1,
    episodeNumber: 2,
  ),
];

/// Identity of the focused node (label + hash), because overlay controls all
/// share the label `FocusableAction`.
String nodeId() {
  final n = primaryFocusNode();
  if (n == null) return 'none';
  final m = RegExp(r'#([0-9a-f]+)').firstMatch(n.toString());
  return '${focusLabel()}#${m?.group(1)}';
}

bool focusIsOnRoot() =>
    focusLabel() == 'PlaybackScreen.root' || !focusIsInteractive();

void main() {
  late FakeMediaPlayer player;

  setUp(() => player = FakeMediaPlayer());

  Future<void> pumpScreen(
    WidgetTester tester, {
    List<PlaybackQueueItem> queue = const [],
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => FakeMediarrApiClient()),
          autoplayNextEpisodeProvider.overrideWith((ref) async => true),
          playbackServiceProvider.overrideWith((ref) => PlaybackService(
                ref.read(apiClientProvider.notifier),
                player: player,
                subtitleRenderer: FakeSubtitleRenderer(),
              )),
        ],
        child: MaterialApp(
          home: PlaybackScreen(
            streamUrl: 'http://example.com/101.mp4',
            title: 'How I Met Your Mother S01E01',
            mediaId: 101,
            mediaType: 'episode',
            queue: queue,
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
  }

  /// Sends one key and pumps a bounded number of frames.
  ///
  /// `pressDpad` uses `pumpAndSettle`, which never returns on this screen:
  /// the fake player never reports `playing`, so the buffering spinner
  /// animates forever.
  Future<void> pressOnce(WidgetTester tester, LogicalKeyboardKey key) async {
    await tester.sendKeyEvent(key);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
  }

  group('FR-8b transport overlay navigation', () {
    testWidgets('a control owns focus when the overlay first appears',
        (tester) async {
      await pumpScreen(tester);

      expect(
        focusIsOnRoot(),
        isFalse,
        reason: 'After the overlay appears, a control must hold focus, not '
            'the full-screen root node (whose rect yields no directional '
            'candidates). Now on "${focusLabel()}".',
      );
    });

    testWidgets('a control owns focus when the overlay re-appears',
        (tester) async {
      await pumpScreen(tester);

      // Let the 4 s hide window elapse: the overlay unmounts and focus
      // returns to the root node (FR-8). This is the state the owner was in.
      await tester.pump(const Duration(seconds: 5));
      expect(find.text('How I Met Your Mother S01E01'), findsNothing,
          reason: 'the transport overlay must be hidden first');

      // Any key wakes the overlay (FR-7). On remount a control must own
      // focus again — today autofocus does nothing because the scope already
      // has the root node focused, and arrows die.
      await pressOnce(tester, LogicalKeyboardKey.arrowDown);
      expect(find.text('How I Met Your Mother S01E01'), findsOneWidget);

      expect(
        focusIsOnRoot(),
        isFalse,
        reason: 'After the overlay re-appears, focus must land on a control. '
            'Now on "${focusLabel()}", so arrows cannot navigate — the '
            'owner report of 2026-10-03.',
      );
    });

    testWidgets('arrows walk between distinct overlay controls', (tester) async {
      await pumpScreen(tester);

      final visited = <String>{nodeId()};
      for (final key in [
        LogicalKeyboardKey.arrowDown,
        LogicalKeyboardKey.arrowRight,
        LogicalKeyboardKey.arrowDown,
        LogicalKeyboardKey.arrowRight,
        LogicalKeyboardKey.arrowRight,
        LogicalKeyboardKey.arrowLeft,
        LogicalKeyboardKey.arrowUp,
        LogicalKeyboardKey.arrowDown,
      ]) {
        await pressOnce(tester, key);
        visited.add(nodeId());
      }

      expect(
        visited.length,
        greaterThanOrEqualTo(3),
        reason: 'Arrows must move between overlay controls. Stops visited: '
            '$visited',
      );
      expect(
        focusIsOnRoot(),
        isFalse,
        reason: 'Focus must never fall back to the root node while the '
            'overlay is up. Now on "${focusLabel()}".',
      );
    });

    testWidgets('Select activates the focused control, not a global fallback',
        (tester) async {
      await pumpScreen(tester);

      // At first appearance focus is on the Back control (autofocus). Select
      // must trigger THAT control — which pops the playback route — not fall
      // through to the root fallback that toggles play/pause.
      await pressOnce(tester, LogicalKeyboardKey.select);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(
        find.byType(PlaybackScreen),
        findsNothing,
        reason: 'Select on the focused Back control must exit playback. '
            'Before the fix no control held focus and Select toggled '
            'play/pause instead (owner report 2026-10-03).',
      );
    });
  });

  group('FR-8b Up Next card and completed overlay', () {
    testWidgets('focus lands on the Up Next card when it appears',
        (tester) async {
      await pumpScreen(tester, queue: _queue);

      player.emitStatus(MediaPlayerStatus.completed);
      await tester.pump();
      await tester.pump();

      expect(find.text('Up Next'), findsOneWidget);
      expect(
        focusedText(),
        contains('Play now'),
        reason: 'When the Up Next card appears, its "Play now" control must '
            'hold focus, so a remote user can choose Play now or Cancel. '
            'Now on "${focusLabel()}" with text "${focusedText()}".',
      );
    });

    testWidgets('focus lands on the completed overlay when it appears',
        (tester) async {
      await pumpScreen(tester);

      player.emitStatus(MediaPlayerStatus.completed);
      await tester.pump();
      await tester.pump();

      expect(find.text('Playback Complete'), findsOneWidget);
      expect(
        focusedText(),
        contains('Replay'),
        reason: 'When playback completes, the completed overlay must hold '
            'focus (Replay / Next / Back). Now on "${focusLabel()}" with '
            'text "${focusedText()}".',
      );
    });
  });
}
