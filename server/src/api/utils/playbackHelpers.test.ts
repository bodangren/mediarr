import { describe, it, expect } from 'vitest';
import { latestPlaybackMap, serializePlaybackState } from './playbackHelpers';

function makeProgress(mediaId: number, position: number, overrides?: Partial<{ isWatched: boolean }>): any {
  return {
    id: mediaId * 100,
    mediaId,
    mediaType: 'movie',
    position,
    duration: 7200,
    progress: position / 7200,
    isWatched: overrides?.isWatched ?? false,
    lastWatched: new Date('2026-03-08T12:00:00Z'),
    createdAt: new Date('2026-03-08T12:00:00Z'),
    updatedAt: new Date('2026-03-08T12:00:00Z'),
  };
}

describe('latestPlaybackMap', () => {
  it('returns empty map for empty input', () => {
    expect(latestPlaybackMap([])).toEqual(new Map());
  });

  it('maps each mediaId to first occurrence', () => {
    const records = [makeProgress(1, 100), makeProgress(2, 200), makeProgress(1, 50)];
    const result = latestPlaybackMap(records);
    expect(result.size).toBe(2);
    expect(result.get(1)!.position).toBe(100);
    expect(result.get(2)!.position).toBe(200);
  });
});

describe('serializePlaybackState', () => {
  it('returns null for null input', () => {
    expect(serializePlaybackState(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(serializePlaybackState(undefined)).toBeNull();
  });

  it('serializes a progress record', () => {
    const result = serializePlaybackState(makeProgress(1, 300, { isWatched: true }));
    expect(result).toEqual({
      position: 300,
      duration: 7200,
      progress: 300 / 7200,
      isWatched: true,
      lastWatched: '2026-03-08T12:00:00.000Z',
    });
  });
});
