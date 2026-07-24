import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import {
  reconcileLegacyMigrationState,
  readMigrationMetadata,
  type SqliteDatabase,
} from './migrationCompatibility';

const root = path.resolve(import.meta.dirname, '../../..');
const temporaryDirectories: string[] = [];

function createTemporaryDatabase(): { db: SqliteDatabase; databasePath: string } {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'mediarr-migration-compatibility-'));
  temporaryDirectories.push(directory);
  const databasePath = path.join(directory, 'mediarr.db');
  return { db: new Database(databasePath), databasePath };
}

function createLegacyAppSettings(db: SqliteDatabase, schedulerColumns: 'none' | 'both'): void {
  db.exec(`
    CREATE TABLE "AppSettings" (
      "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
      "torrentLimits" text NOT NULL,
      "schedulerIntervals" text NOT NULL,
      "pathVisibility" text NOT NULL,
      "apiKeys" text,
      "host" text,
      "security" text,
      "logging" text,
      "update" text,
      "mediaManagement" text,
      "streaming" text,
      "createdAt" integer DEFAULT (strftime('%s','now')) NOT NULL,
      "updatedAt" integer NOT NULL
      ${schedulerColumns === 'both' ? ", \"schedulerState\" text NOT NULL DEFAULT '{}', \"schedulerEnabled\" text" : ''}
    );
    CREATE TABLE "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    );
    CREATE TABLE "Torrent" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL
    );
    CREATE TABLE "Episode" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL
    );
    CREATE TABLE "MediaFileVariant" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "mediaType" text NOT NULL,
      "movieId" integer,
      "episodeId" integer,
      "path" text NOT NULL,
      "fileSize" integer NOT NULL,
      "monitored" integer DEFAULT true NOT NULL,
      "probeFingerprint" text,
      "releaseName" text,
      "quality" text,
      "createdAt" integer DEFAULT (strftime('%s','now')) NOT NULL,
      "updatedAt" integer NOT NULL
    );
  `);
  if (schedulerColumns === 'both') {
    db.prepare(`
      INSERT INTO "AppSettings" (id, torrentLimits, schedulerIntervals, pathVisibility, updatedAt, schedulerState, schedulerEnabled)
      VALUES (1, '{}', '{}', '{}', 1, ?, ?)
    `).run('{"rss-sync":"2026-07-12T00:00:00.000Z"}', '{"rss-sync":false}');
  } else {
    db.exec(`
      INSERT INTO "AppSettings" (id, torrentLimits, schedulerIntervals, pathVisibility, updatedAt)
      VALUES (1, '{}', '{}', '{}', 1)
    `);
  }
}

function recordMigrationPrefix(db: SqliteDatabase): void {
  for (const migration of readMigrationMetadata(root).slice(0, 3)) {
    db.prepare('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)')
      .run(migration.hash, migration.when);
  }
}

