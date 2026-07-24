import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaRepository } from './MediaRepository';
import * as schema from '../db/schema';
import type { SeriesDetails } from '../services/MetadataProvider';

type InsertBuilder = {
  values: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
};

function makeInsertBuilder(rows: any[] = []): InsertBuilder {
  const builder: any = {};
  builder.values = vi.fn().mockReturnValue(builder);
  builder.onConflictDoUpdate = vi.fn().mockReturnValue(builder);
  builder.returning = vi.fn().mockReturnValue(builder);
  builder.get = vi.fn().mockReturnValue(rows[0]);
  builder.run = vi.fn().mockReturnValue({ changes: 1 });
  return builder as InsertBuilder;
}

interface MockConfig {
  seasonReturnValues?: any[];
  /** Per-call return values for season inserts. If set, each call pulls the next value. */
  seasonReturnByCall?: any[][];
  episodeReturnValues?: any[];
  episodeReturnByCall?: any[][];
}

function makeDb(config: MockConfig = {}) {
  const seasonCalls: any[] = [];
  const episodeCalls: any[] = [];
  const seasonBuilders: InsertBuilder[] = [];
  const episodeBuilders: InsertBuilder[] = [];

  const seasonReturnByCall = config.seasonReturnByCall
    ?? (config.seasonReturnValues ? config.seasonReturnValues.map((v) => [v]) : undefined);
  const episodeReturnByCall = config.episodeReturnByCall
    ?? (config.episodeReturnValues ? config.episodeReturnValues.map((v) => [v]) : undefined);

  const tx: any = {
    insert: vi.fn().mockImplementation((table: any) => {
      if (table === schema.seasons) {
        const builder = makeInsertBuilder(
          seasonReturnByCall?.[seasonCalls.length] ?? [{ id: 10 + seasonCalls.length, seasonNumber: seasonCalls.length + 1 }],
        );
        seasonCalls.push(builder);
        seasonBuilders.push(builder);
        return builder;
      }
      if (table === schema.episodes) {
        const builder = makeInsertBuilder(
          episodeReturnByCall?.[episodeCalls.length] ?? [{ id: 100 + episodeCalls.length }],
        );
        episodeCalls.push(builder);
        episodeBuilders.push(builder);
        return builder;
      }
      throw new Error(`unexpected table in tx mock: ${table}`);
    }),
  };

  return {
    drizzle: {
      transaction: vi.fn().mockImplementation((cb: (tx: any) => unknown) => cb(tx)),
    },
    _tx: tx,
    _seasonBuilders: seasonBuilders,
    _episodeBuilders: episodeBuilders,
  };
}

function getSeasonInsertCall(mock: ReturnType<typeof makeDb>, callIndex = 0) {
  const builder = mock._seasonBuilders[callIndex];
  if (!builder) return undefined;
  return {
    values: builder.values.mock.calls[0]?.[0],
    onConflictDoUpdate: builder.onConflictDoUpdate.mock.calls[0]?.[0],
  };
}

function getEpisodeInsertCall(mock: ReturnType<typeof makeDb>, callIndex = 0) {
  const builder = mock._episodeBuilders[callIndex];
  if (!builder) return undefined;
  return {
    values: builder.values.mock.calls[0]?.[0],
    onConflictDoUpdate: builder.onConflictDoUpdate.mock.calls[0]?.[0],
  };
}

