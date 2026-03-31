import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';

String formatDuration(Duration d) {
  final hours = d.inHours;
  final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  if (hours > 0) return '$hours:$minutes:$seconds';
  return '$minutes:$seconds';
}

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

  group('formatDuration', () {
    test('formats zero', () {
      expect(formatDuration(Duration.zero), '00:00');
    });

    test('formats seconds only', () {
      expect(formatDuration(const Duration(seconds: 45)), '00:45');
    });

    test('formats minutes and seconds', () {
      expect(formatDuration(const Duration(minutes: 5, seconds: 30)), '05:30');
    });

    test('formats hours, minutes, seconds', () {
      expect(
        formatDuration(const Duration(hours: 1, minutes: 23, seconds: 45)),
        '1:23:45',
      );
    });

    test('pads single digit minutes and seconds', () {
      expect(formatDuration(const Duration(minutes: 1, seconds: 5)), '01:05');
    });

    test('formats exactly 2 hours', () {
      expect(formatDuration(const Duration(hours: 2)), '2:00:00');
    });
  });

  group('PlaybackScreen overlay rendering (widget smoke tests)', () {
    testWidgets('loading state shows CircularProgressIndicator', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: const Scaffold(
            backgroundColor: Colors.black,
            body: Center(
              child: CircularProgressIndicator(
                color: MediarrColors.accentPrimary,
              ),
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('error state shows error icon, message, and back button', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: Scaffold(
            backgroundColor: Colors.black,
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.error,
                    color: MediarrColors.statusError,
                    size: 48,
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Playback error',
                    style: TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 20,
                    ),
                  ),
                  const Text(
                    'Network timeout',
                    style: TextStyle(color: MediarrColors.textMuted),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(onPressed: () {}, child: const Text('Back')),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.error), findsOneWidget);
      expect(find.text('Playback error'), findsOneWidget);
      expect(find.text('Network timeout'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Back'), findsOneWidget);
    });

    testWidgets('completed overlay shows replay and back buttons', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: Scaffold(
            backgroundColor: Colors.black,
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: MediarrColors.statusSuccess,
                    size: 64,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Playback Complete',
                    style: TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ElevatedButton.icon(
                        icon: const Icon(Icons.replay),
                        label: const Text('Replay'),
                        onPressed: () {},
                      ),
                      const SizedBox(width: 16),
                      OutlinedButton(
                        onPressed: () {},
                        child: const Text('Back to Library'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.text('Playback Complete'), findsOneWidget);
      expect(find.text('Replay'), findsOneWidget);
      expect(find.text('Back to Library'), findsOneWidget);
    });

    testWidgets('completed overlay shows next episode when callback exists', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: Scaffold(
            backgroundColor: Colors.black,
            body: Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ElevatedButton.icon(
                    icon: const Icon(Icons.replay),
                    label: const Text('Replay'),
                    onPressed: () {},
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.skip_next),
                    label: const Text('Next Episode'),
                    onPressed: () {},
                  ),
                  const SizedBox(width: 16),
                  OutlinedButton(
                    onPressed: () {},
                    child: const Text('Back to Library'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.text('Replay'), findsOneWidget);
      expect(find.text('Next Episode'), findsOneWidget);
      expect(find.text('Back to Library'), findsOneWidget);
    });

    testWidgets('transport overlay shows pause icon when playing', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: Scaffold(
            backgroundColor: Colors.black,
            body: Center(
              child: IconButton(
                icon: const Icon(
                  Icons.pause_circle_filled,
                  color: MediarrColors.accentPrimary,
                  size: 56,
                ),
                onPressed: () {},
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.pause_circle_filled), findsOneWidget);
    });

    testWidgets('transport overlay shows play icon when paused', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: Scaffold(
            backgroundColor: Colors.black,
            body: Center(
              child: IconButton(
                icon: const Icon(
                  Icons.play_circle_filled,
                  color: MediarrColors.accentPrimary,
                  size: 56,
                ),
                onPressed: () {},
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.play_circle_filled), findsOneWidget);
    });

    testWidgets('transport overlay has rewind and forward buttons', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: Scaffold(
            backgroundColor: Colors.black,
            body: Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.replay_10,
                      color: Colors.white,
                      size: 36,
                    ),
                    onPressed: () {},
                  ),
                  const SizedBox(width: 24),
                  IconButton(
                    icon: const Icon(
                      Icons.play_circle_filled,
                      color: MediarrColors.accentPrimary,
                      size: 56,
                    ),
                    onPressed: () {},
                  ),
                  const SizedBox(width: 24),
                  IconButton(
                    icon: const Icon(
                      Icons.forward_10,
                      color: Colors.white,
                      size: 36,
                    ),
                    onPressed: () {},
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.replay_10), findsOneWidget);
      expect(find.byIcon(Icons.forward_10), findsOneWidget);
    });

    testWidgets('transport overlay shows skip next when callback provided', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: Scaffold(
            backgroundColor: Colors.black,
            body: Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.replay_10,
                      color: Colors.white,
                      size: 36,
                    ),
                    onPressed: () {},
                  ),
                  const SizedBox(width: 24),
                  IconButton(
                    icon: const Icon(
                      Icons.play_circle_filled,
                      color: MediarrColors.accentPrimary,
                      size: 56,
                    ),
                    onPressed: () {},
                  ),
                  const SizedBox(width: 24),
                  IconButton(
                    icon: const Icon(
                      Icons.forward_10,
                      color: Colors.white,
                      size: 36,
                    ),
                    onPressed: () {},
                  ),
                  const SizedBox(width: 24),
                  IconButton(
                    icon: const Icon(
                      Icons.skip_next,
                      color: Colors.white,
                      size: 36,
                    ),
                    onPressed: () {},
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.skip_next), findsOneWidget);
    });
  });
}
