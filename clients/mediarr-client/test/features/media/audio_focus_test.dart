import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/media/audio_focus.dart';

/// Owner report 2026-11-22: music and video played at the same time. Starting one must silence
/// the other; this pins the focus contract both services rely on.
void main() {
  setUp(AudioFocus.instance.reset);
  tearDown(AudioFocus.instance.reset);

  test('starting a video pauses music', () {
    var musicPaused = 0;
    AudioFocus.instance.pauseMusic = () => musicPaused++;
    AudioFocus.instance.takeForVideo();
    expect(musicPaused, 1);
  });

  test('starting music pauses the video', () {
    var videoPaused = 0;
    AudioFocus.instance.pauseVideo = () => videoPaused++;
    AudioFocus.instance.takeForMusic();
    expect(videoPaused, 1);
  });

  test('is harmless when nothing is registered', () {
    AudioFocus.instance.reset();
    AudioFocus.instance.takeForVideo();
    AudioFocus.instance.takeForMusic();
  });
}
