import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetadataProvider } from '../server/src/services/MetadataProvider';
import { HttpClient } from '../server/src/indexers/HttpClient';

describe('MetadataProvider Unified Media Interface', () => {
  let provider;
  let settingsService;

  beforeEach(() => {
    settingsService = {
      get: vi.fn().mockResolvedValue({
        apiKeys: { tmdbApiKey: 'test-tmdb-key' },
      }),
    };
    provider = new MetadataProvider(new HttpClient(), settingsService);
  });

  it('should search TV media with the unified interface', async () => {
    const mockResponse = [
      {
        title: 'The Boys',
        tvdbId: 355567,
        status: 'continuing',
        year: 2019,
        images: [],
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponse),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const results = await provider.searchMedia({ mediaType: 'TV', term: 'The Boys' }, mockFetch);

    expect(results).toHaveLength(1);
    expect(results[0].mediaType).toBe('TV');
    expect(results[0].title).toBe('The Boys');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('skyhook.sonarr.tv/v1/tvdb/search?term=the%20boys'),
      expect.anything()
    );
  });

  it('should search movie media with the unified interface', async () => {
    const mockResponse = {
      results: [
        {
          id: 13,
          title: 'Forrest Gump',
          release_date: '1994-07-06',
          overview: 'Life is like a box of chocolates',
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponse),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const results = await provider.searchMedia({ mediaType: 'MOVIE', term: 'Forrest Gump' }, mockFetch);

    expect(results).toHaveLength(1);
    expect(results[0].mediaType).toBe('MOVIE');
    expect(results[0].title).toBe('Forrest Gump');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/search/movie?api_key=test-tmdb-key'),
      expect.anything()
    );
  });

  it('should load movie details with normalized availability fields', async () => {
    const mockResponse = {
      id: 13,
      title: 'Forrest Gump',
      release_date: '1994-07-06',
      status: 'Released',
      overview: 'Life is like a box of chocolates',
      imdb_id: 'tt0109830',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponse),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const details = await provider.getMediaDetails({ mediaType: 'MOVIE', tmdbId: 13 }, mockFetch);

    expect(details.mediaType).toBe('MOVIE');
    expect(details.tmdbId).toBe(13);
    expect(details.title).toBe('Forrest Gump');
    expect(details.availability).toBe('released');
  });

  it('should classify streaming and in-cinemas movies correctly', () => {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const yesterday = new Date(Date.now() - oneDayMs).toISOString();
    const nextWeek = new Date(Date.now() + (7 * oneDayMs)).toISOString();

    const streaming = provider.getMovieAvailability({
      status: 'Streaming',
    });
    const inCinemas = provider.getMovieAvailability({
      status: 'Announced',
      inCinemas: yesterday,
      digitalRelease: nextWeek,
    });

    expect(streaming).toBe('streaming');
    expect(inCinemas).toBe('in_cinemas');
  });
});
