import { describe, expect, it, vi } from 'vitest';
import {
  latestProgressByMediaId,
  ViewingPriorityQuery,
  type PrioritySubject,
  type ProgressSnapshot,
} from './ViewingPriorityQuery';

const NOW = new Date('2026-11-08T12:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

function snapshot(overrides: Partial<ProgressSnapshot> & { mediaId: number }): ProgressSnapshot {
  return { progress: 0.4, isWatched: false, lastWatched: daysAgo(1), ...overrides };
}

/** Minimal stand-in for the drizzle chain, recording the ids it was asked for. */
function createFakeDb(rows: Array<Record<string, unknown>> = []) {
  const where = vi.fn(() => Promise.resolve(rows));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { db: { select } as never, select, from, where };
}

function subject(kind: 'movie' | 'episode', id: number, addedDaysAgo = 100): PrioritySubject {
  return { kind, id, addedAt: daysAgo(addedDaysAgo) };
}

describe('latestProgressByMediaId', () => {
  it('keeps the most recently watched row per media id', () => {
    const map = latestProgressByMediaId([
      snapshot({ mediaId: 1, lastWatched: daysAgo(5), progress: 0.2 }),
      snapshot({ mediaId: 1, lastWatched: daysAgo(1), progress: 0.8 }),
      snapshot({ mediaId: 2, lastWatched: null }),
    ]);
    expect(map.get(1)?.progress).toBe(0.8);
    expect(map.get(2)?.lastWatched).toBeNull();
  });
});

describe('ViewingPriorityQuery', () => {
  it('performs no query when there are no ids', async () => {
    const fake = createFakeDb();
    const query = new ViewingPriorityQuery(fake.db);
    await expect(query.loadProgress('movie', [])).resolves.toEqual(new Map());
    expect(fake.select).not.toHaveBeenCalled();
  });

  it('queries once per media type and normalises sqlite values', async () => {
    const fake = createFakeDb([
      { mediaId: 7, progress: 0.5, isWatched: 0, lastWatched: daysAgo(2) },
      { mediaId: 8, progress: 1, isWatched: 1, lastWatched: 1_700_000_000 },
    ]);
    const query = new ViewingPriorityQuery(fake.db);

    const progress = await query.loadProgress('episode', [7, 7, 8]);

    expect(fake.select).toHaveBeenCalledTimes(1);
    expect(progress.get(7)?.isWatched).toBe(false);
    expect(progress.get(8)?.isWatched).toBe(true);
    expect(progress.get(8)?.lastWatched?.getTime()).toBe(1_700_000_000_000);
  });

  it('ranks movie and episode subjects together in priority order', async () => {
    const rows = [
      { mediaId: 1, progress: 0.3, isWatched: 0, lastWatched: daysAgo(1) }, // continue-watching
      { mediaId: 2, progress: 1, isWatched: 1, lastWatched: daysAgo(2) },   // recently watched
    ];
    const fake = createFakeDb(rows);
    const query = new ViewingPriorityQuery(fake.db);

    const ranked = await query.rank(
      [subject('movie', 1), subject('episode', 2), subject('movie', 3, 5)],
      NOW,
    );

    expect(ranked.map((entry) => `${entry.kind}:${entry.id}`)).toEqual([
      'movie:1',
      'episode:2',
      'movie:3',
    ]);
    expect(ranked.map((entry) => entry.priority.bucket)).toEqual([
      'continue-watching',
      'recently-watched',
      'recently-added',
    ]);
  });

  it('still classifies subjects that have no progress rows', async () => {
    const fake = createFakeDb([]);
    const query = new ViewingPriorityQuery(fake.db);
    const ranked = await query.rank([subject('movie', 42, 3), subject('movie', 43, 300)], NOW);
    expect(ranked.map((entry) => entry.priority.bucket)).toEqual(['recently-added', 'backfill']);
  });

  it('issues one query per media type, not per item', async () => {
    const fake = createFakeDb([]);
    const query = new ViewingPriorityQuery(fake.db);
    const subjects = Array.from({ length: 25 }, (_, index) => subject('episode', index + 1));
    await query.rank([...subjects, subject('movie', 1)], NOW);
    expect(fake.select).toHaveBeenCalledTimes(2);
  });
});
