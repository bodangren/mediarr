import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkImportService } from './BulkImportService';
import { Organizer } from './Organizer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDrizzle() {
  const returningFn = vi.fn().mockResolvedValue([{ id: 1 }]);
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: returningFn,
        }),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(null),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

function makeMovieDb(existingMovie: object | null = null) {
  return {
    drizzle: makeDrizzle(),
    movie: {
      findFirst: vi.fn().mockResolvedValue(existingMovie),
      findUnique: vi.fn().mockResolvedValue(existingMovie),
      create: vi.fn().mockResolvedValue({ id: 1, title: 'The Matrix', year: 1999 }),
    },
    mediaFileVariant: {
      upsert: vi.fn().mockResolvedValue({ id: 10 }),
    },
  } as any;
}

function makeSeriesPrisma(existingSeries: object | null = null) {
  return {
    drizzle: makeDrizzle(),
    series: {
      findFirst: vi.fn().mockResolvedValue(existingSeries),
      findUnique: vi.fn().mockResolvedValue(existingSeries),
      create: vi.fn().mockResolvedValue({ id: 2, title: 'Breaking Bad' }),
    },
    season: {
      upsert: vi.fn().mockResolvedValue({ id: 10 }),
    },
    episode: {
      upsert: vi.fn().mockResolvedValue({ id: 100 }),
      update: vi.fn().mockResolvedValue({ id: 100 }),
    },
    mediaFileVariant: {
      upsert: vi.fn().mockResolvedValue({ id: 20 }),
    },
  } as any;
}

const baseMovieMeta = {
  mediaType: 'MOVIE',
  tmdbId: 603,
  imdbId: 'tt0133093',
  title: 'The Matrix',
  year: 1999,
  images: [],
};

const baseSeriesMeta = {
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
};

// ---------------------------------------------------------------------------

