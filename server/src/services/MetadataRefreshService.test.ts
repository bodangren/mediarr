import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import type { HttpClient } from '../indexers/HttpClient';
import type { SettingsService } from './SettingsService';
import { MetadataProvider } from './MetadataProvider';
import { MetadataRefreshService } from './MetadataRefreshService';

const TMDB_POSTER_PATH = '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg';
const TMDB_BACKDROP_PATH = '/ncEsesgOJDNrTUED89hYbA117wo.jpg';
const SKYHOOK_POSTER_URL = 'https://artworks.thetvdb.com/banners/posters/275274-3.jpg';
const SKYHOOK_FANART_URL = 'https://artworks.thetvdb.com/banners/fanart/original/275274-1.jpg';

const ok = (body: unknown) => ({ ok: true, status: 200, body: JSON.stringify(body), headers: {} });
const fail = (status: number, body = 'upstream said no') => ({
  ok: false,
  status,
  body,
  headers: {},
});

function makeHttpClient(handler: (url: string) => { ok: boolean; status: number; body: string; headers: Record<string, never> }) {
  const get = vi.fn().mockImplementation((url: string) => Promise.resolve(handler(url)));
  return { client: { get } as unknown as HttpClient, get };
}

function makeSettings(tmdbApiKey: string | undefined = 'tmdb-key') {
  return {
    get: vi.fn().mockResolvedValue({ apiKeys: { tmdbApiKey } }),
  } as unknown as SettingsService;
}

function tmdbMoviePayload() {
  return {
    id: 603,
    title: 'The Matrix',
    overview: 'A computer hacker learns about the true nature of reality.',
    poster_path: TMDB_POSTER_PATH,
    backdrop_path: TMDB_BACKDROP_PATH,
  };
}

function skyhookSeriesPayload() {
  return {
    tvdbId: 275274,
    title: 'Rick and Morty',
    overview: 'An alcoholic scientist and his grandson travel across dimensions.',
    images: [
      { coverType: 'poster', url: SKYHOOK_POSTER_URL },
      { coverType: 'fanart', url: SKYHOOK_FANART_URL },
      { coverType: 'banner', url: 'https://artworks.thetvdb.com/banners/graphical/275274-g.jpg' },
    ],
    episodes: [],
  };
}

/**
 * Real SQLite (in-memory) with the full schema applied by replaying the
 * checked-in Drizzle migrations. The service reads through the Drizzle schema,
 * which emits every column, so a hand-trimmed table definition would drift.
 */
function makeDb() {
  const sqlite = new Database(':memory:');
  const root = path.resolve(import.meta.dirname, '../../..');
  const journal = JSON.parse(
    fs.readFileSync(path.join(root, 'drizzle', 'meta', '_journal.json'), 'utf8'),
  ) as { entries: Array<{ tag: string }> };
  for (const entry of journal.entries) {
    const sql = fs.readFileSync(path.join(root, 'drizzle', `${entry.tag}.sql`), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) {
        sqlite.exec(trimmed);
      }
    }
  }
  sqlite.exec(
    `INSERT INTO "QualityProfile" (id, name, cutoff, items) VALUES (1, 'Any', 0, '[]')`,
  );
  return drizzle(sqlite, { schema }) as BetterSQLite3Database<typeof schema>;
}

type Db = ReturnType<typeof makeDb>;

function insertMovie(db: Db, values: { id?: number; posterUrl?: string | null; backdropUrl?: string | null; overview?: string | null }) {
  db.insert(schema.movies)
    .values({
      tmdbId: 603,
      title: 'The Matrix',
      cleanTitle: 'thematrix',
      sortTitle: 'matrix',
      status: 'released',
      year: 1999,
      qualityProfileId: 1,
      ...values,
    })
    .run();
}

function insertSeries(db: Db, values: { id?: number; tvdbId?: number; posterUrl?: string | null; backdropUrl?: string | null; overview?: string | null }) {
  db.insert(schema.series)
    .values({
      tvdbId: 275274,
      title: 'Rick and Morty',
      cleanTitle: 'rickandmorty',
      sortTitle: 'rick and morty',
      status: 'continuing',
      year: 2013,
      qualityProfileId: 1,
      ...values,
    })
    .run();
}

const getMovieRow = (db: Db, id: number) =>
  db.select().from(schema.movies).where(eq(schema.movies.id, id)).get();
const getSeriesRow = (db: Db, id: number) =>
  db.select().from(schema.series).where(eq(schema.series.id, id)).get();

