import { describe, expect, it } from 'vitest';
import { applyMusicProgress } from './musicProgress';

const now = new Date('2026-11-09T12:00:00Z');
const blank = { position: 0, isPlayed: false, playCount: 0, lastPlayedAt: null };

describe('applyMusicProgress', () => {
  it('stores position on a heartbeat without inflating the play count', () => {
    const update = applyMusicProgress(blank, { position: 30, duration: 200 }, now);
    expect(update).toMatchObject({ position: 30, isPlayed: false, playCount: 0 });
    expect(update.lastPlayedAt).toBe(now);
  });

  it('counts one play when the track crosses 90 %', () => {
    const update = applyMusicProgress(blank, { position: 180, duration: 200 }, now);
    expect(update).toMatchObject({ position: 180, isPlayed: true, playCount: 1 });
  });

  it('does not double-count a replay heartbeat', () => {
    const alreadyPlayed = { position: 200, isPlayed: true, playCount: 1, lastPlayedAt: null };
    expect(applyMusicProgress(alreadyPlayed, { position: 190, duration: 200 }, now).playCount).toBe(1);
  });

  it('tolerates zero duration and negative positions', () => {
    expect(applyMusicProgress(blank, { position: -5, duration: 0 }, now)).toMatchObject({ position: 0, isPlayed: false });
  });
});