describe('BulkImportService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Movie: new record ─────────────────────────────────────────────────────

  it('creates a new movie when none exists, storing folderPath when renameFiles is false', async () => {
    const prisma = makeMovieDb(null);
    const metadataProvider = {
      getMediaDetails: vi.fn().mockResolvedValue(baseMovieMeta),
      getSeriesDetails: vi.fn(),
    } as any;

    vi.spyOn(Organizer.prototype, 'organizeMovieFile').mockResolvedValue('');

    const service = new BulkImportService(prisma, metadataProvider);
    await service.executeImport([{
      folderPath: '/existing/movies/The Matrix (1999)',
      mediaType: 'movie',
      matchId: 603,
      files: [{ path: '/existing/movies/The Matrix (1999)/The.Matrix.1999.mkv', size: 1024, extension: '.mkv' }],
      renameFiles: false,
      rootFolderPath: '/media/movies',
      qualityProfileId: 1,
    }]);

    expect(prisma.movie.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ path: '/existing/movies/The Matrix (1999)' }),
      }),
    );
    expect(prisma.movie.findUnique).not.toHaveBeenCalled();
  });

  // ── Movie: already exists by imdbId ──────────────────────────────────────

  it('reuses existing movie record when imdbId already exists (avoids unique constraint error)', async () => {
    const existing = { id: 42, title: 'The Matrix', year: 1999, tmdbId: 603, imdbId: 'tt0133093' };
    const prisma = makeMovieDb(existing);
    const metadataProvider = {
      getMediaDetails: vi.fn().mockResolvedValue(baseMovieMeta),
      getSeriesDetails: vi.fn(),
    } as any;

    const service = new BulkImportService(prisma, metadataProvider);
    const result = await service.executeImport([{
      folderPath: '/media/movies/Matrix (1999)',
      mediaType: 'movie',
      matchId: 603,
      files: [{ path: '/media/movies/Matrix (1999)/Matrix.mkv', size: 2048, extension: '.mkv' }],
      renameFiles: false,
      rootFolderPath: '/media/movies',
      qualityProfileId: 1,
    }]);

    // Should NOT attempt to create — movie already existed
    expect(prisma.movie.create).not.toHaveBeenCalled();
    // Should look up the full record for the existing movie
    expect(prisma.movie.findUnique).toHaveBeenCalledWith({ where: { id: 42 } });
    // File variant should still be registered via drizzle upsert
    expect(prisma.drizzle.insert).toHaveBeenCalled();
    expect(result.imported).toBe(1);
    expect(result.failed).toBe(0);
  });

  // ── Movie: duplicate folders same matchId deduped ─────────────────────────

  it('deduplicates two folders that resolve to the same matchId before importing', async () => {
    const prisma = makeMovieDb(null);
    const metadataProvider = {
      getMediaDetails: vi.fn().mockResolvedValue(baseMovieMeta),
      getSeriesDetails: vi.fn(),
    } as any;

    const service = new BulkImportService(prisma, metadataProvider);
    const result = await service.executeImport([
      {
        folderPath: '/movies/Alien - Romulus (2024)',
        mediaType: 'movie',
        matchId: 945961,
        files: [{ path: '/movies/Alien - Romulus (2024)/Alien.Romulus.mkv', size: 1000, extension: '.mkv' }],
        renameFiles: false,
        rootFolderPath: '/movies',
        qualityProfileId: 1,
      },
      {
        folderPath: '/movies/Alien Romulus (2024)',
        mediaType: 'movie',
        matchId: 945961,
        files: [{ path: '/movies/Alien Romulus (2024)/Alien.Romulus.2160p.mkv', size: 2000, extension: '.mkv' }],
        renameFiles: false,
        rootFolderPath: '/movies',
        qualityProfileId: 1,
      },
    ]);

    // Metadata fetched only once — deduplication merged them
    expect(metadataProvider.getMediaDetails).toHaveBeenCalledTimes(1);
    // Both files registered as variants via drizzle upsert
    expect(prisma.drizzle.insert).toHaveBeenCalledTimes(2);
    expect(result.imported).toBe(1);
    expect(result.failed).toBe(0);
  });

  // ── Movie: renameFiles uses sanitized path ────────────────────────────────

  it('uses organizer and new path when renameFiles is true', async () => {
    const prisma = makeMovieDb(null);
    const metadataProvider = {
      getMediaDetails: vi.fn().mockResolvedValue(baseMovieMeta),
      getSeriesDetails: vi.fn(),
    } as any;

    const organizeMovieSpy = vi
      .spyOn(Organizer.prototype, 'organizeMovieFile')
      .mockResolvedValue('/media/movies/The Matrix (1999)/The Matrix (1999).mkv');

    const service = new BulkImportService(prisma, metadataProvider);
    await service.executeImport([{
      folderPath: '/existing/movies/The Matrix (1999)',
      mediaType: 'movie',
      matchId: 603,
      files: [{ path: '/existing/movies/The Matrix (1999)/The.Matrix.1999.mkv', size: 1024, extension: '.mkv' }],
      renameFiles: true,
      rootFolderPath: '/media/movies',
      qualityProfileId: 1,
    }]);

    expect(organizeMovieSpy).toHaveBeenCalled();
  });

  // ── Series: new record ────────────────────────────────────────────────────

  it('creates a new series when none exists, storing folderPath when renameFiles is false', async () => {
    const prisma = makeSeriesPrisma(null);
    const metadataProvider = {
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn().mockResolvedValue(baseSeriesMeta),
    } as any;

    vi.spyOn(Organizer.prototype, 'organizeFile').mockResolvedValue('');

    const service = new BulkImportService(prisma, metadataProvider);
    await service.executeImport([{
      folderPath: '/existing/tv/Breaking Bad',
      mediaType: 'series',
      matchId: 81189,
      files: [],
      renameFiles: false,
      rootFolderPath: '/media/tv',
      qualityProfileId: 2,
    }]);

    expect(prisma.series.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ path: '/existing/tv/Breaking Bad' }),
      }),
    );
    expect(prisma.series.findUnique).not.toHaveBeenCalled();
  });

  // ── Series: already exists ────────────────────────────────────────────────

  it('reuses existing series record without creating a duplicate', async () => {
    const existing = { id: 7, tvdbId: 81189, title: 'Breaking Bad' };
    const prisma = makeSeriesPrisma(existing);
    const metadataProvider = {
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn().mockResolvedValue(baseSeriesMeta),
    } as any;

    const service = new BulkImportService(prisma, metadataProvider);
    const result = await service.executeImport([{
      folderPath: '/existing/tv/Breaking Bad',
      mediaType: 'series',
      matchId: 81189,
      files: [],
      renameFiles: false,
      rootFolderPath: '/media/tv',
      qualityProfileId: 2,
    }]);

    expect(prisma.series.create).not.toHaveBeenCalled();
    expect(prisma.series.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(result.imported).toBe(1);
    expect(result.failed).toBe(0);
  });

  // ── Series: episode.path set when file matched ───────────────────────────

  it('sets episode.path when a matching file is found so hasFile shows correctly in UI', async () => {
    const prisma = makeSeriesPrisma(null);
    const metadataProvider = {
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn().mockResolvedValue({
        ...baseSeriesMeta,
        episodes: [
          { tvdbId: 1001, seasonNumber: 1, episodeNumber: 1, title: 'Pilot', airDateUtc: null },
        ],
      }),
    } as any;

    const service = new BulkImportService(prisma, metadataProvider);
    await service.executeImport([{
      folderPath: '/tv/Breaking Bad',
      mediaType: 'series',
      matchId: 81189,
      files: [{
        path: '/tv/Breaking Bad/Season 1/Breaking.Bad.S01E01.mkv',
        size: 1000,
        extension: '.mkv',
        parsedInfo: { seasonNumber: 1, episodeNumbers: [1] },
      }],
      renameFiles: false,
      rootFolderPath: '/media/tv',
      qualityProfileId: 1,
    }]);

    expect(prisma.episode.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: { path: '/tv/Breaking Bad/Season 1/Breaking.Bad.S01E01.mkv' },
    });
  });

  it('incrementally indexes a manually imported series episode with the exact file payload', async () => {
    const prisma = makeSeriesPrisma(null);
    const metadataProvider = {
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn().mockResolvedValue({
        ...baseSeriesMeta,
        episodes: [
          { tvdbId: 1001, seasonNumber: 1, episodeNumber: 1, title: 'Pilot', airDateUtc: null },
        ],
      }),
    } as any;
    const indexMovieVariant = vi.fn().mockResolvedValue(undefined);
    const indexEpisodeVariant = vi.fn().mockResolvedValue(undefined);
    const service = new BulkImportService(
      prisma,
      metadataProvider,
      { indexMovieVariant, indexEpisodeVariant },
    );

    await service.executeImport([{
      folderPath: '/tv/Breaking Bad',
      mediaType: 'series',
      matchId: 81189,
      files: [{
        path: '/tv/Breaking Bad/Season 1/Breaking.Bad.S01E01.1080p.mkv',
        size: 4096,
        extension: '.mkv',
        parsedInfo: { seasonNumber: 1, episodeNumbers: [1], quality: '1080p' },
      }],
      renameFiles: false,
      rootFolderPath: '/media/tv',
      qualityProfileId: 1,
    }]);

    expect(indexEpisodeVariant).toHaveBeenCalledWith(100, {
      path: '/tv/Breaking Bad/Season 1/Breaking.Bad.S01E01.1080p.mkv',
      fileSize: 4096,
      quality: '1080p',
    });
  });

  // ── Series: seasons and episodes upserted ────────────────────────────────

  it('upserts seasons and episodes so re-importing does not fail', async () => {
    const prisma = makeSeriesPrisma(null);
    const metadataProvider = {
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn().mockResolvedValue({
        ...baseSeriesMeta,
        episodes: [
          { tvdbId: 1001, seasonNumber: 1, episodeNumber: 1, title: 'Pilot', airDateUtc: null },
          { tvdbId: 1002, seasonNumber: 1, episodeNumber: 2, title: 'Cat\'s in the Bag', airDateUtc: null },
        ],
      }),
    } as any;

    const service = new BulkImportService(prisma, metadataProvider);
    await service.executeImport([{
      folderPath: '/tv/Breaking Bad',
      mediaType: 'series',
      matchId: 81189,
      files: [],
      renameFiles: false,
      rootFolderPath: '/media/tv',
      qualityProfileId: 1,
    }]);

    // Season created once for season 1
    expect(prisma.season.upsert).toHaveBeenCalledTimes(1);
    // Both episodes upserted
    expect(prisma.episode.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tvdbId: 1001 } }),
    );
    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tvdbId: 1002 } }),
    );
  });
});
