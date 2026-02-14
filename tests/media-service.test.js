import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaService } from '../server/src/services/MediaService';

describe('MediaService', () => {
  let service;
  let prisma;
  let metadataProvider;

  beforeEach(() => {
    prisma = {
      media: {
        findMany: vi.fn(),
      },
      series: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      episode: {
        update: vi.fn(),
      },
      movie: {
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    metadataProvider = {
      getMovieAvailability: vi.fn(),
    };

    service = new MediaService(prisma, metadataProvider);
  });

  it('should toggle monitoring for a TV series', async () => {
    prisma.series.update.mockResolvedValue({ id: 1, monitored: false });

    const result = await service.setMonitored(1, false, 'TV');

    expect(prisma.series.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { monitored: false },
    });
    expect(result.monitored).toBe(false);
  });

  it('should toggle monitoring for a movie', async () => {
    prisma.movie.update.mockResolvedValue({ id: 2, monitored: true });

    const result = await service.setMonitored(2, true, 'MOVIE');

    expect(prisma.movie.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { monitored: true },
    });
    expect(result.monitored).toBe(true);
  });

  it('should toggle monitoring for an episode', async () => {
    prisma.episode.update.mockResolvedValue({ id: 3, monitored: true });

    const result = await service.setEpisodeMonitored(3, true);

    expect(prisma.episode.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { monitored: true },
    });
    expect(result.monitored).toBe(true);
  });

  it('should return only released/streaming monitored movies that are missing files', async () => {
    prisma.movie.findMany.mockResolvedValue([
      {
        id: 10,
        title: 'Released Movie',
        monitored: true,
        path: null,
        status: 'released',
        inCinemas: null,
        digitalRelease: new Date('2025-01-01T00:00:00.000Z'),
      },
      {
        id: 11,
        title: 'Cinema Only',
        monitored: true,
        path: null,
        status: 'announced',
        inCinemas: new Date('2030-01-01T00:00:00.000Z'),
        digitalRelease: null,
      },
    ]);

    metadataProvider.getMovieAvailability
      .mockReturnValueOnce('released')
      .mockReturnValueOnce('in_cinemas');

    const candidates = await service.getMovieCandidatesForSearch();

    expect(candidates).toHaveLength(1);
    expect(candidates[0].title).toBe('Released Movie');
    expect(metadataProvider.getMovieAvailability).toHaveBeenCalledTimes(2);
  });
});
