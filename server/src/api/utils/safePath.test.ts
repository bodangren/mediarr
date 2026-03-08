import { describe, it, expect } from 'vitest';
import { safePath } from './safePath';

describe('safePath', () => {
  it('resolves normal sub-paths within base', () => {
    const result = safePath('/data/media', 'movies', 'Inception (2010)');
    expect(result).toBe('/data/media/movies/Inception (2010)');
  });

  it('throws on path traversal with ..', () => {
    expect(() => safePath('/data/media', '..', 'etc', 'passwd')).toThrow('Path traversal detected');
  });

  it('throws on traversal embedded in segment', () => {
    expect(() => safePath('/data/media', 'movies/../../etc')).toThrow('Path traversal detected');
  });

  it('allows the base directory itself', () => {
    const result = safePath('/data/media');
    expect(result).toBe('/data/media');
  });

  it('resolves nested paths correctly', () => {
    const result = safePath('/data/media/tv', 'Breaking Bad', 'Season 01', 'S01E01.mkv');
    expect(result).toBe('/data/media/tv/Breaking Bad/Season 01/S01E01.mkv');
  });

  it('handles base with trailing separator', () => {
    const result = safePath('/data/media/', 'movies');
    expect(result).toBe('/data/media/movies');
  });
});
