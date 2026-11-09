import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { readLibraryStats } from './LibraryStatsQueries';

function seed(): ReturnType<typeof Database> {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE "Movie" (id INTEGER PRIMARY KEY, monitored INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE "Series" (id INTEGER PRIMARY KEY, monitored INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE "Episode" (id INTEGER PRIMARY KEY, monitored INTEGER NOT NULL DEFAULT 1, airDateUtc INTEGER);
    CREATE TABLE "MediaFileVariant" (id INTEGER PRIMARY KEY, mediaType TEXT NOT NULL, movieId INTEGER, episodeId INTEGER, fileSize INTEGER NOT NULL, quality TEXT);
    CREATE TABLE "ActivityEvent" (id INTEGER PRIMARY KEY, eventType TEXT NOT NULL, occurredAt INTEGER NOT NULL);
  `);
  const now = Math.floor(Date.UTC(2026, 10, 9, 10, 0, 0) / 1000);
  db.prepare('INSERT INTO "Movie" (id, monitored) VALUES (1, 1), (2, 0)').run();
  db.prepare('INSERT INTO "Series" (id, monitored) VALUES (1, 1)').run();
  db.prepare('INSERT INTO "Episode" (id, monitored, airDateUtc) VALUES (1, 1, ?), (2, 1, ?), (3, 0, ?)')
    .run(now - 86400, now - 86400, now - 86400);
  db.prepare(`INSERT INTO "MediaFileVariant" (mediaType, movieId, episodeId, fileSize, quality) VALUES
    ('MOVIE', 1, NULL, 1000, 'WEBDL-1080p'),
    ('MOVIE', 1, NULL, 500, 'Bluray-2160p'),
    ('EPISODE', NULL, 1, 300, NULL)`)
    .run();
  db.prepare('INSERT INTO "ActivityEvent" (eventType, occurredAt) VALUES (?, ?), (?, ?), (?, ?), (?, ?)')
    .run('SEARCH_EXECUTED', now - 86400, 'SUBTITLE_DOWNLOADED', now - 86400,
         'RELEASE_GRABBED', now - 86400, 'SEARCH_EXECUTED', now - 40 * 86400);
  return db;
}

describe('readLibraryStats', () => {
  it('computes the same numbers as the shim but with SQL aggregates', () => {
    const db = seed();
    try {
      const stats = readLibraryStats(db, new Date(Date.UTC(2026, 10, 9, 10, 0, 0)));
      expect(stats.library).toEqual({
        totalMovies: 2, totalSeries: 1, totalEpisodes: 3,
        monitoredMovies: 1, monitoredSeries: 1, monitoredEpisodes: 2,
      });
      expect(stats.files).toEqual({
        totalFiles: 3, totalSizeBytes: 1800,
        movieFiles: 2, movieSizeBytes: 1500,
        episodeFiles: 1, episodeSizeBytes: 300,
      });
      expect(stats.quality.movies).toEqual({ uhd4k: 1, hd1080p: 1, hd720p: 0, sd: 0, unknown: 0 });
      expect(stats.quality.episodes).toEqual({ uhd4k: 0, hd1080p: 0, hd720p: 0, sd: 0, unknown: 1 });
      // Movie 1 has variants; episodes 1 has one, episode 2 has none -> 1 missing.
      expect(stats.missing).toEqual({ movies: 0, episodes: 1 });
      expect(stats.activity).toEqual({
        downloadsThisWeek: 1, downloadsThisMonth: 1, searchesThisWeek: 1, subtitlesThisWeek: 1,
      });
    } finally {
      db.close();
    }
  });
});
