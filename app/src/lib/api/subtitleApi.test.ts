import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createSubtitleApi } from './subtitleApi';

describe('subtitleApi', () => {
  const mockClient = {
    request: vi.fn(),
  };

  const api = createSubtitleApi(mockClient as any);

  beforeEach(() => {
    mockClient.request.mockClear();
  });

  describe('listMovieVariants', () => {
    it('should fetch movie subtitle variants', async () => {
      const mockVariants = [
        { variantId: 1, path: '/movies/movie1/subtitles/en.srt' },
        { variantId: 2, path: '/movies/movie1/subtitles/forced/en.srt' },
      ];

      mockClient.request.mockResolvedValue(mockVariants);

      const result = await api.listMovieVariants(1);

      expect(result).toEqual(mockVariants);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/movie/1/variants',
        }),
        expect.anything(),
      );
    });
  });

  describe('listEpisodeVariants', () => {
    it('should fetch episode subtitle variants', async () => {
      const mockVariants = [
        { variantId: 1, path: '/series/show/season1/ep1/en.srt' },
      ];

      mockClient.request.mockResolvedValue(mockVariants);

      const result = await api.listEpisodeVariants(5);

      expect(result).toEqual(mockVariants);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/episode/5/variants',
        }),
        expect.anything(),
      );
    });
  });

  describe('manualSearch', () => {
    it('should search for subtitles with movieId', async () => {
      const mockCandidates = [
        {
          languageCode: 'en',
          isForced: false,
          isHi: false,
          provider: 'opensubtitles',
          score: 100,
          extension: '.srt',
        },
      ];

      mockClient.request.mockResolvedValue(mockCandidates);

      const result = await api.manualSearch({ movieId: 1 });

      expect(result).toEqual(mockCandidates);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/search',
          method: 'POST',
          body: { movieId: 1 },
        }),
        expect.anything(),
      );
    });

    it('should search for subtitles with episodeId', async () => {
      const mockCandidates = [
        {
          languageCode: 'en',
          isForced: false,
          isHi: true,
          provider: 'subscene',
          score: 85,
        },
      ];

      mockClient.request.mockResolvedValue(mockCandidates);

      const result = await api.manualSearch({ episodeId: 10 });

      expect(result).toEqual(mockCandidates);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/search',
          method: 'POST',
          body: { episodeId: 10 },
        }),
        expect.anything(),
      );
    });
  });

  describe('manualDownload', () => {
    it('should download a subtitle', async () => {
      const input = {
        movieId: 1,
        candidate: {
          languageCode: 'en',
          isForced: false,
          isHi: false,
          provider: 'opensubtitles',
          score: 100,
        },
      };

      const mockResult = { storedPath: '/movies/movie1/subtitles/en.srt' };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.manualDownload(input);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/download',
          method: 'POST',
          body: input,
        }),
        expect.anything(),
      );
    });
  });

  // Series support tests
  describe('listSeriesVariants', () => {
    it('should fetch all subtitle variants for a series', async () => {
      const mockVariants = [
        {
          seriesId: 1,
          seasonNumber: 1,
          episodes: [
            {
              episodeId: 1,
              episodeNumber: 1,
              subtitleTracks: [
                {
                  languageCode: 'en',
                  isForced: false,
                  isHi: false,
                  path: '/series/show/s01e01/en.srt',
                  provider: 'opensubtitles',
                },
              ],
              missingSubtitles: ['fr'],
            },
          ],
        },
        {
          seriesId: 1,
          seasonNumber: 2,
          episodes: [],
        },
      ];

      mockClient.request.mockResolvedValue(mockVariants);

      const result = await api.listSeriesVariants(1);

      expect(result).toEqual(mockVariants);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/series/1/variants',
        }),
        expect.anything(),
      );
    });

    it('should handle series with no subtitles', async () => {
      const mockVariants: any[] = [];

      mockClient.request.mockResolvedValue(mockVariants);

      const result = await api.listSeriesVariants(999);

      expect(result).toEqual([]);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/series/999/variants',
        }),
        expect.anything(),
      );
    });
  });

  describe('getEpisodeSubtitles', () => {
    it('should fetch subtitles for a specific episode', async () => {
      const mockEpisode = {
        episodeId: 5,
        seasonNumber: 1,
        episodeNumber: 3,
        subtitleTracks: [
          {
            languageCode: 'en',
            isForced: false,
            isHi: false,
            path: '/series/show/s01e03/en.srt',
            provider: 'opensubtitles',
          },
          {
            languageCode: 'es',
            isForced: true,
            isHi: false,
            path: '/series/show/s01e03/es-forced.srt',
            provider: 'subscene',
          },
        ],
        missingSubtitles: ['fr', 'de'],
      };

      mockClient.request.mockResolvedValue(mockEpisode);

      const result = await api.getEpisodeSubtitles(5);

      expect(result).toEqual(mockEpisode);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/episodes/5',
        }),
        expect.anything(),
      );
    });

    it('should handle episode with no subtitles', async () => {
      const mockEpisode = {
        episodeId: 10,
        seasonNumber: 2,
        episodeNumber: 1,
        subtitleTracks: [],
        missingSubtitles: ['en', 'es', 'fr'],
      };

      mockClient.request.mockResolvedValue(mockEpisode);

      const result = await api.getEpisodeSubtitles(10);

      expect(result).toEqual(mockEpisode);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/episodes/10',
        }),
        expect.anything(),
      );
    });
  });

  describe('syncSeries', () => {
    it('should sync series with Sonarr', async () => {
      const mockResult = {
        success: true,
        message: 'Series synced successfully',
        episodesUpdated: 5,
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.syncSeries(1);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/series/1/sync',
          method: 'POST',
        }),
        expect.anything(),
      );
    });

    it('should handle sync with series that has many episodes', async () => {
      const mockResult = {
        success: true,
        message: 'Series synced successfully',
        episodesUpdated: 50,
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.syncSeries(42);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/series/42/sync',
          method: 'POST',
        }),
        expect.anything(),
      );
    });
  });

  describe('scanSeriesDisk', () => {
    it('should scan disk for existing subtitles', async () => {
      const mockResult = {
        success: true,
        message: 'Disk scan completed',
        subtitlesFound: 12,
        newSubtitles: 3,
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.scanSeriesDisk(1);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/series/1/scan',
          method: 'POST',
        }),
        expect.anything(),
      );
    });

    it('should handle scan with no new subtitles found', async () => {
      const mockResult = {
        success: true,
        message: 'Disk scan completed',
        subtitlesFound: 10,
        newSubtitles: 0,
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.scanSeriesDisk(100);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/series/100/scan',
          method: 'POST',
        }),
        expect.anything(),
      );
    });
  });

  describe('searchSeriesSubtitles', () => {
    it('should search for missing subtitles for a series', async () => {
      const mockResult = {
        success: true,
        message: 'Subtitle search completed',
        episodesSearched: 10,
        subtitlesDownloaded: 3,
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.searchSeriesSubtitles(1);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/series/1/search',
          method: 'POST',
        }),
        expect.anything(),
      );
    });

    it('should handle search with no subtitles found', async () => {
      const mockResult = {
        success: true,
        message: 'Subtitle search completed',
        episodesSearched: 5,
        subtitlesDownloaded: 0,
      };

      mockClient.request.mockResolvedValue(mockResult);

      const result = await api.searchSeriesSubtitles(50);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/subtitles/series/50/search',
          method: 'POST',
        }),
        expect.anything(),
      );
    });
  });
});