describe('MetadataRefreshService', () => {
  let db: Db;
  let get: ReturnType<typeof makeHttpClient>['get'];
  let service: MetadataRefreshService;

  const build = (handler: Parameters<typeof makeHttpClient>[0], tmdbApiKey?: string) => {
    db = makeDb();
    const http = makeHttpClient(handler);
    get = http.get;
    const provider = new MetadataProvider(http.client, makeSettings(tmdbApiKey));
    service = new MetadataRefreshService({ drizzle: db } as any, provider);
  };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('refreshAll', () => {
    it('populates missing posterUrl, backdropUrl, and overview with full TMDB/SkyHook URLs', async () => {
      build((url) => {
        if (url.includes('api.themoviedb.org')) {
          expect(url).toContain('/movie/603?');
          return ok(tmdbMoviePayload());
        }
        if (url.includes('skyhook.sonarr.tv')) {
          expect(url).toContain('/tvdb/shows/en/275274');
          return ok(skyhookSeriesPayload());
        }
        return fail(404);
      });
      insertMovie(db, {});
      insertSeries(db, {});

      const summary = await service.refreshAll();

      expect(summary).toMatchObject({
        moviesScanned: 1,
        seriesScanned: 1,
        moviesRefreshed: 1,
        seriesRefreshed: 1,
        failures: 0,
      });

      const movie = getMovieRow(db, 1);
      expect(movie?.posterUrl).toBe(`https://image.tmdb.org/t/p/w500${TMDB_POSTER_PATH}`);
      expect(movie?.backdropUrl).toBe(`https://image.tmdb.org/t/p/w1280${TMDB_BACKDROP_PATH}`);
      expect(movie?.overview).toBe('A computer hacker learns about the true nature of reality.');

      const series = getSeriesRow(db, 1);
      expect(series?.posterUrl).toBe(SKYHOOK_POSTER_URL);
      expect(series?.backdropUrl).toBe(SKYHOOK_FANART_URL);
      expect(series?.overview).toBe('An alcoholic scientist and his grandson travel across dimensions.');
    });

    it('is a no-op for items that already have every field populated', async () => {
      build(() => fail(500));
      insertMovie(db, {
        posterUrl: 'https://image.tmdb.org/t/p/w500/existing.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/w1280/existing.jpg',
        overview: 'Existing overview.',
      });
      insertSeries(db, {
        posterUrl: SKYHOOK_POSTER_URL,
        backdropUrl: SKYHOOK_FANART_URL,
        overview: 'Existing overview.',
      });

      const summary = await service.refreshAll();

      expect(summary).toMatchObject({
        moviesScanned: 0,
        seriesScanned: 0,
        moviesRefreshed: 0,
        seriesRefreshed: 0,
        failures: 0,
      });
      expect(get).not.toHaveBeenCalled();
    });

    it('keeps partially populated items in the refresh set and only fills the missing fields', async () => {
      build((url) => (url.includes('api.themoviedb.org') ? ok(tmdbMoviePayload()) : fail(404)));
      insertMovie(db, {
        posterUrl: 'https://image.tmdb.org/t/p/w500/keep-me.jpg',
        overview: 'Keep this overview.',
      });

      await service.refreshAll();

      const movie = getMovieRow(db, 1);
      expect(movie?.posterUrl).toBe('https://image.tmdb.org/t/p/w500/keep-me.jpg');
      expect(movie?.overview).toBe('Keep this overview.');
      expect(movie?.backdropUrl).toBe(`https://image.tmdb.org/t/p/w1280${TMDB_BACKDROP_PATH}`);
    });

    it('survives a TMDB failure: counts the failure, refreshes the series, and leaves the movie row untouched', async () => {
      build((url) => {
        if (url.includes('api.themoviedb.org')) {
          return fail(401, 'Invalid API key: You must be granted a valid key.');
        }
        if (url.includes('skyhook.sonarr.tv')) {
          return ok(skyhookSeriesPayload());
        }
        return fail(404);
      });
      insertMovie(db, {});
      insertSeries(db, {});

      const summary = await service.refreshAll();

      expect(summary).toMatchObject({
        moviesScanned: 1,
        seriesScanned: 1,
        moviesRefreshed: 0,
        seriesRefreshed: 1,
        failures: 1,
      });
      expect(getMovieRow(db, 1)).toMatchObject({ posterUrl: null, backdropUrl: null, overview: null });
      expect(getSeriesRow(db, 1)?.posterUrl).toBe(SKYHOOK_POSTER_URL);
    });

    it('survives a thrown transport error and reports two failures when both providers are down', async () => {
      build(() => {
        throw new Error('fetch crashed');
      });
      insertMovie(db, {});
      insertSeries(db, {});

      const summary = await service.refreshAll();

      expect(summary.failures).toBe(2);
      expect(summary.moviesRefreshed).toBe(0);
      expect(summary.seriesRefreshed).toBe(0);
    });

    it('counts an item as refreshed even when the provider returns no artwork', async () => {
      build((url) => {
        if (url.includes('api.themoviedb.org')) {
          return ok({ id: 603, poster_path: null, backdrop_path: null, overview: '' });
        }
        if (url.includes('skyhook.sonarr.tv')) {
          return ok({ tvdbId: 275274, images: [], episodes: [] });
        }
        return fail(404);
      });
      insertMovie(db, {});
      insertSeries(db, {});

      const summary = await service.refreshAll();

      expect(summary).toMatchObject({
        moviesScanned: 1,
        seriesScanned: 1,
        moviesRefreshed: 0,
        seriesRefreshed: 0,
        failures: 0,
      });
    });
  });

  describe('refreshMovie', () => {
    it('throws for an unknown movie id', async () => {
      build(() => ok(tmdbMoviePayload()));
      await expect(service.refreshMovie(999)).rejects.toThrow('Movie 999 not found');
    });

    it('rejects when TMDB is unreachable so callers can see the cause', async () => {
      build(() => fail(401, 'Invalid API key'));
      insertMovie(db, {});

      await expect(service.refreshMovie(1)).rejects.toThrow('Failed to get movie artwork');
    });
  });

  describe('refreshSeries', () => {
    it('throws for an unknown series id', async () => {
      build(() => ok(skyhookSeriesPayload()));
      await expect(service.refreshSeries(999)).rejects.toThrow('Series 999 not found');
    });
  });
});
