import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/music/music_loudness.dart';
import 'package:mediarr_client/shared/models/music.dart';

/// Owner report 2026-11-22: music at 100 % needed ~33 % for parity with movies (~3x). Measured
/// with ffmpeg ebur128 on the real library: music masters ≈ -9.9 LUFS, films ≈ -23.2 LUFS.
void main() {
  test('an average track lands in the owner-requested 0.4–0.5 band', () {
    final gain = musicGainForLoudness(-10.1);
    expect(gain, greaterThan(0.4));
    expect(gain, lessThan(0.5));
  });

  test('an already film-level track plays at (almost) full volume', () {
    expect(musicGainForLoudness(musicLoudnessTargetLufs), closeTo(1.0, 0.01));
  });

  test('unknown loudness falls back to the measured median trim', () {
    expect(musicGainForLoudness(null), closeTo(musicFallbackGain, 0.001));
  });

  test('clamps stay sane for extreme masters', () {
    expect(musicGainForLoudness(0), musicGainMin);
    expect(musicGainForLoudness(-45), musicGainMax);
  });

  test('the model reads loudnessLufs from the API payload', () {
    final track = MusicTrack.fromJson(const {'id': 7, 'title': 'Hells Bells', 'loudnessLufs': -9.5});
    expect(track.loudnessLufs, -9.5);
  });
}
