import { describe, it, expect } from 'vitest';
import { Parser } from './Parser';

describe('Parser', () => {
  describe('parse (series)', () => {
    it('parses S01E01 format', () => {
      const result = Parser.parse('Breaking.Bad.S01E01.Pilot.mkv');
      expect(result).not.toBeNull();
      expect(result?.seriesTitle).toBe('Breaking Bad');
      expect(result?.seasonNumber).toBe(1);
      expect(result?.episodeNumbers).toEqual([1]);
      expect(result?.type).toBe('series');
    });

    it('parses s01e01 lowercase format', () => {
      const result = Parser.parse('show.s01e05.title.mkv');
      expect(result).not.toBeNull();
      expect(result?.seasonNumber).toBe(1);
      expect(result?.episodeNumbers).toEqual([5]);
    });

    it('parses 1x01 format', () => {
      const result = Parser.parse('The.Show.1x12.Episode.Name.mkv');
      expect(result).not.toBeNull();
      expect(result?.seriesTitle).toBe('The Show');
      expect(result?.seasonNumber).toBe(1);
      expect(result?.episodeNumbers).toEqual([12]);
    });

    it('parses Season X Episode Y format', () => {
      const result = Parser.parse('Series Name Season 2 Episode 3.mkv');
      expect(result).not.toBeNull();
      expect(result?.seasonNumber).toBe(2);
      expect(result?.episodeNumbers).toEqual([3]);
    });
  });

  describe('parse (movie)', () => {
    it('returns null for movie-like filenames to preserve episode parser contract', () => {
      const result = Parser.parse('The.Matrix.1999.1080p.mkv');
      expect(result).toBeNull();
    });

    it('returns null for movie names with parenthesized year', () => {
      const result = Parser.parse('Inception (2010).mp4');
      expect(result).toBeNull();
    });

    it('returns null for movie release names with quality tokens', () => {
      const result = Parser.parse('Movie.Name.2024.2160p.UHD.BluRay.mkv');
      expect(result).toBeNull();
    });

    it('returns null for movie names without a year', () => {
      const result = Parser.parse('Some.Movie.1080p.BluRay.x264-GROUP.mkv');
      expect(result).toBeNull();
    });
  });

  describe('parseMovie', () => {
    it('extracts title and year from standard format', () => {
      const result = Parser.parseMovie('The.Shawshank.Redemption.1994.1080p.mkv');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('The Shawshank Redemption');
      expect(result?.year).toBe(1994);
    });

    it('handles dots as spaces', () => {
      const result = Parser.parseMovie('Pulp.Fiction.1994.mkv');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Pulp Fiction');
    });

    it('handles underscores as spaces', () => {
      const result = Parser.parseMovie('The_Godfather_1972.mkv');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('The Godfather');
    });

    it('extracts quality from movie filename', () => {
      const result = Parser.parseMovie('Movie.Name.2024.2160p.UHD.BluRay.mkv');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Movie Name');
      expect(result?.year).toBe(2024);
      expect(result?.quality).toBe('2160p');
    });
  });

  describe('parseDirectory', () => {
    it('parses movie folder format "Title (Year)"', () => {
      const result = Parser.parseDirectory('The Matrix (1999)');
      expect(result.title).toBe('The Matrix');
      expect(result.year).toBe(1999);
      expect(result.type).toBe('movie');
    });

    it('parses movie folder with dots', () => {
      const result = Parser.parseDirectory('The.Dark.Knight.(2008)');
      expect(result.title).toBe('The Dark Knight');
      expect(result.year).toBe(2008);
      expect(result.type).toBe('movie');
    });

    it('detects series from Season folder', () => {
      const result = Parser.parseDirectory('Season 01');
      expect(result.type).toBe('series');
    });

    it('parses folder with year but no type indication', () => {
      const result = Parser.parseDirectory('Breaking Bad 2008');
      expect(result.title).toBe('Breaking Bad 2008');
      expect(result.year).toBe(2008);
      expect(result.type).toBeUndefined();
    });

    it('handles plain folder names', () => {
      const result = Parser.parseDirectory('My Movies');
      expect(result.title).toBe('My Movies');
    });
  });
});
