import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackRepository } from './PlaybackRepository';
import * as schema from '../db/schema';

type SelectCallConfig = {
  fromRows?: any[][];
  whereRows?: any[][];
};

function makeSelectBuilder(rows: any[] = []): any {
  const builder: any = {
    then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
  };
  builder.from = vi.fn().mockReturnValue(builder);
  builder.where = vi.fn().mockReturnValue(builder);
  builder.orderBy = vi.fn().mockReturnValue(builder);
  builder.limit = vi.fn().mockReturnValue(builder);
  builder.leftJoin = vi.fn().mockReturnValue(builder);
  return builder;
}

function makeInsertBuilder(returningRows: any[] = []): any {
  const builder: any = {};
  builder.values = vi.fn().mockReturnValue(builder);
  builder.onConflictDoUpdate = vi.fn().mockReturnValue(builder);
  builder.returning = vi.fn().mockResolvedValue(returningRows);
  return builder;
}

function makeDb(config: { playbackSelectRows?: any[][]; insertRows?: any[] } = {}) {
  const playbackSelectIndex = { i: 0 };
  const playbackSelectRows = config.playbackSelectRows ?? [];
  return {
    drizzle: {
      select: vi.fn().mockImplementation(() => {
        const rows = playbackSelectRows[playbackSelectIndex.i] ?? [];
        playbackSelectIndex.i += 1;
        return makeSelectBuilder(rows);
      }),
      insert: vi.fn().mockImplementation((table: any) => {
        if (table !== schema.playbackProgress) throw new Error('unexpected insert table');
        return makeInsertBuilder(config.insertRows ?? [{ id: 1, position: 0 }]);
      }),
    },
  };
}

describe('PlaybackRepository.getProgress', () => {
  it('returns the first matching playback row', async () => {
    const db = makeDb({ playbackSelectRows: [[{ id: 10, position: 50 }]] });
    const repo = new PlaybackRepository(db as any);
    const result = await repo.getProgress({ mediaType: 'MOVIE', mediaId: 33, userId: 'living-room' });
    expect(result).toEqual({ id: 10, position: 50 });
  });

  it('returns null when no rows match', async () => {
    const db = makeDb({ playbackSelectRows: [[]] });
    const repo = new PlaybackRepository(db as any);
    const result = await repo.getProgress({ mediaType: 'MOVIE', mediaId: 1, userId: 'u' });
    expect(result).toBeNull();
  });
});

describe('PlaybackRepository.getLatestProgressForMedia', () => {
  it('returns the most recent row by lastWatched', async () => {
    const db = makeDb({ playbackSelectRows: [[{ id: 7, lastWatched: new Date() }]] });
    const repo = new PlaybackRepository(db as any);
    const result = await repo.getLatestProgressForMedia('EPISODE', 88);
    expect(result).toEqual({ id: 7, lastWatched: expect.any(Date) });
  });

  it('returns null when no rows match', async () => {
    const db = makeDb({ playbackSelectRows: [[]] });
    const repo = new PlaybackRepository(db as any);
    const result = await repo.getLatestProgressForMedia('MOVIE', 1);
    expect(result).toBeNull();
  });
});

describe('PlaybackRepository.upsertProgress', () => {
  let db: ReturnType<typeof makeDb>;
  let repo: PlaybackRepository;

  beforeEach(() => {
    db = makeDb({ playbackSelectRows: [[null]] });
    repo = new PlaybackRepository(db as any);
  });

  it('marks watched when progress >= threshold', async () => {
    await repo.upsertProgress({
      mediaType: 'MOVIE',
      mediaId: 101,
      userId: 'lan-default',
      position: 5400,
      duration: 6000,
      watchedThreshold: 0.9,
    });
    const insert = db.drizzle.insert.mock.results[0].value;
    expect(insert.onConflictDoUpdate).toHaveBeenCalled();
    const conflictArg = insert.onConflictDoUpdate.mock.calls[0][0];
    expect(conflictArg.set.isWatched).toBe(true);
    expect(conflictArg.set.progress).toBeCloseTo(0.9, 5);
  });

  it('keeps isWatched sticky when previously watched', async () => {
    db = makeDb({ playbackSelectRows: [[{ id: 99, isWatched: true }]] });
    repo = new PlaybackRepository(db as any);
    await repo.upsertProgress({
      mediaType: 'EPISODE',
      mediaId: 404,
      userId: 'bedroom-tv',
      position: 30,
      duration: 1800,
    });
    const insert = db.drizzle.insert.mock.results[0].value;
    const conflictArg = insert.onConflictDoUpdate.mock.calls[0][0];
    expect(conflictArg.set.isWatched).toBe(true);
    expect(conflictArg.set.progress).toBeCloseTo(30 / 1800, 8);
  });

  it('clamps invalid inputs to safe defaults', async () => {
    await repo.upsertProgress({
      mediaType: 'MOVIE',
      mediaId: 7,
      userId: 'phone',
      position: Number.NaN,
      duration: -100,
      watchedThreshold: 5,
    });
    const insert = db.drizzle.insert.mock.results[0].value;
    const conflictArg = insert.onConflictDoUpdate.mock.calls[0][0];
    expect(conflictArg.set.position).toBe(0);
    expect(conflictArg.set.duration).toBe(0);
    expect(conflictArg.set.progress).toBe(0);
    expect(conflictArg.set.isWatched).toBe(false);
  });
});

