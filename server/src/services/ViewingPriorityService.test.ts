import { describe, expect, it } from 'vitest';
import {
  classifyViewingPriority,
  compareViewingPriority,
  isHighPriority,
  rankByViewingPriority,
  type ViewingPriorityInput,
} from './ViewingPriorityService';

const NOW = new Date('2026-11-08T12:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

function item(overrides: Partial<ViewingPriorityInput> = {}): ViewingPriorityInput {
  return {
    kind: 'movie',
    id: 1,
    addedAt: daysAgo(365),
    lastWatchedAt: null,
    isWatched: false,
    progress: null,
    ...overrides,
  };
}

describe('classifyViewingPriority', () => {
  it('puts an unfinished item with playback state in continue-watching', () => {
    expect(classifyViewingPriority(item({ lastWatchedAt: daysAgo(2), progress: 0.21 }), NOW).bucket)
      .toBe('continue-watching');
  });

  it('treats a progress row at 0 % as continue-watching rather than new', () => {
    expect(classifyViewingPriority(item({ lastWatchedAt: daysAgo(1), progress: 0 }), NOW).bucket)
      .toBe('continue-watching');
  });

  it('puts a finished item watched inside the 14-day window in recently-watched', () => {
    expect(classifyViewingPriority(item({ lastWatchedAt: daysAgo(3), isWatched: true, progress: 1 }), NOW).bucket)
      .toBe('recently-watched');
  });

  it('treats exactly the window boundary as recently-watched', () => {
    expect(classifyViewingPriority(item({ lastWatchedAt: daysAgo(14), isWatched: true, progress: 1 }), NOW).bucket)
      .toBe('recently-watched');
  });

  it('demotes a finished item watched long ago to recently-added when it was added recently', () => {
    expect(classifyViewingPriority(
      item({ lastWatchedAt: daysAgo(40), isWatched: true, progress: 1, addedAt: daysAgo(5) }),
      NOW,
    ).bucket).toBe('recently-added');
  });

  it('puts an unplayed item added inside 30 days in recently-added', () => {
    expect(classifyViewingPriority(item({ addedAt: daysAgo(5) }), NOW).bucket).toBe('recently-added');
  });

  it('puts an unplayed item added long ago in backfill', () => {
    expect(classifyViewingPriority(item({ addedAt: daysAgo(31) }), NOW).bucket).toBe('backfill');
  });

  it('ranks the buckets in the documented order', () => {
    const ranks = [
      classifyViewingPriority(item({ lastWatchedAt: daysAgo(1), progress: 0.5 }), NOW),
      classifyViewingPriority(item({ lastWatchedAt: daysAgo(1), isWatched: true, progress: 1 }), NOW),
      classifyViewingPriority(item({ addedAt: daysAgo(1) }), NOW),
      classifyViewingPriority(item({ addedAt: daysAgo(100) }), NOW),
    ].map((priority) => priority.rank);
    expect(ranks).toEqual([0, 1, 2, 3]);
  });
});

describe('isHighPriority', () => {
  it('counts continue-watching and recently-watched only', () => {
    expect(isHighPriority('continue-watching')).toBe(true);
    expect(isHighPriority('recently-watched')).toBe(true);
    expect(isHighPriority('recently-added')).toBe(false);
    expect(isHighPriority('backfill')).toBe(false);
  });
});

describe('rankByViewingPriority', () => {
  it('sorts buckets first, then most recent activity', () => {
    const ranked = rankByViewingPriority([
      item({ id: 1, addedAt: daysAgo(90) }),
      item({ id: 2, addedAt: daysAgo(1) }),
      item({ id: 3, lastWatchedAt: daysAgo(5), progress: 0.4 }),
      item({ id: 4, lastWatchedAt: daysAgo(1), progress: 0.6 }),
      item({ id: 5, lastWatchedAt: daysAgo(2), isWatched: true, progress: 1 }),
    ], NOW);

    expect(ranked.map((entry) => entry.id)).toEqual([4, 3, 5, 2, 1]);
    expect(ranked.map((entry) => entry.priority.bucket)).toEqual([
      'continue-watching',
      'continue-watching',
      'recently-watched',
      'recently-added',
      'backfill',
    ]);
  });

  it('is stable for identical items: movie before episode, then id', () => {
    const ranked = rankByViewingPriority([
      item({ id: 9, kind: 'episode', addedAt: daysAgo(100) }),
      item({ id: 2, kind: 'movie', addedAt: daysAgo(100) }),
      item({ id: 3, kind: 'movie', addedAt: daysAgo(100) }),
    ], NOW);
    expect(ranked.map((entry) => `${entry.kind}:${entry.id}`)).toEqual(['movie:2', 'movie:3', 'episode:9']);
  });

  it('returns the same order when called twice with the same input', () => {
    const input = [
      item({ id: 7, lastWatchedAt: daysAgo(2), progress: 0.3 }),
      item({ id: 8, lastWatchedAt: daysAgo(2), progress: 0.3 }),
      item({ id: 1, addedAt: daysAgo(3) }),
    ];
    const first = rankByViewingPriority(input, NOW).map((entry) => entry.id);
    const second = rankByViewingPriority(input, NOW).map((entry) => entry.id);
    expect(second).toEqual(first);
  });
});

describe('compareViewingPriority', () => {
  it('orders by rank, then recency, then identity', () => {
    const a = { ...item({ id: 1 }), priority: { bucket: 'recently-added' as const, rank: 2, recency: 10 } };
    const b = { ...item({ id: 2 }), priority: { bucket: 'backfill' as const, rank: 3, recency: 99 } };
    expect(compareViewingPriority(a, b)).toBeLessThan(0);
    expect(compareViewingPriority(b, a)).toBeGreaterThan(0);
  });
});
