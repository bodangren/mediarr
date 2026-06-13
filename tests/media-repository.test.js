import { describe, it, expect, vi } from 'vitest';
import { MediaRepository } from '../server/src/repositories/MediaRepository';

describe('MediaRepository', () => {
  function createMocks() {
    const drizzleReturning = vi.fn();
    const drizzle = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: drizzleReturning,
          }),
        }),
      }),
    };
    const prisma = {
      drizzle,
      media: {
        upsert: vi.fn(),
      },
      movie: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      series: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    const repository = new MediaRepository(prisma);
    return { prisma, repository, drizzleReturning };
  }

  it('should upsert a movie and keep media record in sync', async () => {
    const { prisma, repository, drizzleReturning } = createMocks();

    drizzleReturning
      .mockResolvedValueOnce([{ id: 1 }]) // media upsert
      .mockResolvedValueOnce([{ id: 10, tmdbId: 13, title: 'Forrest Gump' }]); // movie upsert

    const movie = await repository.upsertMovie({
      tmdbId: 13,
      title: 'Forrest Gump',
      cleanTitle: 'forrestgump',
      sortTitle: 'forrest gump',
      status: 'released',
      monitored: true,
      year: 1994,
      qualityProfileId: 1,
    });

    expect(movie.tmdbId).toBe(13);
    expect(prisma.drizzle.insert).toHaveBeenCalledTimes(2);
  });

  it('should find a movie by tmdbId', async () => {
    const { prisma, repository } = createMocks();
    const mockMovie = { id: 10, tmdbId: 13, title: 'Forrest Gump', media: { mediaType: 'MOVIE', title: 'Forrest Gump' } };
    prisma.movie.findUnique.mockResolvedValue(mockMovie);

    const loaded = await repository.findMovieByTmdbId(13);
    expect(loaded).toEqual(mockMovie);
    expect(prisma.movie.findUnique).toHaveBeenCalledWith({
      where: { tmdbId: 13 },
      include: { media: true }
    });
  });

  it('should upsert a series and find it by tvdbId', async () => {
    const { prisma, repository, drizzleReturning } = createMocks();

    drizzleReturning
      .mockResolvedValueOnce([{ id: 2 }]) // media upsert
      .mockResolvedValueOnce([{ id: 20, tvdbId: 355567, title: 'The Boys' }]); // series upsert

    const mockSeries = { id: 20, tvdbId: 355567, title: 'The Boys', media: { mediaType: 'TV', tvdbId: 355567 } };
    prisma.series.findUnique.mockResolvedValue(mockSeries);

    await repository.upsertSeries({
      tvdbId: 355567,
      title: 'The Boys',
      cleanTitle: 'theboys',
      sortTitle: 'boys',
      status: 'continuing',
      monitored: true,
      year: 2019,
      qualityProfileId: 1,
    });

    const loaded = await repository.findSeriesByTvdbId(355567);

    expect(prisma.drizzle.insert).toHaveBeenCalledTimes(2);
    expect(loaded).toEqual(mockSeries);
    expect(prisma.series.findUnique).toHaveBeenCalledWith({
      where: { tvdbId: 355567 },
      include: { media: true }
    });
  });
});
