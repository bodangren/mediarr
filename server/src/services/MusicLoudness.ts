/**
 * Music loudness measurement — the owner's "music is 3x louder than movies" fix.
 *
 * Measured 2026-11-22 with ffmpeg `ebur128` over real library samples:
 *
 * | library            | integrated loudness |
 * |--------------------|---------------------|
 * | music tracks       | **-7.4 / -13.5 / -8.7 LUFS** (mean ≈ -9.9) |
 * | films and episodes | **-20.1 / -23.1 / -26.4 LUFS** (mean ≈ -23.2) |
 *
 * That is a **~13 dB** jump (≈4.6x amplitude), matching the owner turning music down to 33 %.
 * The level is set by the *content masters*, not by the player (both paths use mpv at volume 1).
 *
 * The fix is per-track normalisation: measure each track once, store LUFS on the row, and let the
 * client play music at a gain that lands it on the film target. Nothing is re-encoded.
 */

/**
 * Target the client normalises music to.
 *
 * First attempt was -23 LUFS (film level) and the owner's verdict was *"you went too far down on
 * the music. Bring it up to about 0.4 or 0.5"* — at the measured music average of -10.1 LUFS a
 * 0.45 gain means **-17 LUFS**. So music sits a little above dialogue but no longer requires a
 * 3x volume change; the owner asked for 0.4–0.5 and this lands at 0.44 on an average track.
 */
export const MUSIC_LOUDNESS_TARGET_LUFS = -17;

/** Bounds so a very dynamic or very quiet master cannot be over-amplified or silenced. */
export const MUSIC_GAIN_MIN = 0.3;
export const MUSIC_GAIN_MAX = 1.0;

/** Fallback trim when a track has not been measured yet: the observed median jump. */
export const MUSIC_FALLBACK_GAIN = 0.45;

/**
 * Linear playback gain for a measured track. Pure and shared with the tests.
 *
 * LUFS are logarithmic (dB), mpv's volume is linear amplitude, so gain = 10^((target - measured)/20).
 */
export function musicGainForLoudness(
  loudnessLufs: number | null | undefined,
  target: number = MUSIC_LOUDNESS_TARGET_LUFS,
): number {
  if (typeof loudnessLufs !== 'number' || !Number.isFinite(loudnessLufs) || loudnessLufs <= -100) {
    return MUSIC_FALLBACK_GAIN;
  }
  const gain = 10 ** ((target - loudnessLufs) / 20);
  return Math.min(MUSIC_GAIN_MAX, Math.max(MUSIC_GAIN_MIN, gain));
}

/** Parses `ffmpeg -af ebur128` stderr and returns the final integrated loudness. */
export function parseEbur128Loudness(stderr: string): number | null {
  const matches = stderr.match(/^\s+I:\s+(-?\d+(?:\.\d+)?) LUFS/gm);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1]!;
  const value = Number(last.match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(value) ? value : null;
}