function runDrizzleMigrate(databasePath: string): void {
  execFileSync('./node_modules/.bin/drizzle-kit', ['migrate'], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: `file:${databasePath}` },
    stdio: 'pipe',
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('tracked SQLite migration compatibility', () => {
  it('adopts only verified scheduler migrations for a legacy database with columns but missing journal entries', () => {
    const { db, databasePath } = createTemporaryDatabase();
    createLegacyAppSettings(db, 'both');
    recordMigrationPrefix(db);

    const preservedState = db.prepare('SELECT schedulerState, schedulerEnabled FROM "AppSettings" WHERE id = 1').get();
    const adopted = reconcileLegacyMigrationState(`file:${databasePath}`, root);

    expect(adopted.map((migration) => migration.tag)).toEqual([
      '0003_workable_sage',
      '0004_scheduler_enabled_state',
    ]);
    expect(db.prepare('SELECT schedulerState, schedulerEnabled FROM "AppSettings" WHERE id = 1').get())
      .toEqual(preservedState);
    expect(db.prepare('SELECT count(*) AS count FROM "__drizzle_migrations"').get()).toEqual({ count: 5 });
    db.close();

    expect(() => runDrizzleMigrate(databasePath)).not.toThrow();
  }, 30_000);

  it('leaves a legacy AppSettings shape for Drizzle to upgrade through its tracked migrations', () => {
    const { db, databasePath } = createTemporaryDatabase();
    createLegacyAppSettings(db, 'none');
    recordMigrationPrefix(db);

    expect(reconcileLegacyMigrationState(`file:${databasePath}`, root)).toEqual([]);
    db.close();
    runDrizzleMigrate(databasePath);

    const upgraded = new Database(databasePath, { readonly: true });
    const columns = upgraded.prepare('PRAGMA table_info("AppSettings")').all() as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).toEqual(expect.arrayContaining(['schedulerState', 'schedulerEnabled']));
    expect(upgraded.prepare('SELECT count(*) AS count FROM "__drizzle_migrations"').get()).toEqual({ count: 7 });
    upgraded.close();
  }, 30_000);

  it('adopts a valid push-created database with no journal only after structural and integrity checks', () => {
    const { db, databasePath } = createTemporaryDatabase();
    db.close();
    runDrizzleMigrate(databasePath);

    const pushed = new Database(databasePath);
    pushed.exec(`
      INSERT INTO "AppSettings" (id, torrentLimits, schedulerIntervals, pathVisibility, updatedAt, schedulerState, schedulerEnabled)
      VALUES (1, '{}', '{}', '{}', 1, '{"rss-sync":"2026-07-12T00:00:00.000Z"}', '{"rss-sync":false}');
      DROP TABLE "__drizzle_migrations";
    `);
    const adopted = reconcileLegacyMigrationState(`file:${databasePath}`, root);

    expect(adopted.map((migration) => migration.tag)).toEqual([
      '0000_fuzzy_revanche',
      '0001_panoramic_mindworm',
      '0002_furry_blonde_phantom',
      '0003_workable_sage',
      '0004_scheduler_enabled_state',
      '0005_truthful_rss_episode_links',
      '0006_variant_media_type_check',
    ]);
    expect(pushed.prepare('SELECT schedulerState, schedulerEnabled FROM "AppSettings" WHERE id = 1').get())
      .toEqual({ schedulerState: '{"rss-sync":"2026-07-12T00:00:00.000Z"}', schedulerEnabled: '{"rss-sync":false}' });
    expect(pushed.prepare('SELECT count(*) AS count FROM "__drizzle_migrations"').get()).toEqual({ count: 7 });
    pushed.close();
  }, 30_000);

  it('refuses out-of-order legacy schema instead of suppressing a duplicate-column error', () => {
    const { db, databasePath } = createTemporaryDatabase();
    createLegacyAppSettings(db, 'none');
    db.exec('ALTER TABLE "AppSettings" ADD "schedulerEnabled" text');
    recordMigrationPrefix(db);

    expect(() => reconcileLegacyMigrationState(`file:${databasePath}`, root))
      .toThrow(/schedulerEnabled.*schedulerState/i);
    expect(db.prepare('SELECT count(*) AS count FROM "__drizzle_migrations"').get()).toEqual({ count: 3 });
    db.close();
  });

  it('rejects a no-journal database whose table names match but an important table shape drifted', () => {
    const { db, databasePath } = createTemporaryDatabase();
    db.close();
    runDrizzleMigrate(databasePath);

    const drifted = new Database(databasePath);
    drifted.exec(`
      DROP TABLE "__drizzle_migrations";
      ALTER TABLE "Category" RENAME TO "Category_old";
      CREATE TABLE "Category" (
        "id" integer PRIMARY KEY NOT NULL,
        "parent_id" integer
      );
      DROP TABLE "Category_old";
    `);

    expect(() => reconcileLegacyMigrationState(`file:${databasePath}`, root))
      .toThrow(/known push baseline.*Category/i);
    expect(drifted.prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
    ).get()).toBeUndefined();
    drifted.close();
  }, 30_000);

  it('does not leave runtime AppSettings schema DDL behind', () => {
    const repository = readFileSync(path.join(root, 'server/src/repositories/AppSettingsRepository.ts'), 'utf8');

    expect(repository).not.toMatch(/ALTER\s+TABLE|PRAGMA\s+table_info/i);
  });
});
