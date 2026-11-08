import { describe, expect, it } from 'vitest';
import { orderSubtitlePathsByPriority } from './SubtitlePathPriority';

const NOW = new Date('2026-11-08T12:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
const snap = (mediaId: number, overrides: Partial<{ progress: number; isWatched: boolean; lastWatched: Date | null }> = {}) => ({
  mediaId, progress: 0.4, isWatched: false, lastWatched: daysAgo(1), ...overrides,
});

describe('orderSubtitlePathsByPriority', () => {
  it('puts the path whose media is in progress first', () => {
    const ordered = orderSubtitlePathsByPriority(
      ['/tv/backfill.srt', '/movies/watched.srt'],
      (path) => (path.includes('watched')
        ? { kind: 'movie' as const, id: 5, addedAt: daysAgo(300) }
        : { kind: 'movie' as const, id: 6, addedAt: daysAgo(300) }),
      { movies: new Map([[5, snap(5)]]), episodes: new Map() },
      NOW,
    );
    expect(ordered).toEqual(['/movies/watched.srt', '/tv/backfill.srt']);
  });

  it('keeps unknown paths at the end in their original order', () => {
    const ordered = orderSubtitlePathsByPriority(
      ['/x/a.srt', '/x/unknown1.srt', '/x/b.srt', '/x/unknown2.srt'],
      (path) => (path.endsWith('a.srt')
        ? { kind: 'movie' as const, id: 1, addedAt: daysAgo(1) }
        : path.endsWith('b.srt')
          ? { kind: 'movie' as const, id: 2, addedAt: daysAgo(2) }
          : null),
      { movies: new Map(), episodes: new Map() },
      NOW,
    );
    expect(ordered).toEqual(['/x/a.srt', '/x/b.srt', '/x/unknown1.srt', '/x/unknown2.srt']);
  });

  it('handles an empty list', () => {
    expect(orderSubtitlePathsByPriority([], () => null, { movies: new Map(), episodes: new Map() }, NOW)).toEqual([]);
  });
});
