import { describe, it, expect, vi } from 'vitest';
import { MediaRepository } from '../server/src/repositories/MediaRepository';

describe('MediaRepository', () => {
  function createMocks() {
    const prisma = {
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
    return { prisma, repository };
  }

  it('should upsert a movie and keep media record in sync', async () => {
    const { prisma, repository } = createMocks();
    
    prisma.media.upsert.mockResolvedValue({ id: 1 });
    prisma.movie.upsert.mockResolvedValue({ id: 10, tmdbId: 13, title: 'Forrest Gump' });

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
    expect(prisma.media.upsert).toHaveBeenCalled();
    expect(prisma.movie.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tmdbId: 13 }
    }));
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
    const { prisma, repository } = createMocks();
    
    prisma.media.upsert.mockResolvedValue({ id: 2 });
    prisma.series.upsert.mockResolvedValue({ id: 20, tvdbId: 355567, title: 'The Boys' });
    
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
    
    expect(prisma.media.upsert).toHaveBeenCalled();
    expect(prisma.series.upsert).toHaveBeenCalled();
    expect(loaded).toEqual(mockSeries);
    expect(prisma.series.findUnique).toHaveBeenCalledWith({
      where: { tvdbId: 355567 },
      include: { media: true }
    });
  });
});