describe('MediaRepository.upsertSeasonsAndEpisodes (native Drizzle)', () => {
  let prisma: ReturnType<typeof makeDb>;
  let repo: MediaRepository;

  beforeEach(() => {
    prisma = makeDb({
      seasonReturnValues: [
        { id: 10, seasonNumber: 1, monitored: true },
        { id: 11, seasonNumber: 2, monitored: true },
      ],
      episodeReturnValues: [{ id: 100 }, { id: 101 }, { id: 102 }],
    });
    repo = new MediaRepository(prisma as any);
  });

  it('upserts seasons and episodes from SeriesDetails', async () => {
    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }, { seasonNumber: 2 }],
        images: [],
      },
      episodes: [
        {
          id: 5001,
          seasonNumber: 1,
          episodeNumber: 1,
          episodeName: 'Pilot',
          firstAired: '2020-01-01',
          overview: 'First episode',
        },
        {
          id: 5002,
          seasonNumber: 1,
          episodeNumber: 2,
          episodeName: 'Episode 2',
          firstAired: '2020-01-08',
          overview: null,
        },
        {
          id: 5003,
          seasonNumber: 2,
          episodeNumber: 1,
          episodeName: 'Season 2 Premiere',
          firstAired: null,
          overview: null,
        },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    // Two seasons should be inserted inside the transaction
    expect(prisma._seasonBuilders).toHaveLength(2);
    const seasonCall0 = getSeasonInsertCall(prisma, 0);
    expect(seasonCall0?.values).toMatchObject({ seriesId: 42, seasonNumber: 1, monitored: true });
    expect(seasonCall0?.onConflictDoUpdate?.target).toEqual([
      schema.seasons.seriesId,
      schema.seasons.seasonNumber,
    ]);

    const seasonCall1 = getSeasonInsertCall(prisma, 1);
    expect(seasonCall1?.values).toMatchObject({ seriesId: 42, seasonNumber: 2, monitored: true });

    // Three episodes should be inserted
    expect(prisma._episodeBuilders).toHaveLength(3);
    const episodeCall0 = getEpisodeInsertCall(prisma, 0);
    expect(episodeCall0?.values).toMatchObject({
      tvdbId: 5001,
      seriesId: 42,
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'Pilot',
      seasonId: 10,
    });

    const episodeCall2 = getEpisodeInsertCall(prisma, 2);
    expect(episodeCall2?.values).toMatchObject({
      tvdbId: 5003,
      seriesId: 42,
      seasonNumber: 2,
      episodeNumber: 1,
      seasonId: 11,
    });
  });

  it('skips episodes without a tvdbId', async () => {
    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        {
          id: 6001,
          seasonNumber: 1,
          episodeNumber: 1,
          episodeName: 'Valid',
          firstAired: '2020-01-01',
          overview: null,
        },
        {
          // No id, no tvdbId
          seasonNumber: 1,
          episodeNumber: 2,
          episodeName: 'No tvdbId',
          firstAired: null,
          overview: null,
        },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma._seasonBuilders).toHaveLength(1);
    expect(prisma._episodeBuilders).toHaveLength(1);
    const ep = getEpisodeInsertCall(prisma, 0);
    expect(ep?.values.tvdbId).toBe(6001);
  });

  it('returns early when no episodes are provided', async () => {
    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Empty',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.drizzle.transaction).not.toHaveBeenCalled();
  });

  it('derives seasons from episodes when series.seasons is empty', async () => {
    prisma = makeDb({
      seasonReturnValues: [
        { id: 10, seasonNumber: 1, monitored: true },
        { id: 11, seasonNumber: 2, monitored: true },
      ],
      episodeReturnValues: [{ id: 100 }, { id: 101 }],
    });
    repo = new MediaRepository(prisma as any);

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'NoSeasons',
        status: 'continuing',
        seasons: [],
        images: [],
      },
      episodes: [
        { id: 7001, seasonNumber: 1, episodeNumber: 1, episodeName: 'S1E1', firstAired: null, overview: null },
        { id: 7002, seasonNumber: 2, episodeNumber: 1, episodeName: 'S2E1', firstAired: null, overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma._seasonBuilders).toHaveLength(2);
    const s0 = getSeasonInsertCall(prisma, 0);
    const s1 = getSeasonInsertCall(prisma, 1);
    expect(s0?.values.seasonNumber).toBe(1);
    expect(s1?.values.seasonNumber).toBe(2);
  });

  it('prefers ep.tvdbId over ep.id when both are present', async () => {
    prisma = makeDb({
      seasonReturnValues: [{ id: 10, seasonNumber: 1, monitored: true }],
      episodeReturnValues: [{ id: 100 }],
    });
    repo = new MediaRepository(prisma as any);

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Both',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        {
          id: 5001,
          tvdbId: 9999999,
          seasonNumber: 1,
          episodeNumber: 1,
          episodeName: 'Both',
          firstAired: null,
          overview: null,
        },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    const ep = getEpisodeInsertCall(prisma, 0);
    expect(ep?.values.tvdbId).toBe(9999999);
  });

  it('uses airDate field when firstAired is absent', async () => {
    prisma = makeDb({
      seasonReturnValues: [{ id: 10, seasonNumber: 1, monitored: true }],
      episodeReturnValues: [{ id: 100 }],
    });
    repo = new MediaRepository(prisma as any);

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'AirDate',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        {
          id: 8001,
          seasonNumber: 1,
          episodeNumber: 1,
          episodeName: 'Air',
          airDate: '2021-05-05',
          firstAired: undefined,
          overview: null,
        },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    const ep = getEpisodeInsertCall(prisma, 0);
    expect(ep?.values.airDateUtc).toEqual(new Date('2021-05-05'));
  });

  it('skips non-finite seasonNumber in episodes when deriving seasons', async () => {
    prisma = makeDb({
      seasonReturnValues: [{ id: 10, seasonNumber: 1, monitored: true }],
      episodeReturnValues: [{ id: 100 }],
    });
    repo = new MediaRepository(prisma as any);

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Bad',
        status: 'continuing',
        seasons: [],
        images: [],
      },
      episodes: [
        { id: 9001, seasonNumber: 1, episodeNumber: 1, episodeName: 'OK', firstAired: null, overview: null },
        { id: 9002, seasonNumber: 'NaN-ish', episodeNumber: 1, episodeName: 'Bad', firstAired: null, overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma._seasonBuilders).toHaveLength(1);
    const s0 = getSeasonInsertCall(prisma, 0);
    expect(s0?.values.seasonNumber).toBe(1);
  });

  it('uses null airDate when both fields are absent', async () => {
    prisma = makeDb({
      seasonReturnValues: [{ id: 10, seasonNumber: 1, monitored: true }],
      episodeReturnValues: [{ id: 100 }],
    });
    repo = new MediaRepository(prisma as any);

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'NoDate',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        {
          id: 11001,
          seasonNumber: 1,
          episodeNumber: 1,
          episodeName: 'NoDate',
          firstAired: null,
          airDate: undefined,
          overview: null,
        },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    const ep = getEpisodeInsertCall(prisma, 0);
    expect(ep?.values.airDateUtc).toBeNull();
  });

  it('runs all upserts inside a single transaction', async () => {
    prisma = makeDb({
      seasonReturnValues: [{ id: 10, seasonNumber: 1, monitored: true }],
      episodeReturnValues: [{ id: 100 }],
    });
    repo = new MediaRepository(prisma as any);

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'TX',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        { id: 12001, seasonNumber: 1, episodeNumber: 1, episodeName: 'TX', firstAired: null, overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.drizzle.transaction).toHaveBeenCalledTimes(1);
  });

  it('propagates ep.title when episodeName is missing', async () => {
    prisma = makeDb({
      seasonReturnValues: [{ id: 10, seasonNumber: 1, monitored: true }],
      episodeReturnValues: [{ id: 100 }],
    });
    repo = new MediaRepository(prisma as any);

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'TitleFallback',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        {
          id: 13001,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Fallback Title',
          firstAired: null,
          overview: null,
        },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    const ep = getEpisodeInsertCall(prisma, 0);
    expect(ep?.values.title).toBe('Fallback Title');
  });

  it('defaults title to empty string when both episodeName and title are absent', async () => {
    prisma = makeDb({
      seasonReturnValues: [{ id: 10, seasonNumber: 1, monitored: true }],
      episodeReturnValues: [{ id: 100 }],
    });
    repo = new MediaRepository(prisma as any);

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'EmptyTitle',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        {
          id: 14001,
          seasonNumber: 1,
          episodeNumber: 1,
          firstAired: null,
          overview: null,
        },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    const ep = getEpisodeInsertCall(prisma, 0);
    expect(ep?.values.title).toBe('');
  });

  it('uses seasonId from the previously-built seasonIdMap', async () => {
    prisma = makeDb({
      seasonReturnValues: [
        { id: 100, seasonNumber: 1, monitored: true },
        { id: 200, seasonNumber: 2, monitored: true },
      ],
      episodeReturnValues: [{ id: 1000 }, { id: 1001 }],
    });
    repo = new MediaRepository(prisma as any);

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'MapLookup',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }, { seasonNumber: 2 }],
        images: [],
      },
      episodes: [
        { id: 15001, seasonNumber: 1, episodeNumber: 1, episodeName: 'S1', firstAired: null, overview: null },
        { id: 15002, seasonNumber: 2, episodeNumber: 1, episodeName: 'S2', firstAired: null, overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    const ep0 = getEpisodeInsertCall(prisma, 0);
    const ep1 = getEpisodeInsertCall(prisma, 1);
    expect(ep0?.values.seasonId).toBe(100);
    expect(ep1?.values.seasonId).toBe(200);
  });
});
