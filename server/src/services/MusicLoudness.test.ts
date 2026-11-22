import { describe, expect, it } from 'vitest';
import {
  MUSIC_GAIN_MAX,
  MUSIC_GAIN_MIN,
  MUSIC_LOUDNESS_TARGET_LUFS,
  musicGainForLoudness,
  parseEbur128Loudness,
} from './MusicLoudness';

/**
 * The numbers behind the fix (measured 2026-11-22 with the real library):
 * music masters ≈ -9.9 LUFS, films ≈ -23.2 LUFS → ~13 dB / 4.6x jump.
 */
describe('musicGainForLoudness', () => {
  it('lands a typical pop master near the owner-requested 0.4–0.5', () => {
    const gain = musicGainForLoudness(-10.1);
    expect(gain).toBeGreaterThan(0.4);
    expect(gain).toBeLessThan(0.5);
  });

  it('leaves a track already at the target untouched', () => {
    expect(musicGainForLoudness(MUSIC_LOUDNESS_TARGET_LUFS)).toBeCloseTo(1.0, 2);
  });

  it('never amplifies past unity and never silences a very quiet master', () => {
    expect(musicGainForLoudness(-40)).toBe(MUSIC_GAIN_MAX);
    expect(musicGainForLoudness(0)).toBe(MUSIC_GAIN_MIN);
  });

  it('falls back to the measured median trim when loudness is unknown', () => {
    expect(musicGainForLoudness(null)).toBeCloseTo(0.45, 2);
    expect(musicGainForLoudness(undefined)).toBeCloseTo(0.45, 2);
  });
});

describe('parseEbur128Loudness', () => {
  it('reads the final integrated value from ffmpeg output', () => {
    const stderr = [
      '    I:         -12.0 LUFS',
      '    LRA:         5.1 LU',
      '    I:          -7.4 LUFS',
      '    LRA:         5.1 LU',
    ].join('\n');
    expect(parseEbur128Loudness(stderr)).toBe(-7.4);
  });

  it('returns null when the summary is absent', () => {
    expect(parseEbur128Loudness('nothing here')).toBeNull();
  });
});
