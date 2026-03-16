import { describe, it, expect } from 'vitest';
import type { ParsedInfo, ParsedMovie, ParsedDirectory } from './Parser';
import { Parser } from './Parser';

// Regex-only tests — Parser.ts is now pure regex; AI calls are handled by ReleaseParser.
describe('Parser — regex fallback', () => {
  describe('parse (series)', () => {
    it('parses S01E01 format', async () => {
      const result = await Parser.parse('Breaking.Bad.S01E01.Pilot.mkv');
      expect(result).not.toBeNull();
      expect(result?.seriesTitle).toBe('Breaking Bad');
      expect(result?.seasonNumber).toBe(1);
      expect(result?.episodeNumbers).toEqual([1]);
      expect(result?.type).toBe('series');
    });

    it('parses s01e01 lowercase format', async () => {
      const result = await Parser.parse('show.s01e05.title.mkv');
      expect(result).not.toBeNull();
      expect(result?.seasonNumber).toBe(1);
      expect(result?.episodeNumbers).toEqual([5]);
    });

    it('parses 1x01 format', async () => {
      const result = await Parser.parse('The.Show.1x12.Episode.Name.mkv');
      expect(result).not.toBeNull();
      expect(result?.seriesTitle).toBe('The Show');
      expect(result?.seasonNumber).toBe(1);
      expect(result?.episodeNumbers).toEqual([12]);
    });

    it('parses Season X Episode Y format', async () => {
      const result = await Parser.parse('Series Name Season 2 Episode 3.mkv');
      expect(result).not.toBeNull();
      expect(result?.seasonNumber).toBe(2);
      expect(result?.episodeNumbers).toEqual([3]);
    });
  });

  describe('parse (movie)', () => {
    it('returns null for movie-like filenames to preserve episode parser contract', async () => {
      const result = await Parser.parse('The.Matrix.1999.1080p.mkv');
      expect(result).toBeNull();
    });

    it('returns null for movie names with parenthesized year', async () => {
      const result = await Parser.parse('Inception (2010).mp4');
      expect(result).toBeNull();
    });

    it('returns null for movie release names with quality tokens', async () => {
      const result = await Parser.parse('Movie.Name.2024.2160p.UHD.BluRay.mkv');
      expect(result).toBeNull();
    });

    it('returns null for movie names without a year', async () => {
      const result = await Parser.parse('Some.Movie.1080p.BluRay.x264-GROUP.mkv');
      expect(result).toBeNull();
    });
  });

  describe('parseMovie', () => {
    it('extracts title and year from standard format', async () => {
      const result = await Parser.parseMovie('The.Shawshank.Redemption.1994.1080p.mkv');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('The Shawshank Redemption');
      expect(result?.year).toBe(1994);
    });

    it('handles dots as spaces', async () => {
      const result = await Parser.parseMovie('Pulp.Fiction.1994.mkv');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Pulp Fiction');
    });

    it('handles underscores as spaces', async () => {
      const result = await Parser.parseMovie('The_Godfather_1972.mkv');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('The Godfather');
    });

    it('extracts quality from movie filename', async () => {
      const result = await Parser.parseMovie('Movie.Name.2024.2160p.UHD.BluRay.mkv');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Movie Name');
      expect(result?.year).toBe(2024);
      expect(result?.quality).toBe('2160p');
    });
  });

  describe('parseDirectory', () => {
    it('parses movie folder format "Title (Year)"', async () => {
      const result = await Parser.parseDirectory('The Matrix (1999)');
      expect(result.title).toBe('The Matrix');
      expect(result.year).toBe(1999);
      expect(result.type).toBe('movie');
    });

    it('parses movie folder with dots', async () => {
      const result = await Parser.parseDirectory('The.Dark.Knight.(2008)');
      expect(result.title).toBe('The Dark Knight');
      expect(result.year).toBe(2008);
      expect(result.type).toBe('movie');
    });

    it('detects series from Season folder', async () => {
      const result = await Parser.parseDirectory('Season 01');
      expect(result.type).toBe('series');
    });

    it('parses folder with year but no type indication', async () => {
      const result = await Parser.parseDirectory('Breaking Bad 2008');
      expect(result.title).toBe('Breaking Bad 2008');
      expect(result.year).toBe(2008);
      expect(result.type).toBeUndefined();
    });

    it('handles plain folder names', async () => {
      const result = await Parser.parseDirectory('My Movies');
      expect(result.title).toBe('My Movies');
    });
  });
});

// Satisfy TypeScript: these imports are used in the type-checking context only
type _ParsedInfo = ParsedInfo;
type _ParsedMovie = ParsedMovie;
type _ParsedDirectory = ParsedDirectory;
