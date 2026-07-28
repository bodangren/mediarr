import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetadataProvider } from './MetadataProvider';
import type { HttpClient } from '../indexers/HttpClient';
import type { SettingsService } from './SettingsService';

// Sibling coverage for MetadataProvider (chore_remaining_server_service_coverage_20260728).
//
// Baseline 60.22% branch, the largest surface in this track at 360 LOC. Both
// dependencies are constructor-injected and the service already threads an
// optional fetchFn, so no module mocking is required.
//
// The service logs heavily under [DIAG:...]; console is silenced per-test so a
// failure's output stays readable, and the error-path logging is asserted where
// it is the only observable difference between two branches.
//
// Final: 100% stmt/func/line, 94.31% branch (target was >=80%). The residual
// branches are UNREACHABLE, not untested, and are left alone deliberately:
//   - lines 88, 100, 104: `(result as any).popularity ?? 0`. Both producers
//     always populate popularity — searchSeries sets `item.rating?.count ?? 0`
//     and searchMovies sets `movie.popularity ?? 0` — so the `?? 0` fallback
//     here can never fire.
//   - line 284: `apiKey ? 'yes' : 'no'` in a log line three statements below a
//     `if (!apiKey) throw`, so the 'no' arm is dead.
// Reaching them would require faking a state the code cannot enter. Recorded
// rather than chased, per the SettingsService lesson about coverage targets that
// measure the wrong thing.

const ok = (body: unknown) => ({ ok: true, status: 200, body: JSON.stringify(body), headers: {} });
const fail = (status: number, body = 'upstream said no') => ({
  ok: false,
  status,
  body,
  headers: {},
});

const makeHttpClient = () => {
  const get = vi.fn();
  return { client: { get } as unknown as HttpClient, get };
};

const makeSettings = (tmdbApiKey: string | undefined) => {
  const getSettings = vi.fn().mockResolvedValue({ apiKeys: { tmdbApiKey } });
  return { service: { get: getSettings } as unknown as SettingsService, getSettings };
};

// Takes an options object rather than a positional argument on purpose: a
// default parameter is applied when the argument is `undefined`, so
// `build(undefined)` would silently hand back the default key and the
// missing-key tests would assert nothing. `'tmdbApiKey' in opts` distinguishes
// "not specified" from "explicitly absent".
const build = (opts: { tmdbApiKey?: string | undefined } = {}) => {
  const tmdbApiKey = 'tmdbApiKey' in opts ? opts.tmdbApiKey : 'tmdb-key';
  const { client, get } = makeHttpClient();
  const { service, getSettings } = makeSettings(tmdbApiKey);
  return { provider: new MetadataProvider(client, service), get, getSettings };
};

