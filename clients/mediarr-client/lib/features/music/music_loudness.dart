/// Music level against video, measured on the TV's own library (2026-11-22).
///
/// The owner: *"whenever music plays, I need to turn my volume down to about 33 % of the level I
/// use for movies, and then when I switch back to videos, turn it up by 3x."* The measurement
/// explains it exactly — music masters are around **-10 LUFS**, the library's films and episodes
/// are around **-23 LUFS**, i.e. a **~13 dB / 4.6x** jump. Both players output volume 1.0; the
/// difference is in the content masters.
///
/// The engine measures every track once (`ffmpeg ebur128`, stored as `MusicTrack.loudnessLufs`)
/// and playback is trimmed onto the film target, so switching between music and video no longer
/// needs a volume change. Nothing is re-encoded.
library;

import 'dart:math' as math;

/// Target loudness. The first attempt used the film level (-23) and the owner's verdict was
/// *"you went too far down on the music. Bring it up to about 0.4 or 0.5"* — at the measured
/// music average of -10.1 LUFS a 0.45 gain is **-17 LUFS**, so music sits slightly above dialogue
/// without needing a 3x volume change between music and video.
const double musicLoudnessTargetLufs = -17;

/// Bounds so a very quiet master cannot be amplified and a very loud one still stays audible.
const double musicGainMin = 0.3;
const double musicGainMax = 1.0;

/// Trim used until a track has been measured (and for resume snapshots saved before the
/// measurement existed): the owner-requested 0.45.
const double musicFallbackGain = 0.45;

/// Linear playback gain (0…1) for one track, matching the engine's `musicGainForLoudness`.
double musicGainForLoudness(double? loudnessLufs) {
  if (loudnessLufs == null || !loudnessLufs.isFinite || loudnessLufs <= -100) {
    return musicFallbackGain;
  }
  final gain = math.pow(10, (musicLoudnessTargetLufs - loudnessLufs) / 20).toDouble();
  return gain.clamp(musicGainMin, musicGainMax).toDouble();
}
