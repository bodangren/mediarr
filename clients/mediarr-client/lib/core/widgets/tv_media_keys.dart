import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/music/music_player_service.dart';
import '../../shared/services/api_client.dart';
import '../../features/playback/playback_service.dart';

/// Global handler for the remote's dedicated media keys.
///
/// Library screens have no playback controls, so media keys pressed there used to do nothing. This
/// scope sits above the router and only acts when audio is loaded and no video session owns the
/// screen; video media keys stay in PlaybackScreen (its focus handler consumes them first).
class TvMediaKeyScope extends ConsumerWidget {
  const TvMediaKeyScope({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onKeyEvent: (node, event) {
        if (event is! KeyDownEvent) return KeyEventResult.ignored;
        final music = ref.read(musicPlayerProvider);
        if (music.current == null) return KeyEventResult.ignored;
        final video = ref.read(playbackServiceProvider);
        final videoActive = video.mediaId != null &&
            video.status != PlaybackStatus.idle &&
            video.status != PlaybackStatus.completed &&
            video.status != PlaybackStatus.error;
        if (videoActive) return KeyEventResult.ignored;

        final key = event.logicalKey;
        // Remote media keys behave differently per box: on the X96 Max+ (2026-11-21) a
        // synthetic MEDIA_PLAY landed on the focused control instead of the player, while
        // MEDIA_PAUSE paused correctly. Ship the observed codes as 'smoke' telemetry
        // (ignored by triage) so the real remote's mapping is known instead of guessed.
        ref.read(errorReporterProvider).report(
          message: 'media-key ${key.debugName ?? key.keyLabel} music=${music.current != null}',
          severity: 'smoke',
          route: 'media-keys',
        );
        final player = ref.read(musicPlayerProvider.notifier);
        if (key == LogicalKeyboardKey.mediaPlayPause || key == LogicalKeyboardKey.mediaPlay ||
            key == LogicalKeyboardKey.mediaPause) {
          player.toggle();
          return KeyEventResult.handled;
        }
        if (key == LogicalKeyboardKey.mediaTrackNext) {
          player.next();
          return KeyEventResult.handled;
        }
        if (key == LogicalKeyboardKey.mediaTrackPrevious) {
          player.previous();
          return KeyEventResult.handled;
        }
        if (key == LogicalKeyboardKey.mediaFastForward) {
          player.seekRelative(const Duration(seconds: 15));
          return KeyEventResult.handled;
        }
        if (key == LogicalKeyboardKey.mediaRewind) {
          player.seekRelative(const Duration(seconds: -15));
          return KeyEventResult.handled;
        }
        if (key == LogicalKeyboardKey.mediaStop) {
          player.pause();
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: child,
    );
  }
}
