import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParsedMovieInfo, ParsedEpisodeInfo } from './FilenameParsingService';

// Hoisted mock for releaseParser
const mockReleaseParse = vi.hoisted(() => vi.fn());

vi.mock('./ReleaseParser', () => ({
  releaseParser: { parse: mockReleaseParse },
}));

// FilenameParsingService requires a PrismaClient in constructor
const mockPrisma = {} as any;

import { FilenameParsingService } from './FilenameParsingService';

describe('FilenameParsingService', () => {
  let service: FilenameParsingService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new FilenameParsingService(mockPrisma);
  });

  describe('parseFilename() — AI primary', () => {
    it('returns AI result when releaseParser.parse succeeds', async () => {
      mockReleaseParse.mockResolvedValueOnce({
        title: 'The Shawshank Redemption',
        type: 'movie',
        matchType: 'episode',
        year: 1994,
        quality: { resolution: '1080p', source: 'BluRay' },
      });

      const expected: ParsedMovieInfo = {
        title: 'The Shawshank Redemption',
        year: 1994,
        quality: '1080p BluRay',
        resolution: '1080p',
        source: 'BluRay',
      };

      const result = await service.parseFilename('The.Shawshank.Redemption.1994.1080p.BluRay.mkv');
      expect(result).toEqual(expected);
      expect(mockReleaseParse).toHaveBeenCalledOnce();
    });

    it('falls back to regex when AI returns null — returns valid ParsedMovieInfo', async () => {
      mockReleaseParse.mockResolvedValueOnce(null);

      const result = await service.parseFilename('Pulp.Fiction.1994.720p.BluRay.x264-GROUP.mkv');
      expect(result.title).toBe('Pulp Fiction');
      expect(result.year).toBe(1994);
      expect(result.resolution).toBe('720p');
    });

    it('falls back to regex when AI fails — movie without year', async () => {
      mockReleaseParse.mockResolvedValueOnce(null);

      const result = await service.parseFilename('Inception.1080p.WEB-DL.mkv');
      expect(result.title).toBe('Inception');
      expect(result.resolution).toBe('1080p');
    });
  });

  describe('parseEpisodeFilename() — AI primary', () => {
    it('returns AI result when releaseParser.parse succeeds', async () => {
      mockReleaseParse.mockResolvedValueOnce({
        title: 'Breaking Bad',
        type: 'series',
        matchType: 'episode',
        seasonNumber: 1,
        episodeNumbers: [1],
        quality: { resolution: '1080p' },
      });

      const expected: ParsedEpisodeInfo = {
        seriesTitle: 'Breaking Bad',
        seasonNumber: 1,
        episodeNumber: 1,
        quality: '1080p',
        resolution: '1080p',
      };

      const result = await service.parseEpisodeFilename('Breaking.Bad.S01E01.1080p.mkv');
      expect(result).toEqual(expected);
      expect(mockReleaseParse).toHaveBeenCalledOnce();
    });

    it('falls back to regex when AI returns null — S01E02 pattern', async () => {
      mockReleaseParse.mockResolvedValueOnce(null);

      const result = await service.parseEpisodeFilename('Breaking.Bad.S01E02.1080p.BluRay.mkv');
      expect(result.seriesTitle).toBe('Breaking Bad');
      expect(result.seasonNumber).toBe(1);
      expect(result.episodeNumber).toBe(2);
      expect(result.resolution).toBe('1080p');
    });

    it('falls back to regex when AI returns null — 1x02 pattern', async () => {
      mockReleaseParse.mockResolvedValueOnce(null);

      const result = await service.parseEpisodeFilename('The.Show.1x12.Episode.720p.mkv');
      expect(result.seriesTitle).toBe('The Show');
      expect(result.seasonNumber).toBe(1);
      expect(result.episodeNumber).toBe(12);
    });
  });
});
