import { describe, expect, it } from 'vitest';
import { orderWantedCandidates, type WantedPriorityProgress } from './WantedSubtitlePriority';

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
