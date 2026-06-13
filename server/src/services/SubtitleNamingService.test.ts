import { describe, it, expect, beforeEach } from 'vitest';
import { SubtitleNamingService } from './SubtitleNamingService';

describe('SubtitleNamingService', () => {
  let service: SubtitleNamingService;

  beforeEach(() => {
    service = new SubtitleNamingService();
  });

  describe('buildSubtitlePath', () => {
    it('returns correct path for movie subtitle', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        variantToken: 'token',
      });

      expect(result).toBe('/movies/The.Matrix.1999.en.srt');
    });

    it('includes forced suffix when isForced is true', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: true,
        isHi: false,
        variantToken: 'token',
      });

      expect(result).toBe('/movies/The.Matrix.1999.en.forced.srt');
    });

    it('includes HI suffix when isHi is true', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: true,
        variantToken: 'token',
      });

      expect(result).toBe('/movies/The.Matrix.1999.en.hi.srt');
    });

    it('includes both forced and HI suffixes when both flags are true', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: true,
        isHi: true,
        variantToken: 'token',
      });

      expect(result).toBe('/movies/The.Matrix.1999.en.forced.hi.srt');
    });

    it('uses extension with leading dot as-is', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        extension: '.ass',
        variantToken: 'token',
      });

      expect(result).toBe('/movies/The.Matrix.1999.en.ass');
    });

    it('adds leading dot when extension has no dot', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        extension: 'sub',
        variantToken: 'token',
      });

      expect(result).toBe('/movies/The.Matrix.1999.en.sub');
    });

    it('defaults to .srt when extension is omitted', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'fr',
        isForced: false,
        isHi: false,
        variantToken: 'token',
      });

      expect(result).toBe('/movies/The.Matrix.1999.fr.srt');
    });

    it('lowercases language code', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'PT-BR',
        isForced: false,
        isHi: false,
        variantToken: 'token',
      });

      expect(result).toBe('/movies/The.Matrix.1999.pt-br.srt');
    });

    it('returns variant path when standard path collides with existingPaths', () => {
      const existing = '/movies/The.Matrix.1999.en.srt';
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        variantToken: 'release1',
        existingPaths: [existing],
      });

      expect(result).toBe('/movies/The.Matrix.1999.release1.en.srt');
    });

    it('does not return variant path when standard path is not in existingPaths', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        variantToken: 'release1',
        existingPaths: ['/movies/OtherMovie.en.srt'],
      });

      expect(result).toBe('/movies/The.Matrix.1999.en.srt');
    });

    it('sanitizes variant token: uppercased to lowercase', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        variantToken: 'RELEASE-2024',
        existingPaths: ['/movies/The.Matrix.1999.en.srt'],
      });

      expect(result).toBe('/movies/The.Matrix.1999.release-2024.en.srt');
    });

    it('sanitizes variant token: strips special characters', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        variantToken: 'release @#$ 2024',
        existingPaths: ['/movies/The.Matrix.1999.en.srt'],
      });

      expect(result).toBe('/movies/The.Matrix.1999.release-2024.en.srt');
    });

    it('sanitizes variant token: falls back to variant when token is empty after sanitization', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        variantToken: '###',
        existingPaths: ['/movies/The.Matrix.1999.en.srt'],
      });

      expect(result).toBe('/movies/The.Matrix.1999.variant.en.srt');
    });

    it('uses subtitleDirectory override when provided', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        variantToken: 'token',
        subtitleDirectory: '/subtitles/custom',
      });

      expect(result).toBe('/subtitles/custom/The.Matrix.1999.en.srt');
    });

    it('defaults directory to dirname of videoPath when subtitleDirectory is not provided', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/subfolder/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        variantToken: 'token',
      });

      expect(result).toBe('/movies/subfolder/The.Matrix.1999.en.srt');
    });

    it('handles collision with forced+HI variant path', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: true,
        isHi: true,
        variantToken: 'bluray',
        existingPaths: ['/movies/The.Matrix.1999.en.forced.hi.srt'],
      });

      expect(result).toBe('/movies/The.Matrix.1999.bluray.en.forced.hi.srt');
    });

    it('trims whitespace from variant token', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        variantToken: '  mytoken  ',
        existingPaths: ['/movies/The.Matrix.1999.en.srt'],
      });

      expect(result).toBe('/movies/The.Matrix.1999.mytoken.en.srt');
    });

    it('strips leading and trailing dashes from variant token', () => {
      const result = service.buildSubtitlePath({
        videoPath: '/movies/The.Matrix.1999.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        variantToken: '--mytoken--',
        existingPaths: ['/movies/The.Matrix.1999.en.srt'],
      });

      expect(result).toBe('/movies/The.Matrix.1999.mytoken.en.srt');
    });
  });
});
