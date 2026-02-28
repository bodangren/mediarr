import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaRepository } from './MediaRepository';
import type { SeriesDetails } from '../services/MetadataProvider';

function makePrisma() {
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
  let prisma: ReturnType<typeof makePrisma>;
  let repo: MediaRepository;

  beforeEach(() => {
    prisma = makePrisma();
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
});
