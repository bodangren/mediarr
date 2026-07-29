import { describe, expect, it, vi } from 'vitest';
import type { JellyfinCatalogRepository } from './catalog';
import { encodeJellyfinId } from './ids';
import {
  ArtworkUrlValidationError,
  proxyJellyfinArtwork,
  resolveJellyfinArtworkSource,
  validateJellyfinArtworkUrl,
} from './artwork';

function createRepository(
  overrides: Partial<JellyfinCatalogRepository> = {},
): JellyfinCatalogRepository {
  return {
    listMovies: vi.fn().mockResolvedValue([]),
    listSeries: vi.fn().mockResolvedValue([]),
    listSeasonsBySeriesId: vi.fn().mockResolvedValue([]),
    listEpisodesBySeriesId: vi.fn().mockResolvedValue([]),
    listEpisodesBySeasonId: vi.fn().mockResolvedValue([]),
    findMovieById: vi.fn().mockResolvedValue(null),
    findSeriesById: vi.fn().mockResolvedValue(null),
    findSeasonById: vi.fn().mockResolvedValue(null),
    findEpisodeById: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('Jellyfin artwork URL validation and proxying', () => {
  it.each([
    'https://image.tmdb.org/t/p/w500/poster.jpg',
    'https://artworks.thetvdb.com/banners/poster.jpg',
    'https://www.thetvdb.com/banners/poster.jpg',
    'https://thetvdb.com/banners/poster.jpg',
  ])('accepts the existing image proxy allowlist: %s', (url) => {
    expect(validateJellyfinArtworkUrl(url).hostname).toBe(new URL(url).hostname);
  });

  it('rejects malformed and untrusted hosts before fetching', async () => {
    const fetcher = vi.fn();

    expect(() => validateJellyfinArtworkUrl('not-a-url')).toThrow(ArtworkUrlValidationError);
    expect(() => validateJellyfinArtworkUrl('https://image.tmdb.org.evil.example/poster.jpg'))
      .toThrow(ArtworkUrlValidationError);
    await expect(proxyJellyfinArtwork('https://example.com/poster.jpg', fetcher))
      .rejects.toThrow(ArtworkUrlValidationError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('proxies upstream image bytes with the existing image cache policy', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(Uint8Array.from([1, 2, 3]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }));

    const result = await proxyJellyfinArtwork(
      'https://image.tmdb.org/t/p/original/poster.png',
      fetcher,
    );

    expect(result).toEqual({
      ok: true,
      status: 200,
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
      body: Uint8Array.from([1, 2, 3]),
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://image.tmdb.org/t/p/original/poster.png',
      {
        headers: {
          'User-Agent': expect.stringContaining('Mozilla/5.0'),
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      },
    );
  });

  it('preserves upstream non-success status without exposing a response body', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('missing', {
      status: 404,
      statusText: 'Not Found',
    }));

    await expect(proxyJellyfinArtwork('https://thetvdb.com/missing.jpg', fetcher)).resolves.toEqual({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
  });
});

describe('resolveJellyfinArtworkSource', () => {
  it('selects direct movie/series posters and inherits a series poster for seasons and episodes', async () => {
    const repository = createRepository({
      findMovieById: vi.fn().mockResolvedValue({
        id: 1,
        tmdbId: 10,
        title: 'Movie',
        posterUrl: 'https://image.tmdb.org/t/p/w500/movie.jpg',
      }),
      findSeriesById: vi.fn().mockResolvedValue({
        id: 2,
        tvdbId: 20,
        title: 'Series',
        posterUrl: 'https://artworks.thetvdb.com/banners/series.jpg',
      }),
      findSeasonById: vi.fn().mockResolvedValue({ id: 3, seriesId: 2, seasonNumber: 1 }),
      findEpisodeById: vi.fn().mockResolvedValue({
        id: 4,
        seriesId: 2,
        seasonId: 3,
        tvdbId: 40,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot',
      }),
    });

    await expect(resolveJellyfinArtworkSource(repository, encodeJellyfinId('movie', 1), 'Primary'))
      .resolves.toEqual({ url: 'https://image.tmdb.org/t/p/w500/movie.jpg', inherited: false });
    await expect(resolveJellyfinArtworkSource(repository, encodeJellyfinId('series', 2), 'Primary'))
      .resolves.toEqual({ url: 'https://artworks.thetvdb.com/banners/series.jpg', inherited: false });
    await expect(resolveJellyfinArtworkSource(repository, encodeJellyfinId('season', 3), 'Primary'))
      .resolves.toEqual({ url: 'https://artworks.thetvdb.com/banners/series.jpg', inherited: true });
    await expect(resolveJellyfinArtworkSource(repository, encodeJellyfinId('episode', 4), 'Primary'))
      .resolves.toEqual({ url: 'https://artworks.thetvdb.com/banners/series.jpg', inherited: true });
  });

  it('does not invent unsupported Backdrop artwork or resolve unknown/non-poster items', async () => {
    const repository = createRepository({
      findMovieById: vi.fn().mockResolvedValue({
        id: 1,
        tmdbId: 10,
        title: 'Movie',
        posterUrl: 'https://image.tmdb.org/t/p/w500/movie.jpg',
      }),
    });

    await expect(resolveJellyfinArtworkSource(repository, encodeJellyfinId('movie', 1), 'Backdrop'))
      .resolves.toBeNull();
    await expect(resolveJellyfinArtworkSource(repository, '00000000-0000-0000-0000-000000000000', 'Primary'))
      .resolves.toBeNull();
    expect(repository.findMovieById).not.toHaveBeenCalled();
  });

  it('returns null when parent metadata or a poster URL is absent', async () => {
    const repository = createRepository({
      findSeasonById: vi.fn().mockResolvedValue({ id: 3, seriesId: 2, seasonNumber: 1 }),
      findSeriesById: vi.fn().mockResolvedValue({ id: 2, tvdbId: 20, title: 'Series', posterUrl: null }),
    });

    await expect(resolveJellyfinArtworkSource(repository, encodeJellyfinId('season', 3), 'Primary'))
      .resolves.toBeNull();
  });
});
