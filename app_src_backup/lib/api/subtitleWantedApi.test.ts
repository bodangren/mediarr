import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createSubtitleWantedApi, type WantedSeriesEntry, type WantedMovieEntry, type WantedCount } from './subtitleWantedApi';

describe('subtitleWantedApi', () => {
  const mockClient = {
    request: vi.fn(),
    requestPaginated: vi.fn(),
  };

  const api = createSubtitleWantedApi(mockClient as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listWantedSeries', () => {
    it('should fetch paginated wanted series entries', async () => {
      const mockEntries: WantedSeriesEntry[] = [
        {
          seriesId: 1,
          seriesTitle: 'Breaking Bad',
          seasonNumber: 1,
          episodeNumber: 1,
          episodeId: 101,
          episodeTitle: 'Pilot',
          missingLanguages: ['en', 'es'],
          lastSearch: '2024-01-15T10:00:00Z',
        },
        {
          seriesId: 1,
          seriesTitle: 'Breaking Bad',
          seasonNumber: 1,
          episodeNumber: 2,
          episodeId: 102,
          episodeTitle: 'Cat\'s in the Bag...',
          missingLanguages: ['en'],
        },
      ];

      mockClient.requestPaginated.mockResolvedValue({
        items: mockEntries,
        meta: { page: 1, pageSize: 20, totalCount: 2, totalPages: 1 },
      });

      const result = await api.listWantedSeries({ page: 1, pageSize: 20 });

      expect(result.items).toEqual(mockEntries);
      expect(result.meta.totalCount).toBe(2);
      expect(mockClient.requestPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/series',
          query: { page: 1, pageSize: 20 },
        }),
        expect.anything(),
      );
    });

    it('should pass languageCode filter to query params', async () => {
      mockClient.requestPaginated.mockResolvedValue({
        items: [],
        meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
      });

      await api.listWantedSeries({ page: 1, pageSize: 20, languageCode: 'en' });

      expect(mockClient.requestPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/series',
          query: { page: 1, pageSize: 20, languageCode: 'en' },
        }),
        expect.anything(),
      );
    });

    it('should use default pagination when not provided', async () => {
      mockClient.requestPaginated.mockResolvedValue({
        items: [],
        meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
      });

      await api.listWantedSeries();

      expect(mockClient.requestPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/series',
          query: {},
        }),
        expect.anything(),
      );
    });
  });

  describe('listWantedMovies', () => {
    it('should fetch paginated wanted movie entries', async () => {
      const mockEntries: WantedMovieEntry[] = [
        {
          movieId: 1,
          movieTitle: 'Inception',
          year: 2010,
          missingLanguages: ['en', 'fr'],
          lastSearch: '2024-01-15T10:00:00Z',
        },
        {
          movieId: 2,
          movieTitle: 'The Dark Knight',
          year: 2008,
          missingLanguages: ['es'],
        },
      ];

      mockClient.requestPaginated.mockResolvedValue({
        items: mockEntries,
        meta: { page: 1, pageSize: 20, totalCount: 2, totalPages: 1 },
      });

      const result = await api.listWantedMovies({ page: 1, pageSize: 20 });

      expect(result.items).toEqual(mockEntries);
      expect(result.meta.totalCount).toBe(2);
      expect(mockClient.requestPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/movies',
          query: { page: 1, pageSize: 20 },
        }),
        expect.anything(),
      );
    });

    it('should pass languageCode filter to query params', async () => {
      mockClient.requestPaginated.mockResolvedValue({
        items: [],
        meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
      });

      await api.listWantedMovies({ languageCode: 'de' });

      expect(mockClient.requestPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/movies',
          query: { languageCode: 'de' },
        }),
        expect.anything(),
      );
    });
  });

  describe('searchAllSeries', () => {
    it('should trigger search for all wanted series', async () => {
      const mockResult = { triggered: true, count: 5 };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.searchAllSeries();

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/series/search',
          method: 'POST',
        }),
        expect.anything(),
      );
    });
  });

  describe('searchAllMovies', () => {
    it('should trigger search for all wanted movies', async () => {
      const mockResult = { triggered: true, count: 3 };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.searchAllMovies();

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/movies/search',
          method: 'POST',
        }),
        expect.anything(),
      );
    });
  });

  describe('searchSeriesItem', () => {
    it('should trigger search for a specific series episode', async () => {
      const mockResult = { triggered: true, seriesId: 1, languageCode: 'en' };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.searchSeriesItem(1, 'en');

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/series/1/search',
          method: 'POST',
          body: { languageCode: 'en' },
        }),
        expect.anything(),
      );
    });

    it('should handle different series IDs', async () => {
      const mockResult = { triggered: true, seriesId: 42, languageCode: 'es' };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.searchSeriesItem(42, 'es');

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/series/42/search',
          method: 'POST',
          body: { languageCode: 'es' },
        }),
        expect.anything(),
      );
    });
  });

  describe('searchMovieItem', () => {
    it('should trigger search for a specific movie', async () => {
      const mockResult = { triggered: true, movieId: 1, languageCode: 'fr' };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.searchMovieItem(1, 'fr');

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/movies/1/search',
          method: 'POST',
          body: { languageCode: 'fr' },
        }),
        expect.anything(),
      );
    });

    it('should handle different movie IDs', async () => {
      const mockResult = { triggered: true, movieId: 99, languageCode: 'de' };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.searchMovieItem(99, 'de');

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/movies/99/search',
          method: 'POST',
          body: { languageCode: 'de' },
        }),
        expect.anything(),
      );
    });
  });

  describe('getWantedCount', () => {
    it('should fetch wanted count for series and movies', async () => {
      const mockCount: WantedCount = {
        seriesCount: 15,
        moviesCount: 8,
        totalCount: 23,
      };

      mockClient.request.mockResolvedValue(mockCount);

      const result = await api.getWantedCount();

      expect(result).toEqual(mockCount);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/wanted/count',
        }),
        expect.anything(),
      );
    });

    it('should handle zero counts', async () => {
      const mockCount: WantedCount = {
        seriesCount: 0,
        moviesCount: 0,
        totalCount: 0,
      };

      mockClient.request.mockResolvedValue(mockCount);

      const result = await api.getWantedCount();

      expect(result).toEqual(mockCount);
      expect(result.totalCount).toBe(0);
    });
  });
});
