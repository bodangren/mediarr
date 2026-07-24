import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../../indexers/HttpClient';
import type { SettingsService } from '../SettingsService';
import { TMDBPopularProvider } from './TMDBPopularProvider';

describe('TMDBPopularProvider', () => {
  const get = vi.fn();
  const settingsGet = vi.fn();
  const provider = new TMDBPopularProvider(
    { get } as unknown as HttpClient,
    { get: settingsGet } as unknown as SettingsService,
  );

  beforeEach(() => {
    get.mockReset();
    settingsGet.mockReset();
    settingsGet.mockResolvedValue({ apiKeys: { tmdbApiKey: 'tmdb-key' } });
  });

  it('validates media type and result limits', () => {
    expect(provider.validateConfig({ mediaType: 'both', limit: 100 })).toBe(true);
    expect(provider.validateConfig({ mediaType: 'documentary' })).toBe(false);
    expect(provider.validateConfig({ limit: 0 })).toBe(false);
    expect(provider.validateConfig({ limit: 101 })).toBe(false);
    expect(provider.validateConfig({ limit: '20' })).toBe(false);
  });

  it('requires a configured TMDB API key', async () => {
    settingsGet.mockResolvedValue({ apiKeys: { tmdbApiKey: '' } });

    await expect(provider.fetch({ mediaType: 'movie' })).rejects.toThrow(
      'TMDB API Key is missing. Please configure it in settings.',
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('returns popular movies with normalized years', async () => {
    get.mockResolvedValue({
      ok: true,
      status: 200,
      body: JSON.stringify({
        results: [{ id: 603, title: 'The Matrix', release_date: '1999-03-31' }],
      }),
    });

    await expect(provider.fetch({ mediaType: 'movie', limit: 1 })).resolves.toEqual([
      {
        tmdbId: 603,
        title: 'The Matrix',
        year: 1999,
        mediaType: 'movie',
      },
    ]);
  });

  it('reports popular-movie request failures', async () => {
    get.mockResolvedValue({ ok: false, status: 503, body: 'unavailable' });

    await expect(provider.fetch({ mediaType: 'movie', limit: 1 })).rejects.toThrow(
      'Failed to fetch popular movies: 503 unavailable',
    );
  });

  it('normalizes popular TMDB TV results before returning them', async () => {
    get
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({
          results: [{ id: 1396, name: 'Breaking Bad', first_air_date: '2008-01-20' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({ tvdb_id: 81189, imdb_id: 'tt0903747' }),
      });

    await expect(provider.fetch({ mediaType: 'series', limit: 1 })).resolves.toEqual([
      {
        tmdbId: 1396,
        tvdbId: 81189,
        imdbId: 'tt0903747',
        title: 'Breaking Bad',
        year: 2008,
        mediaType: 'series',
      },
    ]);
  });

  it('fails truthfully when popular-series identifier resolution is unavailable', async () => {
    get
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({ results: [{ id: 1396, name: 'Breaking Bad' }] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 429, body: 'rate limited' });

    await expect(provider.fetch({ mediaType: 'series', limit: 1 })).rejects.toThrow(
      'Failed to resolve identifiers for TMDB series 1396: 429 rate limited',
    );
  });

  it('reports popular-series request failures before identifier resolution', async () => {
    get.mockResolvedValue({ ok: false, status: 503, body: 'unavailable' });

    await expect(provider.fetch({ mediaType: 'series', limit: 1 })).rejects.toThrow(
      'Failed to fetch popular series: 503 unavailable',
    );
  });
});
