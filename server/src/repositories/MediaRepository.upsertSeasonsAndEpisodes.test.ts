import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaRepository } from './MediaRepository';
import type { SeriesDetails } from '../services/MetadataProvider';

function makeDb() {
  return {
    season: {
      upsert: vi.fn(),
    },
    episode: {
      upsert: vi.fn(),
    },
  };
}

describe('MediaRepository.upsertSeasonsAndEpisodes', () => {
  let prisma: ReturnType<typeof makeDb>;
  let repo: MediaRepository;

  beforeEach(() => {
    prisma = makeDb();
    repo = new MediaRepository(prisma as any);
  });

  it('upserts seasons and episodes from SeriesDetails', async () => {
    const season1 = { id: 10, seasonNumber: 1, monitored: true };
    const season2 = { id: 11, seasonNumber: 2, monitored: true };
    prisma.season.upsert
      .mockResolvedValueOnce(season1)
      .mockResolvedValueOnce(season2);
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

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

    // Two seasons should be upserted
    expect(prisma.season.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.season.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { seriesId_seasonNumber: { seriesId: 42, seasonNumber: 1 } },
        create: expect.objectContaining({ seriesId: 42, seasonNumber: 1 }),
        update: expect.objectContaining({}),
      }),
    );
    expect(prisma.season.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { seriesId_seasonNumber: { seriesId: 42, seasonNumber: 2 } },
        create: expect.objectContaining({ seriesId: 42, seasonNumber: 2 }),
        update: expect.objectContaining({}),
      }),
    );

    // Three episodes should be upserted
    expect(prisma.episode.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tvdbId: 5001 },
        create: expect.objectContaining({
          tvdbId: 5001,
          seriesId: 42,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Pilot',
          seasonId: season1.id,
        }),
      }),
    );
    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tvdbId: 5003 },
        create: expect.objectContaining({
          tvdbId: 5003,
          seriesId: 42,
          seasonNumber: 2,
          episodeNumber: 1,
          seasonId: season2.id,
        }),
      }),
    );
  });

  it('skips episodes without a tvdbId', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 10, seasonNumber: 1 });
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [],
        images: [],
      },
      episodes: [
        // missing tvdbId / id field
        {
          id: null,
          seasonNumber: 1,
          episodeNumber: 1,
          episodeName: 'No ID Episode',
          firstAired: null,
          overview: null,
        },
        {
          id: 9001,
          seasonNumber: 1,
          episodeNumber: 2,
          episodeName: 'Valid Episode',
          firstAired: null,
          overview: null,
        },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    // Only one episode upsert should happen (the one with a valid tvdbId)
    expect(prisma.episode.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tvdbId: 9001 } }),
    );
  });

  it('handles empty episodes list gracefully', async () => {
    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Empty Series',
        status: 'ended',
        seasons: [],
        images: [],
      },
      episodes: [],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.season.upsert).not.toHaveBeenCalled();
    expect(prisma.episode.upsert).not.toHaveBeenCalled();
  });

  it('derives seasons from episodes when series.seasons is empty', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 20, seasonNumber: 1 });
    prisma.episode.upsert.mockResolvedValue({ id: 200 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 555,
        title: 'No Seasons Series',
        status: 'continuing',
        seasons: [],  // empty – must derive from episodes
        images: [],
      },
      episodes: [
        {
          id: 7001,
          seasonNumber: 1,
          episodeNumber: 1,
          episodeName: 'Episode One',
          firstAired: null,
          overview: null,
        },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(99, details);

    expect(prisma.season.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.season.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { seriesId_seasonNumber: { seriesId: 99, seasonNumber: 1 } },
      }),
    );
    expect(prisma.episode.upsert).toHaveBeenCalledTimes(1);
  });

  it('skips episodes with non-finite tvdbId (NaN, Infinity)', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 10, seasonNumber: 1 });
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [],
        images: [],
      },
      episodes: [
        { id: NaN, seasonNumber: 1, episodeNumber: 1, episodeName: 'NaN ID', firstAired: null, overview: null },
        { id: Infinity, seasonNumber: 1, episodeNumber: 2, episodeName: 'Inf ID', firstAired: null, overview: null },
        { id: -Infinity, seasonNumber: 1, episodeNumber: 3, episodeName: 'NegInf ID', firstAired: null, overview: null },
        { id: 9001, seasonNumber: 1, episodeNumber: 4, episodeName: 'Valid', firstAired: null, overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.episode.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tvdbId: 9001 } }),
    );
  });

  it('deduplicates season numbers from episodes via Set', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 10, seasonNumber: 1 });
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [],
        images: [],
      },
      episodes: [
        { id: 1001, seasonNumber: 1, episodeNumber: 1, episodeName: 'E1', firstAired: null, overview: null },
        { id: 1002, seasonNumber: 1, episodeNumber: 2, episodeName: 'E2', firstAired: null, overview: null },
        { id: 1003, seasonNumber: 1, episodeNumber: 3, episodeName: 'E3', firstAired: null, overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.season.upsert).toHaveBeenCalledTimes(1);
  });

  it('skips non-finite seasonNumber in seriesSeasons', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 10, seasonNumber: 2 });
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [
          { seasonNumber: NaN },
          { seasonNumber: Infinity },
          { seasonNumber: 2 },
        ],
        images: [],
      },
      episodes: [
        { id: 5001, seasonNumber: 2, episodeNumber: 1, episodeName: 'E1', firstAired: null, overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.season.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.season.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { seriesId_seasonNumber: { seriesId: 42, seasonNumber: 2 } },
      }),
    );
  });

  it('handles episodes with non-finite seasonNumber (seasonId = null)', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 10, seasonNumber: 1 });
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        { id: 6001, seasonNumber: NaN, episodeNumber: 1, episodeName: 'Bad Season', firstAired: null, overview: null },
        { id: 6002, seasonNumber: 99, episodeNumber: 1, episodeName: 'No Matching Season', firstAired: null, overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.episode.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tvdbId: 6001 },
        create: expect.objectContaining({ seasonId: null, seasonNumber: NaN }),
      }),
    );
    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tvdbId: 6002 },
        create: expect.objectContaining({ seasonId: null, seasonNumber: 99 }),
      }),
    );
  });

  it('handles null, empty, and whitespace-only airDate', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 10, seasonNumber: 1 });
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        { id: 7001, seasonNumber: 1, episodeNumber: 1, episodeName: 'Null AirDate', firstAired: null, overview: null },
        { id: 7002, seasonNumber: 1, episodeNumber: 2, episodeName: 'Empty AirDate', firstAired: '', overview: null },
        { id: 7003, seasonNumber: 1, episodeNumber: 3, episodeName: 'Whitespace AirDate', firstAired: '   ', overview: null },
        { id: 7004, seasonNumber: 1, episodeNumber: 4, episodeName: 'Valid AirDate', firstAired: '2020-01-01', overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.episode.upsert).toHaveBeenCalledTimes(4);
    const calls = prisma.episode.upsert.mock.calls;

    const nullAirDate = calls.find((c: any[]) => c[0].where.tvdbId === 7001);
    expect(nullAirDate![0].create.airDateUtc).toBeNull();

    const emptyAirDate = calls.find((c: any[]) => c[0].where.tvdbId === 7002);
    expect(emptyAirDate![0].create.airDateUtc).toBeNull();

    const wsAirDate = calls.find((c: any[]) => c[0].where.tvdbId === 7003);
    expect(wsAirDate![0].create.airDateUtc).toBeNull();

    const validAirDate = calls.find((c: any[]) => c[0].where.tvdbId === 7004);
    expect(validAirDate![0].create.airDateUtc).toBeInstanceOf(Date);
  });

  it('uses tvdbId fallback from ep.id when ep.tvdbId is undefined', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 10, seasonNumber: 1 });
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        { seasonNumber: 1, episodeNumber: 1, episodeName: 'No tvdbId field', firstAired: null, overview: null, id: 8888 },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.episode.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tvdbId: 8888 } }),
    );
  });

  it('prefers ep.tvdbId over ep.id when both are present', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 10, seasonNumber: 1 });
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        { tvdbId: 9999, id: 8888, seasonNumber: 1, episodeNumber: 1, episodeName: 'Both IDs', firstAired: null, overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tvdbId: 9999 } }),
    );
  });

  it('uses airDate field when firstAired is absent', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 10, seasonNumber: 1 });
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        { id: 8001, seasonNumber: 1, episodeNumber: 1, episodeName: 'AirDate Field', airDate: '2021-06-15', overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.episode.upsert).toHaveBeenCalledTimes(1);
    const airDateValue = prisma.episode.upsert.mock.calls[0]![0].create.airDateUtc;
    expect(airDateValue).toBeInstanceOf(Date);
  });

  it('skips non-finite seasonNumber in episodes when deriving seasons', async () => {
    prisma.season.upsert.mockResolvedValue({ id: 10, seasonNumber: 2 });
    prisma.episode.upsert.mockResolvedValue({ id: 100 });

    const details: SeriesDetails = {
      series: {
        tvdbId: 1234,
        title: 'Test Series',
        status: 'continuing',
        seasons: [],
        images: [],
      },
      episodes: [
        { id: 1001, seasonNumber: NaN, episodeNumber: 1, episodeName: 'Bad Season', firstAired: null, overview: null },
        { id: 1002, seasonNumber: 2, episodeNumber: 1, episodeName: 'Good Season', firstAired: null, overview: null },
      ],
    };

    await repo.upsertSeasonsAndEpisodes(42, details);

    expect(prisma.season.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.season.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { seriesId_seasonNumber: { seriesId: 42, seasonNumber: 2 } },
      }),
    );
  });
});