const buildWithoutKey = () => build({ tmdbApiKey: undefined });

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MetadataProvider', () => {
  describe('searchSeries', () => {
    it('lower-cases, trims, and URL-encodes the search term', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok([]));

      await provider.searchSeries('  The Boys & Co  ');

      expect(get).toHaveBeenCalledWith(
        'https://skyhook.sonarr.tv/v1/tvdb/search/en/?term=the%20boys%20%26%20co',
        {},
        undefined,
      );
    });

    it('passes an injected fetch implementation through to the client', async () => {
      const { provider, get } = build();
      const fetchFn = vi.fn();
      get.mockResolvedValue(ok([]));

      await provider.searchSeries('x', fetchFn);

      expect(get).toHaveBeenCalledWith(expect.any(String), {}, fetchFn);
    });

    it('throws with the upstream status and body when the request fails', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(fail(503, 'skyhook down'));

      await expect(provider.searchSeries('x')).rejects.toThrow(
        'Failed to search series: 503 skyhook down',
      );
    });

    it('derives a missing year from firstAired', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok([{ tvdbId: 1, title: 'A', firstAired: '2019-07-26' }]));

      const [result] = await provider.searchSeries('a');

      expect(result?.year).toBe(2019);
    });

    it('prefers an explicit year over firstAired', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok([{ tvdbId: 1, title: 'A', year: 2018, firstAired: '2019-07-26' }]));

      const [result] = await provider.searchSeries('a');

      expect(result?.year).toBe(2018);
    });

    it('leaves year undefined when neither field is present', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok([{ tvdbId: 1, title: 'A' }]));

      const [result] = await provider.searchSeries('a');

      expect(result?.year).toBeUndefined();
    });

    it('maps rating count to popularity, defaulting to zero', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(
        ok([
          { tvdbId: 1, title: 'rated', rating: { count: 99 } },
          { tvdbId: 2, title: 'unrated' },
        ]),
      );

      // The double cast is required because `SeriesSearchResult` does not declare
      // `popularity` even though `searchSeries` always sets it — which is exactly
      // why `searchMedia` has to read it back through `(result as any)`. Noted in
      // tech-debt.md; the interface is out of step with the mapper.
      const results = (await provider.searchSeries('a')) as unknown as Array<{
        popularity: number;
      }>;

      expect(results[0]?.popularity).toBe(99);
      expect(results[1]?.popularity).toBe(0);
    });
  });

  describe('getSeriesDetails', () => {
    it('requests the show endpoint for the given tvdb id', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ tvdbId: 71663, episodes: [] }));

      await provider.getSeriesDetails(71663);

      expect(get).toHaveBeenCalledWith(
        'https://skyhook.sonarr.tv/v1/tvdb/shows/en/71663',
        {},
        undefined,
      );
    });

    it('returns the payload as series with its episodes', async () => {
      const { provider, get } = build();
      const episodes = [{ id: 1 }];
      get.mockResolvedValue(ok({ tvdbId: 1, title: 'A', episodes }));

      const details = await provider.getSeriesDetails(1);

      expect(details.series).toMatchObject({ tvdbId: 1, title: 'A' });
      expect(details.episodes).toEqual(episodes);
    });

    it('defaults episodes to an empty array when absent', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ tvdbId: 1, title: 'A' }));

      await expect(provider.getSeriesDetails(1)).resolves.toMatchObject({ episodes: [] });
    });

    it('throws when the request fails', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(fail(404, 'no such show'));

      await expect(provider.getSeriesDetails(1)).rejects.toThrow(
        'Failed to get series details: 404 no such show',
      );
    });
  });

  describe('findMovieByImdbId', () => {
    it('throws when no TMDB key is configured', async () => {
      const { provider } = buildWithoutKey();

      await expect(provider.findMovieByImdbId('tt0133093')).rejects.toThrow(
        'TMDB API Key is missing. Please configure it in settings.',
      );
    });

    it('adds the tt prefix when it is missing', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ movie_results: [] }));

      await provider.findMovieByImdbId('0133093');

      expect(get.mock.calls[0]?.[0]).toContain('/find/tt0133093?');
    });

    it('keeps an existing tt prefix', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ movie_results: [] }));

      await provider.findMovieByImdbId('tt0133093');

      expect(get.mock.calls[0]?.[0]).toContain('/find/tt0133093?');
    });

    it('throws when the request fails', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(fail(401, 'bad key'));

      await expect(provider.findMovieByImdbId('tt1')).rejects.toThrow(
        'Failed to find movie by IMDb ID: 401 bad key',
      );
    });

    it('returns null when there are no movie results', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ movie_results: [] }));

      await expect(provider.findMovieByImdbId('tt1')).resolves.toBeNull();
    });

    it('returns null when movie_results is not an array', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ movie_results: null }));

      await expect(provider.findMovieByImdbId('tt1')).resolves.toBeNull();
    });

    it('maps a match, including the poster URL', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(
        ok({
          movie_results: [
            {
              id: 603,
              title: 'The Matrix',
              status: 'Released',
              overview: 'Neo',
              release_date: '1999-03-31',
              poster_path: '/abc.jpg',
            },
          ],
        }),
      );

      await expect(provider.findMovieByImdbId('tt0133093')).resolves.toEqual({
        mediaType: 'MOVIE',
        tmdbId: 603,
        imdbId: 'tt0133093',
        title: 'The Matrix',
        status: 'Released',
        overview: 'Neo',
        year: 1999,
        images: [{ coverType: 'poster', url: 'https://image.tmdb.org/t/p/w500/abc.jpg' }],
      });
    });

    it('returns an empty image list when there is no poster', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ movie_results: [{ id: 1, title: 'X' }] }));

      const result = await provider.findMovieByImdbId('tt1');

      expect(result?.images).toEqual([]);
      expect(result?.year).toBeUndefined();
    });
  });

  describe('searchMedia', () => {
    it('returns only TV results when mediaType is TV', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok([{ tvdbId: 1, title: 'Show', status: 'Continuing', network: 'HBO' }]));

      const results = await provider.searchMedia({ term: 'show', mediaType: 'TV' });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ mediaType: 'TV', tvdbId: 1, network: 'HBO' });
      expect(get).toHaveBeenCalledTimes(1);
    });

    it('returns only movie results when mediaType is MOVIE', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ results: [{ id: 603, title: 'The Matrix' }] }));

      const results = await provider.searchMedia({ term: 'matrix', mediaType: 'MOVIE' });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ mediaType: 'MOVIE', tmdbId: 603 });
    });

    describe('unified search (no mediaType)', () => {
      const tvPayload = ok([{ tvdbId: 1, title: 'Show', rating: { count: 5 } }]);
      const moviePayload = ok({ results: [{ id: 2, title: 'Film', popularity: 50 }] });

      it('merges both sources and sorts by popularity descending', async () => {
        const { provider, get } = build();
        get.mockImplementation((url: string) =>
          url.includes('skyhook') ? Promise.resolve(tvPayload) : Promise.resolve(moviePayload),
        );

        const results = await provider.searchMedia({ term: 'x' });

        expect(results.map(r => r.title)).toEqual(['Film', 'Show']);
      });

      it('still returns movie results when the TV source fails', async () => {
        const { provider, get } = build();
        get.mockImplementation((url: string) =>
          url.includes('skyhook')
            ? Promise.reject(new Error('skyhook down'))
            : Promise.resolve(moviePayload),
        );

        const results = await provider.searchMedia({ term: 'x' });

        expect(results.map(r => r.mediaType)).toEqual(['MOVIE']);
        expect(console.error).toHaveBeenCalled();
      });

      it('still returns TV results when the movie source fails', async () => {
        const { provider, get } = build();
        get.mockImplementation((url: string) =>
          url.includes('skyhook')
            ? Promise.resolve(tvPayload)
            : Promise.reject(new Error('tmdb down')),
        );

        const results = await provider.searchMedia({ term: 'x' });

        expect(results.map(r => r.mediaType)).toEqual(['TV']);
      });

      it('returns an empty list when both sources fail', async () => {
        const { provider, get } = build();
        get.mockRejectedValue(new Error('everything down'));

        await expect(provider.searchMedia({ term: 'x' })).resolves.toEqual([]);
      });

      it('logs success rather than failure when both sources succeed', async () => {
        const { provider, get } = build();
        get.mockImplementation((url: string) =>
          url.includes('skyhook') ? Promise.resolve(tvPayload) : Promise.resolve(moviePayload),
        );

        await provider.searchMedia({ term: 'x' });

        expect(console.error).not.toHaveBeenCalled();
      });

      it('treats a missing popularity as zero when sorting', async () => {
        const { provider, get } = build();
        get.mockImplementation((url: string) =>
          url.includes('skyhook')
            ? Promise.resolve(ok([{ tvdbId: 1, title: 'Show', rating: { count: 10 } }]))
            : Promise.resolve(ok({ results: [{ id: 2, title: 'Film' }] })),
        );

        const results = await provider.searchMedia({ term: 'x' });

        expect(results.map(r => r.title)).toEqual(['Show', 'Film']);
      });
    });

    describe('movie search failures', () => {
      it('throws when no TMDB key is configured', async () => {
        const { provider } = buildWithoutKey();

        await expect(
          provider.searchMedia({ term: 'x', mediaType: 'MOVIE' }),
        ).rejects.toThrow('TMDB API Key is missing. Please configure it in settings.');
        expect(console.error).toHaveBeenCalled();
      });

      it('throws when TMDB responds with an error status', async () => {
        const { provider, get } = build();
        get.mockResolvedValue(fail(429, 'rate limited'));

        await expect(
          provider.searchMedia({ term: 'x', mediaType: 'MOVIE' }),
        ).rejects.toThrow('Failed to search movies: 429 rate limited');
      });

      it('tolerates an error body that is absent', async () => {
        const { provider, get } = build();
        get.mockResolvedValue({ ok: false, status: 500, body: undefined, headers: {} });

        await expect(
          provider.searchMedia({ term: 'x', mediaType: 'MOVIE' }),
        ).rejects.toThrow(/Failed to search movies: 500/);
      });

      it('returns an empty list when results is not an array', async () => {
        const { provider, get } = build();
        get.mockResolvedValue(ok({ results: null }));

        await expect(
          provider.searchMedia({ term: 'x', mediaType: 'MOVIE' }),
        ).resolves.toEqual([]);
      });
    });

    it('maps a search result poster into an image entry', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ results: [{ id: 1, title: 'F', poster_path: '/p.jpg' }] }));

      const [result] = await provider.searchMedia({ term: 'x', mediaType: 'MOVIE' });

      expect(result?.images).toEqual([
        { coverType: 'poster', url: 'https://image.tmdb.org/t/p/w500/p.jpg' },
      ]);
    });

    it('leaves the year undefined when a search result has an unparseable date', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ results: [{ id: 1, title: 'F', release_date: 'soon' }] }));

      const [result] = await provider.searchMedia({ term: 'x', mediaType: 'MOVIE' });

      expect(result?.year).toBeUndefined();
    });

    it('derives the year from a search result release date', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ results: [{ id: 1, title: 'F', release_date: '2008-06-27' }] }));

      const [result] = await provider.searchMedia({ term: 'x', mediaType: 'MOVIE' });

      expect(result?.year).toBe(2008);
    });

    // CHARACTERISATION TEST. searchMovies() deliberately computes
    // `tmdbCollectionId: movie.belongs_to_collection?.id ?? undefined`, but every
    // searchMedia() mapping — unified, TV-only and movie-only — rebuilds the
    // result object field by field and omits it. searchMovies is private and
    // called only from searchMedia, so that computation is dead: collection
    // membership never reaches a search-result consumer, though getMovieDetails
    // does surface it on the details path. Pinned so the asymmetry is visible;
    // logged in tech-debt.md rather than "fixed" by widening the mapping, since
    // whether search results should carry collections is a product decision.
    it('drops the collection id from search results despite computing it', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(
        ok({ results: [{ id: 1, title: 'F', belongs_to_collection: { id: 77 } }] }),
      );

      const [result] = await provider.searchMedia({ term: 'x', mediaType: 'MOVIE' });

      expect((result as { tmdbCollectionId?: number }).tmdbCollectionId).toBeUndefined();
    });
  });

  describe('getMediaDetails', () => {
    it('throws when a TV request omits the tvdb id', async () => {
      const { provider } = build();

      await expect(provider.getMediaDetails({ mediaType: 'TV' } as never)).rejects.toThrow(
        'tvdbId is required for TV metadata details',
      );
    });

    it('throws when a movie request omits the tmdb id', async () => {
      const { provider } = build();

      await expect(provider.getMediaDetails({ mediaType: 'MOVIE' } as never)).rejects.toThrow(
        'tmdbId is required for movie metadata details',
      );
    });

    it('maps series details onto the shared media shape', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(
        ok({
          tvdbId: 1,
          title: 'Show',
          status: 'Continuing',
          overview: 'o',
          year: 2019,
          network: 'HBO',
        }),
      );

      await expect(
        provider.getMediaDetails({ mediaType: 'TV', tvdbId: 1 } as never),
      ).resolves.toEqual({
        mediaType: 'TV',
        tvdbId: 1,
        title: 'Show',
        status: 'Continuing',
        overview: 'o',
        year: 2019,
        network: 'HBO',
      });
    });

    it('throws when the movie details key is missing', async () => {
      const { provider } = buildWithoutKey();

      await expect(
        provider.getMediaDetails({ mediaType: 'MOVIE', tmdbId: 1 } as never),
      ).rejects.toThrow('TMDB API Key is missing. Please configure it in settings.');
    });

    it('throws when the movie details request fails', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(fail(404, 'not found'));

      await expect(
        provider.getMediaDetails({ mediaType: 'MOVIE', tmdbId: 1 } as never),
      ).rejects.toThrow('Failed to get movie details: 404 not found');
    });

    it('maps movie details including availability and collection', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(
        ok({
          id: 603,
          imdb_id: 'tt0133093',
          title: 'The Matrix',
          status: 'Released',
          overview: 'Neo',
          release_date: '1999-03-31',
          poster_path: '/abc.jpg',
          belongs_to_collection: { id: 2344 },
        }),
      );

      await expect(
        provider.getMediaDetails({ mediaType: 'MOVIE', tmdbId: 603 } as never),
      ).resolves.toMatchObject({
        mediaType: 'MOVIE',
        tmdbId: 603,
        imdbId: 'tt0133093',
        year: 1999,
        availability: 'released',
        tmdbCollectionId: 2344,
        images: [{ coverType: 'poster', url: 'https://image.tmdb.org/t/p/w500/abc.jpg' }],
      });
    });

    it('omits images and collection when absent', async () => {
      const { provider, get } = build();
      get.mockResolvedValue(ok({ id: 1, title: 'X', status: 'Planned' }));

      const details = await provider.getMediaDetails({
        mediaType: 'MOVIE',
        tmdbId: 1,
      } as never);

      expect(details.images).toEqual([]);
      expect((details as { tmdbCollectionId?: number }).tmdbCollectionId).toBeUndefined();
    });
  });

  describe('getMovieAvailability', () => {
    const provider = new MetadataProvider(
      {} as unknown as HttpClient,
      {} as unknown as SettingsService,
    );
    const PAST = '2000-01-01';
    const FUTURE = '2999-01-01';

    it.each([
      ['streaming', 'streaming'],
      ['Streaming', 'streaming'],
      ['  STREAMING  ', 'streaming'],
    ])('maps status %s to streaming', (status, expected) => {
      expect(provider.getMovieAvailability({ status })).toBe(expected);
    });

    it.each(['released', 'Released', 'digital', 'DIGITAL'])(
      'maps status %s to released',
      status => {
        expect(provider.getMovieAvailability({ status })).toBe('released');
      },
    );

    it.each([
      ['digitalRelease', { digitalRelease: PAST }],
      ['physicalRelease', { physicalRelease: PAST }],
      ['releaseDate', { releaseDate: PAST }],
    ])('treats a past %s as released', (_label, movie) => {
      expect(provider.getMovieAvailability(movie)).toBe('released');
    });

    it('reports in_cinemas when only the cinema date has passed', () => {
      expect(
        provider.getMovieAvailability({ inCinemas: PAST, releaseDate: FUTURE }),
      ).toBe('in_cinemas');
    });

    it('reports announced when every date is in the future', () => {
      expect(
        provider.getMovieAvailability({ inCinemas: FUTURE, releaseDate: FUTURE }),
      ).toBe('announced');
    });

    it('reports announced when there are no dates at all', () => {
      expect(provider.getMovieAvailability({})).toBe('announced');
    });

    it('ignores unparseable dates rather than treating them as released', () => {
      expect(
        provider.getMovieAvailability({ releaseDate: 'not a date' }),
      ).toBe('announced');
    });

    it('ignores an unparseable cinema date', () => {
      expect(provider.getMovieAvailability({ inCinemas: 'not a date' })).toBe('announced');
    });

    it('ignores an unrecognised status and falls through to the dates', () => {
      expect(
        provider.getMovieAvailability({ status: 'Rumored', releaseDate: PAST }),
      ).toBe('released');
    });
  });
});
