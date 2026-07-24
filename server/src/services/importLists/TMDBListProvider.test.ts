import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../../indexers/HttpClient';
import type { SettingsService } from '../SettingsService';
import { TMDBListProvider } from './TMDBListProvider';

describe('TMDBListProvider', () => {
  const get = vi.fn();
  const settingsGet = vi.fn();
  const provider = new TMDBListProvider(
    { get } as unknown as HttpClient,
    { get: settingsGet } as unknown as SettingsService,
  );

  beforeEach(() => {
    get.mockReset();
    settingsGet.mockReset();
    settingsGet.mockResolvedValue({ apiKeys: { tmdbApiKey: 'tmdb-key' } });
  });

  it('accepts SPA decimal strings and legacy positive safe integers', () => {
    expect(provider.validateConfig({ listId: 7 })).toBe(true);
    expect(provider.validateConfig({ listId: '7' })).toBe(true);
    expect(provider.validateConfig({ listId: '0007' })).toBe(true);
    expect(provider.validateConfig({ listId: '9007199254740993' })).toBe(true);
  });

  it.each([
    ['missing', {}],
    ['empty', { listId: '' }],
    ['whitespace', { listId: ' 7' }],
    ['zero string', { listId: '0' }],
    ['negative string', { listId: '-7' }],
    ['fractional string', { listId: '7.5' }],
    ['exponent string', { listId: '7e2' }],
    ['zero number', { listId: 0 }],
    ['negative number', { listId: -7 }],
    ['fractional number', { listId: 7.5 }],
    ['unsafe integer', { listId: Number.MAX_SAFE_INTEGER + 1 }],
    ['NaN', { listId: Number.NaN }],
  ])('rejects %s list IDs', (_description, config) => {
    expect(provider.validateConfig(config)).toBe(false);
  });

  it('rejects invalid list IDs before issuing an HTTP request', async () => {
    await expect(provider.fetch({ listId: '7.5' })).rejects.toThrow(
      'List ID must be a positive decimal integer for TMDB List provider',
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('builds the TMDB URL from a decimal string without numeric coercion', async () => {
    get.mockResolvedValue({
      ok: true,
      status: 200,
      body: JSON.stringify({ items: [], page: 1, total_pages: 1 }),
    });

    await expect(provider.fetch({ listId: '9007199254740993' })).resolves.toEqual([]);

    expect(get).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/list/9007199254740993?api_key=tmdb-key&page=1',
    );
  });

  it('keeps positive integer configuration backward compatible', async () => {
    get.mockResolvedValue({
      ok: true,
      status: 200,
      body: JSON.stringify({ items: [], page: 1, total_pages: 1 }),
    });

    await expect(provider.fetch({ listId: 7 })).resolves.toEqual([]);

    expect(get).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/list/7?api_key=tmdb-key&page=1',
    );
  });

  it('normalizes leading zeroes without converting the ID to a number', async () => {
    get.mockResolvedValue({
      ok: true,
      status: 200,
      body: JSON.stringify({ items: [], page: 1, total_pages: 1 }),
    });

    await expect(provider.fetch({ listId: '0007' })).resolves.toEqual([]);

    expect(get).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/list/7?api_key=tmdb-key&page=1',
    );
  });

  it('does not accept coercible non-contract values', () => {
    expect(provider.validateConfig({})).toBe(false);
    expect(provider.validateConfig({ listId: true })).toBe(false);
    expect(provider.validateConfig({ listId: ['7'] })).toBe(false);
  });

  it('requires a configured TMDB API key', async () => {
    settingsGet.mockResolvedValue({ apiKeys: { tmdbApiKey: '' } });

    await expect(provider.fetch({ listId: 7 })).rejects.toThrow(
      'TMDB API Key is missing. Please configure it in settings.',
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('reports a missing TMDB list exactly', async () => {
    get.mockResolvedValue({ ok: false, status: 404, body: 'not found' });

    await expect(provider.fetch({ listId: 7 })).rejects.toThrow('TMDB List 7 not found');
  });

  it('resolves TMDB TV entries to their TVDB and IMDb identifiers', async () => {
    get
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({
          items: [
            { id: 603, title: 'The Matrix', media_type: 'movie', release_date: '1999-03-31' },
            { id: 1396, name: 'Breaking Bad', media_type: 'tv', first_air_date: '2008-01-20' },
          ],
          page: 1,
          total_pages: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({ tvdb_id: 81189, imdb_id: 'tt0903747' }),
      });

    await expect(provider.fetch({ listId: 7 })).resolves.toEqual([
      {
        tmdbId: 603,
        title: 'The Matrix',
        year: 1999,
        mediaType: 'movie',
      },
      {
        tmdbId: 1396,
        tvdbId: 81189,
        imdbId: 'tt0903747',
        title: 'Breaking Bad',
        year: 2008,
        mediaType: 'series',
      },
    ]);
    expect(get).toHaveBeenNthCalledWith(
      2,
      'https://api.themoviedb.org/3/tv/1396/external_ids?api_key=tmdb-key',
    );
  });

  it('fails the provider fetch when a TV entry cannot be normalized to TVDB', async () => {
    get
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({
          items: [{ id: 999, name: 'Unmapped Series', media_type: 'tv' }],
          page: 1,
          total_pages: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({ tvdb_id: null }),
      });

    await expect(provider.fetch({ listId: 7 })).rejects.toThrow(
      'TMDB series 999 has no valid TVDB ID',
    );
  });

  it('reports TMDB external-ID request failures instead of emitting an unusable series', async () => {
    get
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({
          items: [{ id: 1396, name: 'Breaking Bad', media_type: 'tv' }],
          page: 1,
          total_pages: 1,
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 503, body: 'unavailable' });

    await expect(provider.fetch({ listId: 7 })).rejects.toThrow(
      'Failed to resolve identifiers for TMDB series 1396: 503 unavailable',
    );
  });
});
