import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkImportService } from './BulkImportService';
import { Organizer } from './Organizer';

describe('BulkImportService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('stores movie path as folderPath when renameFiles is false', async () => {
    const prisma = {
      movie: {
        upsert: vi.fn().mockResolvedValue({
          id: 1,
          title: 'The Matrix',
          year: 1999,
        }),
      },
      mediaFileVariant: {
        upsert: vi.fn().mockResolvedValue({ id: 10 }),
      },
    } as any;

    const metadataProvider = {
      getMediaDetails: vi.fn().mockResolvedValue({
        mediaType: 'MOVIE',
        tmdbId: 603,
        imdbId: 'tt0133093',
        title: 'The Matrix',
        year: 1999,
        images: [],
      }),
      getSeriesDetails: vi.fn(),
    } as any;

    const organizeMovieSpy = vi
      .spyOn(Organizer.prototype, 'organizeMovieFile')
      .mockResolvedValue('/media/movies/The Matrix (1999)/The Matrix (1999).mkv');

    const service = new BulkImportService(prisma, metadataProvider);

    await service.executeImport([
      {
        folderPath: '/existing/movies/The Matrix (1999)',
        mediaType: 'movie',
        matchId: 603,
        files: [
          {
            path: '/existing/movies/The Matrix (1999)/The.Matrix.1999.mkv',
            size: 1024,
            extension: '.mkv',
          },
        ],
        renameFiles: false,
        rootFolderPath: '/media/movies',
        qualityProfileId: 1,
      },
    ]);

    expect(prisma.movie.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          path: '/existing/movies/The Matrix (1999)',
        }),
      }),
    );
    expect(organizeMovieSpy).not.toHaveBeenCalled();
  });

  it('stores series path as folderPath when renameFiles is false', async () => {
    const prisma = {
      series: {
        upsert: vi.fn().mockResolvedValue({
          id: 2,
          title: 'Breaking Bad',
        }),
      },
      mediaFileVariant: {
        upsert: vi.fn().mockResolvedValue({ id: 20 }),
      },
      season: {
        create: vi.fn(),
      },
      episode: {
        create: vi.fn(),
      },
    } as any;

    const metadataProvider = {
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn().mockResolvedValue({
        series: {
          tvdbId: 81189,
          title: 'Breaking Bad',
          status: 'ended',
          overview: 'Overview',
          year: 2008,
          network: 'AMC',
          images: [],
        },
        episodes: [],
      }),
    } as any;

    const organizeEpisodeSpy = vi
      .spyOn(Organizer.prototype, 'organizeFile')
      .mockResolvedValue('/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01 - Pilot.mkv');

    const service = new BulkImportService(prisma, metadataProvider);

    await service.executeImport([
      {
        folderPath: '/existing/tv/Breaking Bad',
        mediaType: 'series',
        matchId: 81189,
        files: [],
        renameFiles: false,
        rootFolderPath: '/media/tv',
        qualityProfileId: 2,
      },
    ]);

    expect(prisma.series.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          path: '/existing/tv/Breaking Bad',
        }),
      }),
    );
    expect(organizeEpisodeSpy).not.toHaveBeenCalled();
  });
});
