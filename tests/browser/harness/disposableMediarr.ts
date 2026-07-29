import { spawn, execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

interface SqliteRunResult {
  lastInsertRowid: number | bigint;
}

interface SqliteStatement {
  run(...parameters: unknown[]): SqliteRunResult;
}

interface SqliteDatabase {
  close(): void;
  pragma(source: string): unknown;
  prepare(source: string): SqliteStatement;
  transaction<TParameters extends unknown[]>(
    callback: (...parameters: TParameters) => void,
  ): (...parameters: TParameters) => void;
}

type SqliteDatabaseConstructor = new (filename: string) => SqliteDatabase;

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3') as SqliteDatabaseConstructor;

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const START_TIMEOUT_MS = 90_000;
const STOP_TIMEOUT_MS = 10_000;

export interface DisposableMediarrPaths {
  root: string;
  config: string;
  data: string;
  database: string;
  movieFile: string;
  episodeFile: string;
  subtitleFile: string;
  backups: string;
}

export interface DisposableMediarr {
  origin: string;
  paths: DisposableMediarrPaths;
  close(): Promise<void>;
}

async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: 0 }, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to allocate a loopback port.'));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(port);
        }
      });
    });
  });
}

async function createRoots(): Promise<DisposableMediarrPaths> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mediarr-browser-'));
  const config = path.join(root, 'config');
  const data = path.join(root, 'data');
  const movieDirectory = path.join(
    data,
    'media',
    'movies',
    'Browser Acceptance Movie (2026)',
  );
  const episodeDirectory = path.join(
    data,
    'media',
    'tv',
    'Browser Acceptance Series',
    'Season 01',
  );
  const movieFile = path.join(
    movieDirectory,
    'Browser Acceptance Movie (2026).mp4',
  );
  const episodeFile = path.join(
    episodeDirectory,
    'Browser Acceptance Series - S01E01.mp4',
  );
  const subtitleFile = path.join(
    movieDirectory,
    'Browser Acceptance Movie (2026).en.srt',
  );
  const backups = path.join(config, 'backups');

  await Promise.all([
    mkdir(config, { recursive: true }),
    mkdir(backups, { recursive: true }),
    mkdir(path.join(data, 'downloads', 'incomplete'), { recursive: true }),
    mkdir(path.join(data, 'downloads', 'complete'), { recursive: true }),
    mkdir(movieDirectory, { recursive: true }),
    mkdir(episodeDirectory, { recursive: true }),
  ]);

  return {
    root,
    config,
    data,
    database: path.join(config, 'mediarr.db'),
    movieFile,
    episodeFile,
    subtitleFile,
    backups,
  };
}

async function createMediaFixtures(paths: DisposableMediarrPaths): Promise<void> {
  await execFileAsync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=duration=2:size=320x240:rate=24',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      paths.movieFile,
    ],
    { timeout: 30_000 },
  );
  await copyFile(paths.movieFile, paths.episodeFile);
  await writeFile(
    paths.subtitleFile,
    [
      '1',
      '00:00:00,000 --> 00:00:01,500',
      'Browser acceptance subtitle',
      '',
    ].join('\n'),
  );
}

