import { describe, expect, it } from 'vitest';
import { aggregateSeriesProgress, orderWantedCandidates, type WantedPriorityProgress } from './WantedSubtitlePriority';

const NOW = new Date('2026-11-08T12:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const row = (id: number, variantId: number) => ({ id, variantId });

function progress(overrides: Partial<WantedPriorityProgress> = {}): WantedPriorityProgress {
  return { movies: new Map(), episodes: new Map(), series: new Map(), ...overrides };
}

describe('orderWantedCandidates', () => {
  it('puts an in-progress movie before an untouched one', () => {
    const rows = [row(1, 11), row(2, 22)];
    const media = new Map([
      [11, { kind: 'movie' as const, id: 5, addedAt: daysAgo(400), seriesId: null }],
      [22, { kind: 'movie' as const, id: 6, addedAt: daysAgo(400), seriesId: null }],
    ]);
    const ordered = orderWantedCandidates(
      rows,
      (candidate) => media.get(candidate.variantId) ?? null,
      progress({ movies: new Map([[5, { mediaId: 5, progress: 0.3, isWatched: false, lastWatched: daysAgo(1) }]]) }),
      NOW,
    );
    expect(ordered.map((entry) => entry.id)).toEqual([1, 2]);
  });

  it('inherits series activity for an episode without its own progress', () => {
    const rows = [row(1, 11), row(2, 22)];
    const media = new Map([
      [11, { kind: 'episode' as const, id: 100, addedAt: daysAgo(400), seriesId: 9 }],
      [22, { kind: 'episode' as const, id: 200, addedAt: daysAgo(400), seriesId: 10 }],
    ]);
    const ordered = orderWantedCandidates(
      rows,
      (candidate) => media.get(candidate.variantId) ?? null,
      progress({ series: new Map([[9, { mediaId: 0, progress: 0.5, isWatched: false, lastWatched: daysAgo(1) }]]) }),
      NOW,
    );
    expect(ordered.map((entry) => entry.id)).toEqual([1, 2]);
  });

  it('keeps unresolvable rows, after the ranked ones and in their original order', () => {
    const rows = [row(1, 11), row(2, 99), row(3, 33)];
    const media = new Map([
      [11, { kind: 'movie' as const, id: 5, addedAt: daysAgo(400), seriesId: null }],
      [33, { kind: 'movie' as const, id: 6, addedAt: daysAgo(400), seriesId: null }],
    ]);
    const ordered = orderWantedCandidates(rows, (candidate) => media.get(candidate.variantId) ?? null, progress(), NOW);
    expect(ordered.map((entry) => entry.id)).toEqual([1, 3, 2]);
  });

  it('prefers the show being watched over a recently added item', () => {
    const rows = [row(1, 11), row(2, 22)];
    const media = new Map([
      [11, { kind: 'movie' as const, id: 5, addedAt: daysAgo(2), seriesId: null }],
      [22, { kind: 'episode' as const, id: 100, addedAt: daysAgo(300), seriesId: 9 }],
    ]);
    const ordered = orderWantedCandidates(
      rows,
      (candidate) => media.get(candidate.variantId) ?? null,
      progress({ series: new Map([[9, { mediaId: 0, progress: 0.5, isWatched: false, lastWatched: daysAgo(1) }]]) }),
      NOW,
    );
    expect(ordered.map((entry) => entry.id)).toEqual([2, 1]);
  });
});

describe('aggregateSeriesProgress', () => {
  const snapshot = (mediaId: number, overrides: Partial<{ progress: number; isWatched: boolean; lastWatched: Date | null }> = {}) => ({
    mediaId,
    progress: 0.4,
    isWatched: false,
    lastWatched: daysAgo(1),
    ...overrides,
  });

  it('prefers an unfinished sibling over a finished one', () => {
    const result = aggregateSeriesProgress(
      new Map([
        [1, snapshot(1, { isWatched: true, lastWatched: daysAgo(0) })],
        [2, snapshot(2, { isWatched: false, lastWatched: daysAgo(5) })],
      ]),
      new Map([[1, 9], [2, 9]]),
    );
    expect(result.get(9)?.mediaId).toBe(2);
  });

  it('prefers the most recent when both are unfinished', () => {
    const result = aggregateSeriesProgress(
      new Map([
        [1, snapshot(1, { lastWatched: daysAgo(4) })],
        [2, snapshot(2, { lastWatched: daysAgo(2) })],
      ]),
      new Map([[1, 9], [2, 9]]),
    );
    expect(result.get(9)?.mediaId).toBe(2);
  });

  it('keeps separate series apart and ignores unmapped episodes', () => {
    const result = aggregateSeriesProgress(
      new Map([
        [1, snapshot(1)],
        [2, snapshot(2)],
        [3, snapshot(3)],
      ]),
      new Map([[1, 9], [2, 10]]),
    );
    expect([...result.keys()].sort((a, b) => a - b)).toEqual([9, 10]);
    expect(result.has(9)).toBe(true);
    expect(result.has(10)).toBe(true);
  });
});
