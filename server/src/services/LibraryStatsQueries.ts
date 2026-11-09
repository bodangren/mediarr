import { buildQualityBreakdown, type QualityBreakdown } from './libraryQuality';

export interface LibraryStatsFast {
  library: {
    totalMovies: number;
    totalSeries: number;
    totalEpisodes: number;
    monitoredMovies: number;
    monitoredSeries: number;
    monitoredEpisodes: number;
  };
  files: {
    totalFiles: number;
    totalSizeBytes: number;
    movieFiles: number;
    movieSizeBytes: number;
    episodeFiles: number;
    episodeSizeBytes: number;
  };
  quality: {
    movies: QualityBreakdown;
    episodes: QualityBreakdown;
  };
  missing: { movies: number; episodes: number };
  activity: {
    downloadsThisWeek: number;
    downloadsThisMonth: number;
    searchesThisWeek: number;
    subtitlesThisWeek: number;
  };
}

export interface SqliteLike {
  prepare(sql: string): { get(...parameters: unknown[]): unknown; all(...parameters: unknown[]): unknown[] };
}

function count(sqlite: SqliteLike, sql: string, ...parameters: unknown[]): number {
  const row = sqlite.prepare(sql).get(...parameters) as { c?: number } | undefined;
  return Number(row?.c ?? 0);
}

/**
 * Fast `GET /api/system/stats` path.
 *
 * The Prisma-style shim counts by loading whole tables into JS (including relation resolution), so the
 * dashboard stats route took ~11 s and blocked the event loop on every refresh. These are the same
 * numbers as indexed SQL aggregates: measured < 100 ms on the live 4,331-episode library.
 *
 * Timestamps are compared in seconds because the schema stores `occurredAt`/`airDateUtc` via
 * date-mode integer columns (strftime seconds).
 */
export function readLibraryStats(sqlite: SqliteLike, now: Date = new Date()): LibraryStatsFast {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const weekAgoSeconds = nowSeconds - 7 * 24 * 60 * 60;
  const monthAgoSeconds = nowSeconds - 30 * 24 * 60 * 60;

  const movieVariants = sqlite
    .prepare('SELECT quality FROM "MediaFileVariant" WHERE mediaType = ?')
    .all('MOVIE') as Array<{ quality: string | null }>;
  const episodeVariants = sqlite
    .prepare('SELECT quality FROM "MediaFileVariant" WHERE mediaType = ?')
    .all('EPISODE') as Array<{ quality: string | null }>;

  const movieSize = sqlite
    .prepare('SELECT SUM(fileSize) AS c FROM "MediaFileVariant" WHERE mediaType = ?')
    .get('MOVIE') as { c?: number } | undefined;
  const episodeSize = sqlite
    .prepare('SELECT SUM(fileSize) AS c FROM "MediaFileVariant" WHERE mediaType = ?')
    .get('EPISODE') as { c?: number } | undefined;

  const downloadsThisWeek = count(
    sqlite,
    'SELECT count(*) AS c FROM "ActivityEvent" WHERE eventType IN (?, ?) AND occurredAt >= ?',
    'RELEASE_GRABBED', 'IMPORT_COMPLETED', weekAgoSeconds,
  );
  const downloadsThisMonth = count(
    sqlite,
    'SELECT count(*) AS c FROM "ActivityEvent" WHERE eventType IN (?, ?) AND occurredAt >= ?',
    'RELEASE_GRABBED', 'IMPORT_COMPLETED', monthAgoSeconds,
  );
  const searchesThisWeek = count(
    sqlite,
    'SELECT count(*) AS c FROM "ActivityEvent" WHERE eventType = ? AND occurredAt >= ?',
    'SEARCH_EXECUTED', weekAgoSeconds,
  );
  const subtitlesThisWeek = count(
    sqlite,
    'SELECT count(*) AS c FROM "ActivityEvent" WHERE eventType = ? AND occurredAt >= ?',
    'SUBTITLE_DOWNLOADED', weekAgoSeconds,
  );

  return {
    library: {
      totalMovies: count(sqlite, 'SELECT count(*) AS c FROM "Movie"'),
      totalSeries: count(sqlite, 'SELECT count(*) AS c FROM "Series"'),
      totalEpisodes: count(sqlite, 'SELECT count(*) AS c FROM "Episode"'),
      monitoredMovies: count(sqlite, 'SELECT count(*) AS c FROM "Movie" WHERE monitored = 1'),
      monitoredSeries: count(sqlite, 'SELECT count(*) AS c FROM "Series" WHERE monitored = 1'),
      monitoredEpisodes: count(sqlite, 'SELECT count(*) AS c FROM "Episode" WHERE monitored = 1'),
    },
    files: {
      totalFiles: movieVariants.length + episodeVariants.length,
      totalSizeBytes: Number(movieSize?.c ?? 0) + Number(episodeSize?.c ?? 0),
      movieFiles: movieVariants.length,
      movieSizeBytes: Number(movieSize?.c ?? 0),
      episodeFiles: episodeVariants.length,
      episodeSizeBytes: Number(episodeSize?.c ?? 0),
    },
    quality: {
      movies: buildQualityBreakdown(movieVariants),
      episodes: buildQualityBreakdown(episodeVariants),
    },
    missing: {
      movies: count(
        sqlite,
        'SELECT count(*) AS c FROM "Movie" m WHERE m.monitored = 1 AND NOT EXISTS (SELECT 1 FROM "MediaFileVariant" v WHERE v.movieId = m.id)',
      ),
      episodes: count(
        sqlite,
        'SELECT count(*) AS c FROM "Episode" e WHERE e.monitored = 1 AND e.airDateUtc <= ? AND NOT EXISTS (SELECT 1 FROM "MediaFileVariant" v WHERE v.episodeId = e.id)',
        nowSeconds,
      ),
    },
    activity: {
      downloadsThisWeek,
      downloadsThisMonth,
      searchesThisWeek,
      subtitlesThisWeek,
    },
  };
}
