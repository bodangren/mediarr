/// Audio focus between the two players.
///
/// Owner report 2026-11-22: *"music and videos don't play audio exclusively, so if music is playing
/// and you start a video, both audio tracks continue to play."* The two players are independent
/// mpv instances with no shared focus owner, so nothing ever paused the other one.
///
/// Both services register their pause here and call [takeForVideo] / [takeForMusic] when they start
/// audio; the service that owns the other stream then stops. Kept as a tiny registry instead of
/// services importing each other, which would be a circular dependency.
library;

import 'package:flutter/foundation.dart';

/// Audio focus between the two players.
class AudioFocus {
  AudioFocus._();

  static final AudioFocus instance = AudioFocus._();

  /// Registered by the music player: pauses whatever it is playing.
  VoidCallback? pauseMusic;

  /// Registered by the video player: pauses the current playback session.
  VoidCallback? pauseVideo;

  /// Starting a video silences music.
  void takeForVideo() {
    final registered = pauseMusic != null;
    pauseMusic?.call();
    debugPrint('[audio-focus] video takes focus (music paused: $registered)');
  }

  /// Starting music silences video.
  void takeForMusic() {
    final registered = pauseVideo != null;
    pauseVideo?.call();
    debugPrint('[audio-focus] music takes focus (video paused: $registered)');
  }

  /// Test seam: clears registrations between tests.
  void reset() {
    pauseMusic = null;
    pauseVideo = null;
  }
}

typedef VoidCallback = void Function();
