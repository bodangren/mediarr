import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportMatchService } from './ImportMatchService';
import type { MetadataProvider } from './MetadataProvider';
import type { ScannedFolder } from './ExistingLibraryScanner';

describe('ImportMatchService', () => {
  const mockMetadataProvider = {
    searchMedia: vi.fn(),
    findMovieByImdbId: vi.fn(),
    searchSeries: vi.fn(),
    getSeriesDetails: vi.fn(),
    getMovieAvailability: vi.fn(),
  } as unknown as MetadataProvider;

  const service = new ImportMatchService(mockMetadataProvider);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('matchFolder', () => {
    it('returns empty array when no title can be extracted', async () => {
      const folder: ScannedFolder = {
        path: '/test',
        type: 'movie',
        files: [],
      };

      const result = await service.matchFolder(folder);
      expect(result).toEqual([]);
    });

    it('matches movie folder using NFO tmdbId', async () => {
      const folder: ScannedFolder = {
        path: '/test/The Matrix (1999)',
        type: 'movie',
        files: [{ path: '/test/The Matrix (1999)/movie.mkv', size: 1000, extension: '.mkv' }],
        nfoData: { tmdbId: 603, title: 'The Matrix', year: 1999 },
        parsedTitle: 'The Matrix',
        parsedYear: 1999,
      };

      vi.mocked(mockMetadataProvider.searchMedia).mockResolvedValue([]);

      const result = await service.matchFolder(folder);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(603);
      expect(result[0]?.confidence).toBe(1.0);
      expect(result[0]?.matchSource).toBe('nfo');
    });

    it('matches series folder using NFO tvdbId', async () => {
      const folder: ScannedFolder = {
        path: '/test/Breaking Bad',
        type: 'series',
        files: [{ path: '/test/Breaking Bad/S01E01.mkv', size: 1000, extension: '.mkv' }],
        nfoData: { tvdbId: 81189, title: 'Breaking Bad', year: 2008 },
        parsedTitle: 'Breaking Bad',
        parsedYear: 2008,
      };

      vi.mocked(mockMetadataProvider.searchMedia).mockResolvedValue([]);

      const result = await service.matchFolder(folder);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(81189);
      expect(result[0]?.confidence).toBe(1.0);
      expect(result[0]?.matchSource).toBe('nfo');
    });

    it('matches movie folder using NFO imdbId', async () => {
      const folder: ScannedFolder = {
        path: '/test/The Matrix (1999)',
        type: 'movie',
        files: [{ path: '/test/The Matrix (1999)/movie.mkv', size: 1000, extension: '.mkv' }],
        nfoData: { imdbId: 'tt0133093', title: 'The Matrix', year: 1999 },
        parsedTitle: 'The Matrix',
        parsedYear: 1999,
      };

      vi.mocked(mockMetadataProvider.findMovieByImdbId).mockResolvedValue({
        mediaType: 'MOVIE',
        tmdbId: 603,
        imdbId: 'tt0133093',
        title: 'The Matrix',
        year: 1999,
        overview: 'A computer hacker learns about the true nature of his reality.',
        images: [{ coverType: 'poster', url: 'https://image.tmdb.org/t/p/w500/example.jpg' }],
      });
      vi.mocked(mockMetadataProvider.searchMedia).mockResolvedValue([
        { mediaType: 'MOVIE', tmdbId: 604, title: 'The Matrix Reloaded', year: 2003 },
      ]);

      const result = await service.matchFolder(folder);

      expect(mockMetadataProvider.findMovieByImdbId).toHaveBeenCalledWith('tt0133093');
      expect(result[0]?.id).toBe(603);
      expect(result[0]?.matchSource).toBe('nfo');
      expect(result[0]?.confidence).toBe(1.0);
    });

    it('searches for movies when no NFO data', async () => {
      const folder: ScannedFolder = {
        path: '/test/The Matrix (1999)',
        type: 'movie',
        files: [{ path: '/test/The Matrix (1999)/movie.mkv', size: 1000, extension: '.mkv' }],
        parsedTitle: 'The Matrix',
        parsedYear: 1999,
      };

      vi.mocked(mockMetadataProvider.searchMedia).mockResolvedValue([
        { mediaType: 'MOVIE', tmdbId: 603, title: 'The Matrix', year: 1999 },
        { mediaType: 'MOVIE', tmdbId: 604, title: 'The Matrix Reloaded', year: 2003 },
      ]);

      const result = await service.matchFolder(folder);

      expect(mockMetadataProvider.searchMedia).toHaveBeenCalledWith({
        term: 'The Matrix',
        mediaType: 'MOVIE',
      });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.title).toBe('The Matrix');
      expect(result[0]?.confidence).toBeGreaterThan(0.9);
    });

    it('falls back to search when NFO imdbId lookup misses', async () => {
      const folder: ScannedFolder = {
        path: '/test/The Matrix (1999)',
        type: 'movie',
        files: [{ path: '/test/The Matrix (1999)/movie.mkv', size: 1000, extension: '.mkv' }],
        nfoData: { imdbId: 'tt0133093' },
        parsedTitle: 'The Matrix',
        parsedYear: 1999,
      };

      vi.mocked(mockMetadataProvider.findMovieByImdbId).mockResolvedValue(null);
      vi.mocked(mockMetadataProvider.searchMedia).mockResolvedValue([
        { mediaType: 'MOVIE', tmdbId: 603, title: 'The Matrix', year: 1999 },
      ]);

      const result = await service.matchFolder(folder);

      expect(mockMetadataProvider.findMovieByImdbId).toHaveBeenCalledWith('tt0133093');
      expect(mockMetadataProvider.searchMedia).toHaveBeenCalledWith({
        term: 'The Matrix',
        mediaType: 'MOVIE',
      });
      expect(result[0]?.id).toBe(603);
      expect(result[0]?.matchSource).toBe('exact');
    });

    it('falls back to search when NFO imdbId lookup errors', async () => {
      const folder: ScannedFolder = {
        path: '/test/The Matrix (1999)',
        type: 'movie',
        files: [{ path: '/test/The Matrix (1999)/movie.mkv', size: 1000, extension: '.mkv' }],
        nfoData: { imdbId: 'tt0133093' },
        parsedTitle: 'The Matrix',
        parsedYear: 1999,
      };

      vi.mocked(mockMetadataProvider.findMovieByImdbId).mockRejectedValue(new Error('TMDB find failed'));
      vi.mocked(mockMetadataProvider.searchMedia).mockResolvedValue([
        { mediaType: 'MOVIE', tmdbId: 603, title: 'The Matrix', year: 1999 },
      ]);

      const result = await service.matchFolder(folder);

      expect(mockMetadataProvider.findMovieByImdbId).toHaveBeenCalledWith('tt0133093');
      expect(mockMetadataProvider.searchMedia).toHaveBeenCalledWith({
        term: 'The Matrix',
        mediaType: 'MOVIE',
      });
      expect(result[0]?.id).toBe(603);
    });

    it('searches for series when no NFO data', async () => {
      const folder: ScannedFolder = {
        path: '/test/Breaking Bad',
        type: 'series',
        files: [{ path: '/test/Breaking Bad/S01E01.mkv', size: 1000, extension: '.mkv' }],
        parsedTitle: 'Breaking Bad',
        parsedYear: 2008,
      };

      vi.mocked(mockMetadataProvider.searchMedia).mockResolvedValue([
        { mediaType: 'TV', tvdbId: 81189, title: 'Breaking Bad', year: 2008 },
      ]);

      const result = await service.matchFolder(folder);

      expect(mockMetadataProvider.searchMedia).toHaveBeenCalledWith({
        term: 'Breaking Bad',
        mediaType: 'TV',
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(81189);
    });

    it('returns max 5 candidates', async () => {
      const folder: ScannedFolder = {
        path: '/test/Movie',
        type: 'movie',
        files: [{ path: '/test/Movie/movie.mkv', size: 1000, extension: '.mkv' }],
        parsedTitle: 'Matrix',
      };

      vi.mocked(mockMetadataProvider.searchMedia).mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          mediaType: 'MOVIE',
          tmdbId: 100 + i,
          title: `Matrix ${i}`,
          year: 1999 + i,
        }))
      );

      const result = await service.matchFolder(folder);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('boosts confidence when year matches', async () => {
      const folder: ScannedFolder = {
        path: '/test/Transformers (2007)',
        type: 'movie',
        files: [{ path: '/test/Transformers (2007)/movie.mkv', size: 1000, extension: '.mkv' }],
        parsedTitle: 'Transformers',
        parsedYear: 2007,
      };

      vi.mocked(mockMetadataProvider.searchMedia).mockResolvedValue([
        { mediaType: 'MOVIE', tmdbId: 603, title: 'Transformers', year: 2007 },
        { mediaType: 'MOVIE', tmdbId: 604, title: 'Transformers: Dark of the Moon', year: 2011 },
      ]);

      const result = await service.matchFolder(folder);

      const match2007 = result.find((r) => r.year === 2007);
      const match2011 = result.find((r) => r.year === 2011);

      expect(match2007?.confidence).toBeGreaterThan(match2011?.confidence ?? 0);
    });

    it('handles search errors gracefully', async () => {
      const folder: ScannedFolder = {
        path: '/test/Movie',
        type: 'movie',
        files: [{ path: '/test/Movie/movie.mkv', size: 1000, extension: '.mkv' }],
        parsedTitle: 'Test Movie',
      };

      vi.mocked(mockMetadataProvider.searchMedia).mockRejectedValue(new Error('API error'));

      const result = await service.matchFolder(folder);

      expect(result).toEqual([]);
    });

    it('extracts title from files when folder title not available', async () => {
      const folder: ScannedFolder = {
        path: '/test',
        type: 'series',
        files: [
          { 
            path: '/test/Breaking.Bad.S01E01.mkv', 
            size: 1000, 
            extension: '.mkv',
            parsedInfo: { seriesTitle: 'Breaking Bad', episodeNumbers: [1] },
          },
        ],
      };

      vi.mocked(mockMetadataProvider.searchMedia).mockResolvedValue([
        { mediaType: 'TV', tvdbId: 81189, title: 'Breaking Bad', year: 2008 },
      ]);

      const result = await service.matchFolder(folder);

      expect(mockMetadataProvider.searchMedia).toHaveBeenCalledWith({
        term: 'Breaking Bad',
        mediaType: 'TV',
      });
    });
  });
});
