import { describe, expect, it } from 'vitest';
import { applyMusicSkip, isEarlySkip } from './musicSkip';

const now = new Date('2026-11-28T12:00:00Z');
const none = { skipCount: 0, earlySkipCount: 0, lastSkippedAt: null as Date | null };

describe('isEarlySkip', () => {
  it('treats leaving before half the track as an early skip', () => {
    expect(isEarlySkip({ position: 20, duration: 200 })).toBe(true);
    expect(isEarlySkip({ position: 99, duration: 200 })).toBe(true);
    expect(isEarlySkip({ position: 100, duration: 200 })).toBe(false);
    expect(isEarlySkip({ position: 150, duration: 200 })).toBe(false);
  });

  it('uses the 30-second floor when the duration is not known yet', () => {
    expect(isEarlySkip({ position: 12, duration: 0 })).toBe(true);
    expect(isEarlySkip({ position: 45, duration: 0 })).toBe(false);
  });
});

describe('applyMusicSkip', () => {
  it('counts an early skip and stamps the time', () => {
    expect(applyMusicSkip(none, { position: 40, duration: 200 }, now)).toEqual({
      skipCount: 1,
      earlySkipCount: 1,
      lastSkippedAt: now,
    });
  });

  it('counts a late skip but not as an early skip', () => {
    expect(applyMusicSkip({ ...none, skipCount: 2, earlySkipCount: 1 }, { position: 150, duration: 200 }, now))
      .toMatchObject({ skipCount: 3, earlySkipCount: 1 });
  });

  it('does not count a completed listen as a skip (the 90% rule already counts the play)', () => {
    const current = { skipCount: 1, earlySkipCount: 1, lastSkippedAt: new Date('2026-11-01T00:00:00Z') };
    expect(applyMusicSkip(current, { position: 190, duration: 200 }, now)).toEqual(current);
  });

  it('treats an unknown duration as a skip and applies the 30-second floor', () => {
    expect(applyMusicSkip(none, { position: 10, duration: 0 }, now))
      .toMatchObject({ skipCount: 1, earlySkipCount: 1 });
    expect(applyMusicSkip(none, { position: 120, duration: 0 }, now))
      .toMatchObject({ skipCount: 1, earlySkipCount: 0 });
  });
});
