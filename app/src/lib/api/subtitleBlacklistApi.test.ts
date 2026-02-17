import { describe, expect, it, vi } from 'vitest';
import { ApiHttpClient } from './httpClient';
import { createSubtitleBlacklistApi } from './subtitleBlacklistApi';

describe('SubtitleBlacklistApi', () => {
  describe('listBlacklistSeries', () => {
    it('should fetch blacklisted series subtitles with default params', async () => {
      const mockRequestPaginated = vi.fn().mockResolvedValue({
        items: [
          {
            id: 1,
            type: 'series',
            seriesId: 10,
            seriesTitle: 'Breaking Bad',
            episodeId: 101,
            seasonNumber: 1,
            episodeNumber: 1,
            episodeTitle: 'Pilot',
            languageCode: 'en',
            provider: 'opensubtitles',
            reason: 'Corrupted file',
            timestamp: '2026-02-15T10:00:00.000Z',
            subtitlePath: '/subs/breaking.bad.s01e01.en.srt',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      });

      const client = new ApiHttpClient({});
      client.requestPaginated = mockRequestPaginated;
      const api = createSubtitleBlacklistApi(client);

      const result = await api.listBlacklistSeries({});

      expect(mockRequestPaginated).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/blacklist/series',
          query: {},
        },
        expect.any(Object),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('series');
      expect(result.items[0].seriesTitle).toBe('Breaking Bad');
    });

    it('should fetch blacklisted series subtitles with query params', async () => {
      const mockRequestPaginated = vi.fn().mockResolvedValue({
        items: [],
        meta: {
          page: 2,
          pageSize: 10,
          totalItems: 15,
          totalPages: 2,
        },
      });

      const client = new ApiHttpClient({});
      client.requestPaginated = mockRequestPaginated;
      const api = createSubtitleBlacklistApi(client);

      const result = await api.listBlacklistSeries({
        page: 2,
        pageSize: 10,
        provider: 'opensubtitles',
        languageCode: 'en',
      });

      expect(mockRequestPaginated).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/blacklist/series',
          query: {
            page: 2,
            pageSize: 10,
            provider: 'opensubtitles',
            languageCode: 'en',
          },
        },
        expect.any(Object),
      );
      expect(result.meta.page).toBe(2);
      expect(result.meta.pageSize).toBe(10);
    });
  });

  describe('listBlacklistMovies', () => {
    it('should fetch blacklisted movie subtitles with default params', async () => {
      const mockRequestPaginated = vi.fn().mockResolvedValue({
        items: [
          {
            id: 2,
            type: 'movie',
            movieId: 20,
            movieTitle: 'Inception',
            languageCode: 'es',
            provider: 'subscene',
            reason: 'Wrong timing',
            timestamp: '2026-02-14T08:30:00.000Z',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      });

      const client = new ApiHttpClient({});
      client.requestPaginated = mockRequestPaginated;
      const api = createSubtitleBlacklistApi(client);

      const result = await api.listBlacklistMovies({});

      expect(mockRequestPaginated).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/blacklist/movies',
          query: {},
        },
        expect.any(Object),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('movie');
      expect(result.items[0].movieTitle).toBe('Inception');
    });

    it('should fetch blacklisted movie subtitles with query params', async () => {
      const mockRequestPaginated = vi.fn().mockResolvedValue({
        items: [],
        meta: {
          page: 1,
          pageSize: 50,
          totalItems: 0,
          totalPages: 0,
        },
      });

      const client = new ApiHttpClient({});
      client.requestPaginated = mockRequestPaginated;
      const api = createSubtitleBlacklistApi(client);

      await api.listBlacklistMovies({
        page: 1,
        pageSize: 50,
        provider: 'subscene',
      });

      expect(mockRequestPaginated).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/blacklist/movies',
          query: {
            page: 1,
            pageSize: 50,
            provider: 'subscene',
          },
        },
        expect.any(Object),
      );
    });
  });

  describe('removeFromBlacklist', () => {
    it('should remove a single item from blacklist', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        deletedCount: 1,
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createSubtitleBlacklistApi(client);

      const result = await api.removeFromBlacklist(42);

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/blacklist/42',
          method: 'DELETE',
        },
        expect.any(Object),
      );
      expect(result.deletedCount).toBe(1);
    });

    it('should return zero when item does not exist', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        deletedCount: 0,
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createSubtitleBlacklistApi(client);

      const result = await api.removeFromBlacklist(999);

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/blacklist/999',
          method: 'DELETE',
        },
        expect.any(Object),
      );
      expect(result.deletedCount).toBe(0);
    });
  });

  describe('clearBlacklistSeries', () => {
    it('should clear all series blacklisted items', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        deletedCount: 15,
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createSubtitleBlacklistApi(client);

      const result = await api.clearBlacklistSeries();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/blacklist/series',
          method: 'DELETE',
        },
        expect.any(Object),
      );
      expect(result.deletedCount).toBe(15);
    });

    it('should return zero when no items to clear', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        deletedCount: 0,
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createSubtitleBlacklistApi(client);

      const result = await api.clearBlacklistSeries();

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('clearBlacklistMovies', () => {
    it('should clear all movie blacklisted items', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        deletedCount: 8,
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createSubtitleBlacklistApi(client);

      const result = await api.clearBlacklistMovies();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/subtitles/blacklist/movies',
          method: 'DELETE',
        },
        expect.any(Object),
      );
      expect(result.deletedCount).toBe(8);
    });

    it('should return zero when no items to clear', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        deletedCount: 0,
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createSubtitleBlacklistApi(client);

      const result = await api.clearBlacklistMovies();

      expect(result.deletedCount).toBe(0);
    });
  });
});
