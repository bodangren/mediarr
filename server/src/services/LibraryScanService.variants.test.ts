import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseClient } from '../db/drizzleClient';
import { PlaybackRepository } from '../repositories/PlaybackRepository';
import { LibraryScanService } from './LibraryScanService';
import { PlaybackService } from './PlaybackService';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle');

function applyMigrations(client: DatabaseClient): void {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const contents = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of contents.split('--> statement-breakpoint')) {
      if (statement.trim()) client.sqlite.exec(statement.trim());
    }
  }
}

const MOVIE_ID = 11;
const PRELINKED_MOVIE_ID = 12;
const MISSING_MOVIE_ID = 13;
const EPISODE_ID = 21;
const MISSING_EPISODE_ID = 22;

describe('LibraryScanService creates playable MediaFileVariant rows', () => {
  let client: DatabaseClient;
  let scanService: LibraryScanService;
  let playbackService: PlaybackService;
  let tmpRoot: string;
  let movieRoot: string;
  let tvRoot: string;
  let scanTargetFile: string;
  let prelinkedMovieFile: string;
  let episodeFile: string;

  beforeAll(() => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client);
    // Test fixtures reference a quality profile row that does not exist.
    client.sqlite.exec('PRAGMA foreign_keys = OFF;');
    scanService = new LibraryScanService(client);

    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mediarr-scan-variants-'));
    movieRoot = path.join(tmpRoot, 'movies');
    tvRoot = path.join(tmpRoot, 'tv');
    fs.mkdirSync(movieRoot, { recursive: true });
    fs.mkdirSync(path.join(tvRoot, 'Show', 'Season 01'), { recursive: true });

    scanTargetFile = path.join(movieRoot, 'Scan Target (2020).mkv');
    prelinkedMovieFile = path.join(movieRoot, 'Prelinked Movie (2019).mkv');
    episodeFile = path.join(tvRoot, 'Show', 'Season 01', 'Show - S01E01 - Pilot.mkv');
    fs.writeFileSync(scanTargetFile, 'scan-target-bytes');
    fs.writeFileSync(prelinkedMovieFile, 'prelinked-bytes');
    fs.writeFileSync(episodeFile, 'episode-bytes');
    // Sidecar subtitles next to the linked videos.
    fs.writeFileSync(path.join(movieRoot, 'Scan Target (2020).zho.srt'), '1\n00:00:01,000 --> 00:00:02,000\nzh line\n');
    fs.writeFileSync(path.join(movieRoot, 'Prelinked Movie (2019).eng.forced.srt'), '1\n00:00:01,000 --> 00:00:02,000\neng line\n');
    fs.writeFileSync(path.join(tvRoot, 'Show', 'Season 01', 'Show - S01E01 - Pilot.chs.ass'), '[Script Info]\n');

    const settingsService = {
      get: async () => ({
        mediaManagement: { movieRootFolder: movieRoot, tvRootFolder: tvRoot },
      }),
    } as any;
    playbackService = new PlaybackService(client, new PlaybackRepository(client), settingsService);
  });

  beforeEach(() => {
    client.sqlite.exec(
      'DELETE FROM "VariantSubtitleTrack";'
      + ' DELETE FROM "MediaFileVariant";'
      + ' DELETE FROM "Episode";'
      + ' DELETE FROM "Season";'
      + ' DELETE FROM "Series";'
      + ' DELETE FROM "Movie";',
    );

    const run = (sql: string, ...params: unknown[]) => client.sqlite.prepare(sql).run(...params as any);
    run(
      'INSERT INTO "Movie" (id, tmdbId, title, cleanTitle, sortTitle, status, qualityProfileId, year, path)'
      + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      MOVIE_ID, 9001, 'Scan Target', 'scantarget', 'Scan Target', 'released', 1, 2020, null,
    );
    run(
      'INSERT INTO "Movie" (id, tmdbId, title, cleanTitle, sortTitle, status, qualityProfileId, year, path)'
      + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      PRELINKED_MOVIE_ID, 9002, 'Prelinked Movie', 'prelinkedmovie', 'Prelinked Movie', 'released', 1, 2019, prelinkedMovieFile,
    );
    run(
      'INSERT INTO "Movie" (id, tmdbId, title, cleanTitle, sortTitle, status, qualityProfileId, year, path)'
      + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      MISSING_MOVIE_ID, 9003, 'Gone Movie', 'gonemovie', 'Gone Movie', 'released', 1, 2018,
      path.join(movieRoot, 'Gone Movie (2018).mkv'),
    );
    run(
      'INSERT INTO "Series" (id, tvdbId, title, cleanTitle, sortTitle, status, qualityProfileId, year)'
      + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      1, 8001, 'Show', 'show', 'Show', 'continuing', 1, 2020,
    );
    run('INSERT INTO "Season" (id, seriesId, seasonNumber) VALUES (?, ?, ?)', 1, 1, 1);
    run(
      'INSERT INTO "Episode" (id, seriesId, seasonId, tvdbId, seasonNumber, episodeNumber, title, path)'
      + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      EPISODE_ID, 1, 1, 7001, 1, 1, 'Pilot', episodeFile,
    );
    run(
      'INSERT INTO "Episode" (id, seriesId, seasonId, tvdbId, seasonNumber, episodeNumber, title, path)'
      + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      MISSING_EPISODE_ID, 1, 1, 7002, 1, 2, 'Missing', path.join(tvRoot, 'Show', 'Season 01', 'Show - S01E02 - Missing.mkv'),
    );
  });

  afterAll(async () => {
    await client.$disconnect();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('creates a variant row when the scan links a movie file, making it playable', async () => {
    const result = await (scanService as any).scanMovies(movieRoot);

    expect(result.added).toBe(1);

    const variant = await (client as any).mediaFileVariant.findFirst({
      where: { mediaType: 'MOVIE', movieId: MOVIE_ID },
    });
    expect(variant).not.toBeNull();
    expect(variant.path).toBe(scanTargetFile);

    const source = await playbackService.resolveStreamSource({ mediaType: 'MOVIE', mediaId: MOVIE_ID });
    expect(source.filePath).toBe(scanTargetFile);
  });

  it('heals a variant row for a pre-linked movie whose file exists on disk', async () => {
    await (scanService as any).scanMovies(movieRoot);

    const variant = await (client as any).mediaFileVariant.findFirst({
      where: { mediaType: 'MOVIE', movieId: PRELINKED_MOVIE_ID },
    });
    expect(variant).not.toBeNull();
    expect(variant.path).toBe(prelinkedMovieFile);

    const source = await playbackService.resolveStreamSource({ mediaType: 'MOVIE', mediaId: PRELINKED_MOVIE_ID });
    expect(source.filePath).toBe(prelinkedMovieFile);
  });

  it('creates a variant row for an episode whose file exists on disk', async () => {
    await (scanService as any).scanEpisodes(tvRoot);

    const variant = await (client as any).mediaFileVariant.findFirst({
      where: { mediaType: 'EPISODE', episodeId: EPISODE_ID },
    });
    expect(variant).not.toBeNull();
    expect(variant.path).toBe(episodeFile);

    const source = await playbackService.resolveStreamSource({ mediaType: 'EPISODE', mediaId: EPISODE_ID });
    expect(source.filePath).toBe(episodeFile);
  });

  it('does not create variant rows for files that are missing on disk', async () => {
    await scanService.scanAll({ movieRootFolder: movieRoot, tvRootFolder: tvRoot });

    const movie = await (client as any).movie.findUnique({ where: { id: MISSING_MOVIE_ID } });
    expect(movie.path).toBeNull();
    const episode = await (client as any).episode.findUnique({ where: { id: MISSING_EPISODE_ID } });
    expect(episode.path).toBeNull();

    const missingVariants = await (client as any).mediaFileVariant.findMany({
      where: { OR: [{ movieId: MISSING_MOVIE_ID }, { episodeId: MISSING_EPISODE_ID }] },
    });
    expect(missingVariants).toHaveLength(0);
  });

  it('is idempotent: a second scan creates no duplicate variant rows', async () => {
    await scanService.scanAll({ movieRootFolder: movieRoot, tvRootFolder: tvRoot });
    await scanService.scanAll({ movieRootFolder: movieRoot, tvRootFolder: tvRoot });

    const allVariants = await (client as any).mediaFileVariant.findMany({});
    expect(allVariants).toHaveLength(3);
  });

  it('registers sidecar subtitle tracks with ISO 639-2 language codes on the manifest', async () => {
    await scanService.scanAll({ movieRootFolder: movieRoot, tvRootFolder: tvRoot });

    const movieManifest = await playbackService.buildManifest({ mediaType: 'MOVIE', mediaId: MOVIE_ID });
    expect(movieManifest.subtitles).toHaveLength(1);
    expect(movieManifest.subtitles[0]).toEqual(expect.objectContaining({
      languageCode: 'zho',
      format: 'srt',
      isForced: false,
      isHi: false,
    }));

    const episodeManifest = await playbackService.buildManifest({ mediaType: 'EPISODE', mediaId: EPISODE_ID });
    expect(episodeManifest.subtitles).toHaveLength(1);
    expect(episodeManifest.subtitles[0]).toEqual(expect.objectContaining({
      languageCode: 'zho',
      format: 'ass',
    }));
  });

  it('parses forced / hi flags and plain language suffixes from sidecar names', async () => {
    await scanService.scanAll({ movieRootFolder: movieRoot, tvRootFolder: tvRoot });

    const manifest = await playbackService.buildManifest({ mediaType: 'MOVIE', mediaId: PRELINKED_MOVIE_ID });
    expect(manifest.subtitles).toHaveLength(1);
    expect(manifest.subtitles[0]).toEqual(expect.objectContaining({
      languageCode: 'eng',
      isForced: true,
    }));
  });

  it('does not duplicate subtitle tracks on a second scan', async () => {
    await scanService.scanAll({ movieRootFolder: movieRoot, tvRootFolder: tvRoot });
    await scanService.scanAll({ movieRootFolder: movieRoot, tvRootFolder: tvRoot });

    const tracks = await (client as any).variantSubtitleTrack.findMany({});
    expect(tracks).toHaveLength(3);
  });
});
