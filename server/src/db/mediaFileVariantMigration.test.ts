import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseClient } from './drizzleClient';
import { readMigrationMetadata } from './migrationCompatibility';

type TestDatabase = InstanceType<typeof Database>;

const root = path.resolve(import.meta.dirname, '../../..');
const temporaryDirectories: string[] = [];

function createTemporaryDatabase(): { db: TestDatabase; databasePath: string } {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'mediarr-variant-media-type-'));
  temporaryDirectories.push(directory);
  const databasePath = path.join(directory, 'mediarr.db');
  return { db: new Database(databasePath), databasePath };
}

function runDrizzleMigrate(databasePath: string): void {
  const client = new DatabaseClient({
    datasources: { db: { url: `file:${databasePath}` } },
  });
  try {
    migrate(client.db, { migrationsFolder: path.join(root, 'drizzle') });
  } finally {
    client.sqlite.close();
  }
}

function applyMigrationPrefix(db: TestDatabase, count: number): void {
  db.exec(`
    CREATE TABLE "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )
  `);

  for (const migration of readMigrationMetadata(root).slice(0, count)) {
    const sql = readFileSync(path.join(root, 'drizzle', `${migration.tag}.sql`), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) {
        db.exec(statement);
      }
    }
    db.prepare('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)')
      .run(migration.hash, migration.when);
  }
}

function insertEpisodeOwner(db: TestDatabase): void {
  db.exec(`
    INSERT INTO "QualityProfile" (id, name, cutoff, items)
    VALUES (1, 'Any', 0, '[]');
    INSERT INTO "Series" (
      id, tvdbId, title, cleanTitle, sortTitle, status, monitored,
      qualityProfileId, year, added
    ) VALUES (1, 1001, 'Legacy Show', 'legacyshow', 'Legacy Show', 'continuing', 1, 1, 2020, 1);
    INSERT INTO "Episode" (
      id, seriesId, tvdbId, seasonNumber, episodeNumber, title, monitored
    ) VALUES (11, 1, 1011, 1, 1, 'Pilot', 1);
  `);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('MediaFileVariant installed SQLite media-type constraint', () => {
  it('accepts valid types and rejects invalid direct inserts and updates', () => {
    const { db, databasePath } = createTemporaryDatabase();
    db.close();
    runDrizzleMigrate(databasePath);

    const installed = new Database(databasePath);
    const insert = installed.prepare(`
      INSERT INTO "MediaFileVariant" (mediaType, path, fileSize, updatedAt)
      VALUES (?, ?, 1, 1)
    `);

    expect(() => insert.run('MOVIE', '/media/movie.mkv')).not.toThrow();
    expect(() => insert.run('EPISODE', '/media/episode.mkv')).not.toThrow();
    expect(() => insert.run('TV', '/media/invalid.mkv'))
      .toThrow(/MediaFileVariant_mediaType_check/);
    expect(() => installed.prepare(`
      UPDATE "MediaFileVariant" SET mediaType = 'SERIES' WHERE path = '/media/movie.mkv'
    `).run()).toThrow(/MediaFileVariant_mediaType_check/);

    expect(installed.prepare('SELECT mediaType FROM "MediaFileVariant" ORDER BY id').all())
      .toEqual([{ mediaType: 'MOVIE' }, { mediaType: 'EPISODE' }]);
    installed.close();
  }, 30_000);

  it('normalizes a structurally valid legacy TV episode variant to EPISODE', () => {
    const { db, databasePath } = createTemporaryDatabase();
    applyMigrationPrefix(db, 6);
    insertEpisodeOwner(db);
    db.prepare(`
      INSERT INTO "MediaFileVariant" (
        id, mediaType, movieId, episodeId, path, fileSize, monitored, createdAt, updatedAt
      ) VALUES (1, 'TV', NULL, 11, '/legacy/show-s01e01.mkv', 123, 1, 1, 1)
    `).run();
    db.exec(`
      INSERT INTO "VariantMissingSubtitle" (id, variantId, languageCode, isForced, isHi, createdAt)
      VALUES (21, 1, 'en', 0, 0, 1);
      INSERT INTO "VariantAudioTrack" (id, variantId, streamIndex, languageCode, codec, channels, isDefault, isForced, isCommentary)
      VALUES (22, 1, 0, 'en', 'aac', '2.0', 1, 0, 0);
      INSERT INTO "VariantSubtitleTrack" (id, variantId, source, streamIndex, languageCode, isForced, isHi, codec)
      VALUES (23, 1, 'EMBEDDED', 1, 'en', 0, 0, 'subrip');
      INSERT INTO "WantedSubtitle" (id, variantId, languageCode, isForced, isHi, state, createdAt, updatedAt)
      VALUES (24, 1, 'th', 0, 0, 'PENDING', 1, 1);
      INSERT INTO "SubtitleHistory" (id, variantId, wantedSubtitleId, languageCode, provider, createdAt)
      VALUES (25, 1, 24, 'th', 'test-provider', 1);
    `);
    db.close();

    runDrizzleMigrate(databasePath);

    const upgraded = new Database(databasePath);
    expect(upgraded.prepare(`
      SELECT mediaType, movieId, episodeId, path FROM "MediaFileVariant" WHERE id = 1
    `).get()).toEqual({
      mediaType: 'EPISODE',
      movieId: null,
      episodeId: 11,
      path: '/legacy/show-s01e01.mkv',
    });
    expect(upgraded.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'trigger' AND tbl_name = 'MediaFileVariant'
      ORDER BY name
    `).all()).toEqual([
      { name: 'MediaFileVariant_mediaType_insert_check' },
      { name: 'MediaFileVariant_mediaType_update_check' },
    ]);
    for (const table of ['VariantMissingSubtitle', 'VariantAudioTrack', 'VariantSubtitleTrack', 'WantedSubtitle', 'SubtitleHistory']) {
      expect(upgraded.prepare(`SELECT count(*) AS count FROM "${table}"`).get(), table)
        .toEqual({ count: 1 });
    }
    expect(upgraded.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    upgraded.close();
  }, 30_000);

  it.each([
    ['TV without an episode owner', 'TV', null],
    ['unknown type even with an episode owner', 'SERIES', 11],
  ])('fails migration for %s', (_label, mediaType, episodeId) => {
    const { db, databasePath } = createTemporaryDatabase();
    applyMigrationPrefix(db, 6);
    insertEpisodeOwner(db);
    db.prepare(`
      INSERT INTO "MediaFileVariant" (
        id, mediaType, movieId, episodeId, path, fileSize, monitored, createdAt, updatedAt
      ) VALUES (1, ?, NULL, ?, '/legacy/invalid.mkv', 123, 1, 1, 1)
    `).run(mediaType, episodeId);
    db.close();

    expect(() => runDrizzleMigrate(databasePath)).toThrow();

    const unchanged = new Database(databasePath, { readonly: true });
    expect(unchanged.prepare('SELECT mediaType FROM "MediaFileVariant" WHERE id = 1').get())
      .toEqual({ mediaType });
    unchanged.close();
  }, 30_000);
});
