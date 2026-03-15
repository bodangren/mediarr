import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParsedMovieInfo, ParsedEpisodeInfo } from './FilenameParsingService';

// Hoisted mock for aiParsingService
const mockAiParse = vi.hoisted(() => vi.fn());

vi.mock('./AiParsingService', () => ({
  aiParsingService: { parse: mockAiParse },
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
    it('returns AI result when aiParsingService.parse succeeds', async () => {
      const aiResult: ParsedMovieInfo = {
        title: 'The Shawshank Redemption',
        year: 1994,
        quality: '1080p',
        resolution: '1080p',
        source: 'BluRay',
      };
      mockAiParse.mockResolvedValueOnce(aiResult);

      const result = await service.parseFilename('The.Shawshank.Redemption.1994.1080p.BluRay.mkv');
      expect(result).toEqual(aiResult);
      expect(mockAiParse).toHaveBeenCalledOnce();
    });

    it('falls back to regex when AI returns null — returns valid ParsedMovieInfo', async () => {
      mockAiParse.mockResolvedValueOnce(null);

      const result = await service.parseFilename('Pulp.Fiction.1994.720p.BluRay.x264-GROUP.mkv');
      expect(result.title).toBe('Pulp Fiction');
      expect(result.year).toBe(1994);
      expect(result.resolution).toBe('720p');
    });

    it('falls back to regex when AI fails — movie without year', async () => {
      mockAiParse.mockResolvedValueOnce(null);

      const result = await service.parseFilename('Inception.1080p.WEB-DL.mkv');
      expect(result.title).toBe('Inception');
      expect(result.resolution).toBe('1080p');
    });
  });

  describe('parseEpisodeFilename() — AI primary', () => {
    it('returns AI result when aiParsingService.parse succeeds', async () => {
      const aiResult: ParsedEpisodeInfo = {
        seriesTitle: 'Breaking Bad',
        seasonNumber: 1,
        episodeNumber: 1,
        quality: '1080p',
        resolution: '1080p',
      };
      mockAiParse.mockResolvedValueOnce(aiResult);

      const result = await service.parseEpisodeFilename('Breaking.Bad.S01E01.1080p.mkv');
      expect(result).toEqual(aiResult);
      expect(mockAiParse).toHaveBeenCalledOnce();
    });

    it('falls back to regex when AI returns null — S01E02 pattern', async () => {
      mockAiParse.mockResolvedValueOnce(null);

      const result = await service.parseEpisodeFilename('Breaking.Bad.S01E02.1080p.BluRay.mkv');
      expect(result.seriesTitle).toBe('Breaking Bad');
      expect(result.seasonNumber).toBe(1);
      expect(result.episodeNumber).toBe(2);
      expect(result.resolution).toBe('1080p');
    });

    it('falls back to regex when AI returns null — 1x02 pattern', async () => {
      mockAiParse.mockResolvedValueOnce(null);

      const result = await service.parseEpisodeFilename('The.Show.1x12.Episode.720p.mkv');
      expect(result.seriesTitle).toBe('The Show');
      expect(result.seasonNumber).toBe(1);
      expect(result.episodeNumber).toBe(12);
    });
  });
});