describe('PlaybackRepository.findContinueWatching', () => {
  it('returns empty list when no playback rows match', async () => {
    const db = makeDb({ playbackSelectRows: [[]] });
    const repo = new PlaybackRepository(db as any);
    const result = await repo.findContinueWatching();
    expect(result).toEqual([]);
  });

  it('joins movies and returns continue-watching entries', async () => {
    const lastWatched = new Date('2026-04-09T00:00:00.000Z');
    const playbackRows = [
      {
        mediaType: 'MOVIE',
        mediaId: 10,
        position: 300,
        duration: 1200,
        progress: 0.25,
        isWatched: false,
        lastWatched,
      },
    ];
    const movieRows = [
      { id: 10, title: 'Movie A', posterUrl: 'https://example.com/a.jpg' },
    ];
    const db = {
      drizzle: {
        select: vi
          .fn()
          .mockImplementationOnce(() => makeSelectBuilder(playbackRows))
          .mockImplementationOnce(() => makeSelectBuilder(movieRows))
          .mockImplementationOnce(() => makeSelectBuilder([])),
      },
    };
    const repo = new PlaybackRepository(db as any);
    const result = await repo.findContinueWatching(20);
    expect(result).toEqual([
      {
        mediaType: 'MOVIE',
        mediaId: 10,
        seriesId: null,
        title: 'Movie A',
        episodeTitle: null,
        seasonNumber: null,
        episodeNumber: null,
        posterUrl: 'https://example.com/a.jpg',
        backdropUrl: null,
        position: 300,
        duration: 1200,
        progress: 0.25,
        isWatched: false,
        lastWatched,
      },
    ]);
  });

  it('joins episodes with series and returns recency-ordered entries', async () => {
    const episodeLastWatched = new Date('2026-04-09T02:00:00.000Z');
    const movieLastWatched = new Date('2026-04-09T01:00:00.000Z');
    const playbackRows = [
      {
        mediaType: 'EPISODE',
        mediaId: 41,
        position: 600,
        duration: 1800,
        progress: 0.3333,
        isWatched: false,
        lastWatched: episodeLastWatched,
      },
      {
        mediaType: 'MOVIE',
        mediaId: 11,
        position: 420,
        duration: 2400,
        progress: 0.175,
        isWatched: false,
        lastWatched: movieLastWatched,
      },
    ];
    const movieRows = [{ id: 11, title: 'Movie B', posterUrl: null }];
    const episodeRows = [
      {
        id: 41,
        seriesId: 5,
        title: 'Pilot',
        seasonNumber: 1,
        episodeNumber: 1,
        seriesTitle: 'Series A',
        seriesPosterUrl: 'https://example.com/sa.jpg',
      },
    ];
    const db = {
      drizzle: {
        select: vi
          .fn()
          .mockImplementationOnce(() => makeSelectBuilder(playbackRows))
          .mockImplementationOnce(() => makeSelectBuilder(movieRows))
          .mockImplementationOnce(() => makeSelectBuilder(episodeRows)),
      },
    };
    const repo = new PlaybackRepository(db as any);
    const result = await repo.findContinueWatching(20);
    expect(result).toEqual([
      {
        mediaType: 'EPISODE',
        mediaId: 41,
        seriesId: 5,
        title: 'Series A',
        episodeTitle: 'Pilot',
        seasonNumber: 1,
        episodeNumber: 1,
        posterUrl: 'https://example.com/sa.jpg',
        backdropUrl: null,
        position: 600,
        duration: 1800,
        progress: 0.3333,
        isWatched: false,
        lastWatched: episodeLastWatched,
      },
      {
        mediaType: 'MOVIE',
        mediaId: 11,
        seriesId: null,
        title: 'Movie B',
        episodeTitle: null,
        seasonNumber: null,
        episodeNumber: null,
        posterUrl: null,
        backdropUrl: null,
        position: 420,
        duration: 2400,
        progress: 0.175,
        isWatched: false,
        lastWatched: movieLastWatched,
      },
    ]);
  });

  it('skips playback rows that reference unknown media', async () => {
    const playbackRows = [
      {
        mediaType: 'MOVIE',
        mediaId: 999,
        position: 100,
        duration: 1000,
        progress: 0.1,
        isWatched: false,
        lastWatched: new Date(),
      },
    ];
    const db = {
      drizzle: {
        select: vi
          .fn()
          .mockImplementationOnce(() => makeSelectBuilder(playbackRows))
          .mockImplementationOnce(() => makeSelectBuilder([]))
          .mockImplementationOnce(() => makeSelectBuilder([])),
      },
    };
    const repo = new PlaybackRepository(db as any);
    const result = await repo.findContinueWatching();
    expect(result).toEqual([]);
  });
});