async function seedDatabase(paths: DisposableMediarrPaths): Promise<void> {
  const databaseUrl = `file:${paths.database}`;
  await execFileAsync(
    path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx'),
    ['scripts/run-migrations.ts'],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DOTENV_CONFIG_PATH: '/dev/null',
      },
      timeout: 60_000,
    },
  );

  const database = new Database(paths.database);
  const now = Math.floor(Date.now() / 1000);
  const movieSize = (await stat(paths.movieFile)).size;

  try {
    database.pragma('foreign_keys = ON');
    const seed = database.transaction((resolvedMovieSize: number) => {
      const qualityProfile = database
        .prepare(
          'INSERT INTO QualityProfile (name, cutoff, items) VALUES (?, ?, ?)',
        )
        .run('Browser Acceptance', 0, '[]');
      const qualityProfileId = Number(qualityProfile.lastInsertRowid);

      const collection = database
        .prepare(
          `INSERT INTO Collection (
            tmdbCollectionId, name, overview, monitored, qualityProfileId,
            rootFolderPath, addMoviesAutomatically, searchOnAdd,
            minimumAvailability, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          990_000_001,
          'Browser Acceptance Collection',
          'A deterministic local collection used by production-browser tests.',
          1,
          qualityProfileId,
          path.join(paths.data, 'media', 'movies'),
          0,
          0,
          'released',
          now,
          now,
        );
      const collectionId = Number(collection.lastInsertRowid);

      const movieMedia = database
        .prepare(
          `INSERT INTO Media (
            mediaType, tmdbId, title, cleanTitle, sortTitle, status, overview,
            monitored, qualityProfileId, path, year, added,
            minimumAvailability
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'MOVIE',
          990_000_002,
          'Browser Acceptance Movie',
          'browser acceptance movie',
          'Browser Acceptance Movie',
          'released',
          'A real local movie fixture served by the Mediarr daemon.',
          1,
          qualityProfileId,
          path.dirname(paths.movieFile),
          2026,
          now,
          'released',
        );
      const movieMediaId = Number(movieMedia.lastInsertRowid);

      const movie = database
        .prepare(
          `INSERT INTO Movie (
            mediaId, tmdbId, title, cleanTitle, sortTitle, status, overview,
            monitored, qualityProfileId, path, year, added,
            minimumAvailability, collectionId
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          movieMediaId,
          990_000_002,
          'Browser Acceptance Movie',
          'browser acceptance movie',
          'Browser Acceptance Movie',
          'released',
          'A real local movie fixture served by the Mediarr daemon.',
          1,
          qualityProfileId,
          path.dirname(paths.movieFile),
          2026,
          now,
          'released',
          collectionId,
        );
      const movieId = Number(movie.lastInsertRowid);

      const seriesMedia = database
        .prepare(
          `INSERT INTO Media (
            mediaType, tvdbId, title, cleanTitle, sortTitle, status, overview,
            monitored, qualityProfileId, path, year, added, network
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'TV',
          990_000_003,
          'Browser Acceptance Series',
          'browser acceptance series',
          'Browser Acceptance Series',
          'continuing',
          'A real local series fixture served by the Mediarr daemon.',
          1,
          qualityProfileId,
          path.join(paths.data, 'media', 'tv', 'Browser Acceptance Series'),
          2026,
          now,
          'Local Fixture Network',
        );
      const seriesMediaId = Number(seriesMedia.lastInsertRowid);

      const series = database
        .prepare(
          `INSERT INTO Series (
            mediaId, tvdbId, title, cleanTitle, sortTitle, status, overview,
            monitored, qualityProfileId, path, year, network, added
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          seriesMediaId,
          990_000_003,
          'Browser Acceptance Series',
          'browser acceptance series',
          'Browser Acceptance Series',
          'continuing',
          'A real local series fixture served by the Mediarr daemon.',
          1,
          qualityProfileId,
          path.join(paths.data, 'media', 'tv', 'Browser Acceptance Series'),
          2026,
          'Local Fixture Network',
          now,
        );
      const seriesId = Number(series.lastInsertRowid);

      const season = database
        .prepare(
          'INSERT INTO Season (seriesId, seasonNumber, monitored) VALUES (?, ?, ?)',
        )
        .run(seriesId, 1, 1);
      const seasonId = Number(season.lastInsertRowid);

      const episode = database
        .prepare(
          `INSERT INTO Episode (
            seriesId, seasonId, tvdbId, seasonNumber, episodeNumber, title,
            airDateUtc, overview, monitored, path
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          seriesId,
          seasonId,
          990_000_004,
          1,
          1,
          'The Browser Pilot',
          now - 86_400,
          'A deterministic episode with a real playable file.',
          1,
          paths.episodeFile,
        );
      const episodeId = Number(episode.lastInsertRowid);

      const movieVariant = database
        .prepare(
          `INSERT INTO MediaFileVariant (
            mediaType, movieId, path, fileSize, monitored, releaseName, quality,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'MOVIE',
          movieId,
          paths.movieFile,
          resolvedMovieSize,
          1,
          'Browser.Acceptance.Movie.2026.720p',
          'HDTV-720p',
          now,
          now,
        );
      const movieVariantId = Number(movieVariant.lastInsertRowid);

      database
        .prepare(
          `INSERT INTO MediaFileVariant (
            mediaType, episodeId, path, fileSize, monitored, releaseName,
            quality, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'EPISODE',
          episodeId,
          paths.episodeFile,
          resolvedMovieSize,
          1,
          'Browser.Acceptance.Series.S01E01.720p',
          'HDTV-720p',
          now,
          now,
        );

      database
        .prepare(
          `INSERT INTO VariantSubtitleTrack (
            variantId, source, languageCode, isForced, isHi, codec, filePath,
            fileSize
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          movieVariantId,
          'EXTERNAL',
          'en',
          0,
          0,
          'subrip',
          paths.subtitleFile,
          79,
        );

      const wantedSubtitle = database
        .prepare(
          `INSERT INTO WantedSubtitle (
            variantId, languageCode, isForced, isHi, state, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(movieVariantId, 'th', 0, 0, 'PENDING', now, now);

      database
        .prepare(
          `INSERT INTO SubtitleHistory (
            variantId, wantedSubtitleId, languageCode, provider, score,
            storedPath, message, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          movieVariantId,
          Number(wantedSubtitle.lastInsertRowid),
          'th',
          'local-fixture',
          100,
          null,
          'Waiting for deterministic browser workflow.',
          now,
        );

      database
        .prepare(
          `INSERT INTO Torrent (
            infoHash, name, status, progress, downloadSpeed, uploadSpeed, eta,
            size, downloaded, uploaded, ratio, path, added, movieId
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          '0123456789abcdef0123456789abcdef01234567',
          'Browser Acceptance Queue Item',
          'DOWNLOADING',
          0.42,
          1_048_576,
          0,
          120,
          100_000_000,
          42_000_000,
          0,
          0,
          path.join(paths.data, 'downloads', 'incomplete'),
          now,
          movieId,
        );

      database
        .prepare(
          `INSERT INTO ActivityEvent (
            eventType, sourceModule, entityRef, summary, success, details,
            occurredAt, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'import.completed',
          'BrowserAcceptanceHarness',
          `movie:${movieId}`,
          'Imported Browser Acceptance Movie',
          1,
          JSON.stringify({ source: 'local-fixture' }),
          now,
          now,
        );

      database
        .prepare(
          `INSERT INTO TaskExecution (
            taskName, startedAt, completedAt, status, durationMs, errorMessage
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run('library-scan', now - 60, now - 59, 'SUCCESS', 1_000, null);

      database
        .prepare(
          `INSERT INTO PlaybackProgress (
            mediaType, mediaId, userId, position, duration, progress, isWatched,
            lastWatched, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'MOVIE',
          movieId,
          'browser-acceptance',
          30,
          120,
          0.25,
          0,
          now,
          now,
          now,
        );

      const settings = {
        torrentLimits: {
          maxActiveDownloads: 3,
          maxActiveSeeds: 3,
          globalDownloadLimitKbps: null,
          globalUploadLimitKbps: null,
          incompleteDirectory: path.join(paths.data, 'downloads', 'incomplete'),
          completeDirectory: path.join(paths.data, 'downloads', 'complete'),
          seedRatioLimit: 0,
          seedTimeLimitMinutes: 0,
          seedLimitAction: 'pause',
        },
        schedulerIntervals: {
          rssSyncMinutes: 15,
          availabilityCheckMinutes: 30,
          torrentMonitoringSeconds: 5,
          wantedSearchMinutes: 60,
        },
        pathVisibility: {
          showDownloadPath: true,
          showMediaPath: true,
        },
        apiKeys: {
          tmdbApiKey: null,
          openSubtitlesApiKey: null,
          assrtApiToken: null,
          subdlApiKey: null,
        },
        wantedLanguages: ['en'],
        host: {
          bindAddress: '127.0.0.1',
          port: 0,
          urlBase: '',
          sslPort: 0,
          enableSsl: false,
          sslCertPath: null,
          sslKeyPath: null,
        },
        security: {
          authenticationRequired: false,
          authenticationMethod: 'none',
          apiKey: null,
        },
        logging: {
          logLevel: 'info',
          logSizeLimit: 1_048_576,
          logRetentionDays: 30,
        },
        update: {
          branch: 'master',
          autoUpdateEnabled: false,
          mechanicsEnabled: false,
          updateScriptPath: null,
          setupCompleted: true,
        },
        mediaManagement: {
          movieRootFolder: path.join(paths.data, 'media', 'movies'),
          tvRootFolder: path.join(paths.data, 'media', 'tv'),
          movieNamingPattern: '{Movie.Title}.{Release.Year}.{Quality.Full}',
          seriesNamingPattern: '{Series.Title}.S{season:00}E{episode:00}',
        },
        streaming: {
          discoveryEnabled: false,
          discoveryServiceName: 'Mediarr Browser Acceptance',
          defaultUserId: 'browser-acceptance',
          watchedThreshold: 0.9,
          subtitleDirectory: path.join(paths.data, 'subtitles'),
        },
      };

      database
        .prepare(
          `INSERT INTO AppSettings (
            id, torrentLimits, schedulerIntervals, pathVisibility, apiKeys,
            host, security, logging, "update", mediaManagement, streaming,
            schedulerState, schedulerEnabled, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          1,
          JSON.stringify(settings.torrentLimits),
          JSON.stringify(settings.schedulerIntervals),
          JSON.stringify(settings.pathVisibility),
          JSON.stringify(settings.apiKeys),
          JSON.stringify(settings.host),
          JSON.stringify(settings.security),
          JSON.stringify(settings.logging),
          JSON.stringify({
            ...settings.update,
            wantedLanguages: settings.wantedLanguages,
          }),
          JSON.stringify(settings.mediaManagement),
          JSON.stringify(settings.streaming),
          JSON.stringify({
            'library-scan': new Date((now + 3_600) * 1_000).toISOString(),
          }),
          JSON.stringify({
            'library-scan': true,
            'rss-sync': true,
            'wanted-search': true,
          }),
          now,
          now,
        );
    });

    seed(movieSize);
  } finally {
    database.close();
  }
}

async function waitForExit(
  child: ReturnType<typeof spawn>,
  timeoutMs: number,
): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return true;
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), timeoutMs);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
}

async function waitForReady(
  origin: string,
  child: ReturnType<typeof spawn>,
  readLogs: () => string,
): Promise<void> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `Mediarr daemon exited before becoming ready.\n${readLogs()}`,
      );
    }

    try {
      const response = await fetch(`${origin}/api/system/status`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Startup is asynchronous; the final timeout includes daemon logs.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Mediarr daemon did not become ready within ${START_TIMEOUT_MS}ms.\n${readLogs()}`,
  );
}

/**
 * Starts the production Bun daemon and built SPA against disposable, seeded
 * storage. The returned close method always removes the complete temp root.
 */
export async function startDisposableMediarr(): Promise<DisposableMediarr> {
  const staticDir = path.join(REPO_ROOT, 'app', 'dist');
  const distIndex = path.join(staticDir, 'index.html');
  try {
    await stat(distIndex);
  } catch {
    throw new Error(
      `Built SPA not found at ${distIndex}. Run "npm run build --workspace=app" first.`,
    );
  }

  const paths = await createRoots();
  let child: ReturnType<typeof spawn> | undefined;
  let closed = false;

  try {
    await createMediaFixtures(paths);
    await seedDatabase(paths);

    const port = await findAvailablePort();
    const origin = `http://127.0.0.1:${port}`;
    const logs: string[] = [];
    child = spawn(
      path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx'),
      ['server/src/main.ts'],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          API_HOST: '127.0.0.1',
          API_PORT: String(port),
          DATABASE_URL: `file:${paths.database}`,
          CONFIG_DIR: paths.config,
          MEDIA_DIR: paths.data,
          BACKUP_DIR: paths.backups,
          STATIC_DIR: staticDir,
          DEFINITIONS_PATH: path.join(REPO_ROOT, 'server', 'definitions'),
          ENCRYPTION_KEY: 'browser-acceptance-local-key',
          JELLYFIN_ENABLED: 'false',
          OPENROUTER_API_KEY: '',
          TMDB_API_KEY: '',
          OPENSUBTITLES_API_KEY: '',
          ASSRT_API_TOKEN: '',
          SUBDL_API_KEY: '',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    child.stdout?.on('data', (chunk: Buffer) => logs.push(chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => logs.push(chunk.toString()));

    await waitForReady(origin, child, () => logs.join(''));

    return {
      origin,
      paths,
      async close(): Promise<void> {
        if (closed) {
          return;
        }
        closed = true;
        if (child && child.exitCode === null && child.signalCode === null) {
          child.kill('SIGTERM');
          if (!(await waitForExit(child, STOP_TIMEOUT_MS))) {
            child.kill('SIGKILL');
            await waitForExit(child, STOP_TIMEOUT_MS);
          }
        }
        await rm(paths.root, { recursive: true, force: true });
      },
    };
  } catch (error) {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await waitForExit(child, STOP_TIMEOUT_MS);
    }
    await rm(paths.root, { recursive: true, force: true });
    throw error;
  }
}
