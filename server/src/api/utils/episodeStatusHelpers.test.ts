import { describe, it, expect, vi, afterEach } from 'vitest';
import { determineEpisodeStatus, determineMovieStatus } from './episodeStatusHelpers';

afterEach(() => {
  vi.useRealTimers();
});

describe('determineEpisodeStatus', () => {
  it('returns downloaded when hasFile is true', () => {
    expect(determineEpisodeStatus(new Date('2020-01-01'), true)).toBe('downloaded');
  });

  it('returns unaired when airDate is null', () => {
    expect(determineEpisodeStatus(null, false)).toBe('unaired');
  });

  it('returns unaired when airDate is undefined', () => {
    expect(determineEpisodeStatus(undefined, false)).toBe('unaired');
  });

  it('returns airing when airDate is today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T15:00:00Z'));
    expect(determineEpisodeStatus(new Date('2026-03-08T10:00:00Z'), false)).toBe('airing');
  });

  it('returns missing when airDate is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T15:00:00Z'));
    expect(determineEpisodeStatus(new Date('2026-03-01T12:00:00Z'), false)).toBe('missing');
  });

  it('returns unaired when airDate is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T15:00:00Z'));
    expect(determineEpisodeStatus(new Date('2026-04-01T12:00:00Z'), false)).toBe('unaired');
  });
});

describe('determineMovieStatus', () => {
  it('returns downloaded when hasFile is true', () => {
    expect(determineMovieStatus(new Date('2020-01-01'), true)).toBe('downloaded');
  });

  it('returns unaired when releaseDate is null', () => {
    expect(determineMovieStatus(null, false)).toBe('unaired');
  });

  it('returns missing when releaseDate is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T15:00:00Z'));
    expect(determineMovieStatus(new Date('2026-01-01'), false)).toBe('missing');
  });

  it('returns unaired when releaseDate is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T15:00:00Z'));
    expect(determineMovieStatus(new Date('2026-12-01'), false)).toBe('unaired');
  });
});
