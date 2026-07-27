import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseClient } from './drizzleClient';
import { readMigrationMetadata } from './migrationCompatibility';
import { findDestructiveStatements, runMigrations } from './migrationRunner';

// Track: database_migration_strategy_20260713 — Phase 1 Red contract.
//
// Spec goal 3: "Preserve all user data across migrations unless the user
// explicitly requests a reset." This file is the falsifiable proof of the
// tech-debt row "DB recreated from scratch — existing data lost" (open since
// 2026-03-30) at the level of an actual upgrade, not a fresh install.
//
// The defect is NOT a failing migration. The migration COMMITS and reports
// success while silently destroying rows, so neither an exit code nor a
// transaction rollback can detect it. The mechanism:
//
//   1. drizzle-orm's sync SQLite migrator wraps every pending migration in a
//      single `BEGIN` ... `COMMIT` (sqlite-core/dialect.js `migrate()`).
//   2. `PRAGMA foreign_keys` is a NO-OP inside a transaction in SQLite, so the
//      `PRAGMA foreign_keys=OFF` on line 1 of 0001_panoramic_mindworm.sql never
//      takes effect. (It is also re-enabled on line 14, before 13 of the 14
//      table rebuilds, so it would not cover them even outside a transaction.)
//   3. 0001 rebuilds tables with the standard SQLite 12-step idiom
//      (CREATE __new_X / INSERT SELECT / DROP TABLE X / RENAME). With foreign
//      keys still enforced, `DROP TABLE Series` cascades into the already-
//      rebuilt `Season` and `Episode` tables, which declare
//      ON DELETE CASCADE against Series.
//
// The assertion is family-level: seeded child rows must survive an upgrade.
// It deliberately does not pin the specific tables, so the guard keeps working
// as the schema evolves.

type TestDatabase = InstanceType<typeof Database>;

const root = path.resolve(import.meta.dirname, '../../..');
const temporaryDirectories: string[] = [];

function createTemporaryDatabase(): { db: TestDatabase; databasePath: string } {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'mediarr-migration-preservation-'));
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

/** Applies the first `count` migrations and journals them, as a real install would. */
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

/** Seeds a representative slice of real user data: a series with a season and an episode. */
function seedUserLibrary(db: TestDatabase): void {
  db.exec(`
    INSERT INTO "QualityProfile" (id, name, cutoff, items)
    VALUES (1, 'Any', 0, '[]');
    INSERT INTO "Series" (
      id, tvdbId, title, cleanTitle, sortTitle, status, monitored,
      qualityProfileId, path, year, added
    ) VALUES (1, 1001, 'Upgrade Show', 'upgradeshow', 'Upgrade Show', 'continuing', 1, 1, '/tv/Upgrade', 2020, 1);
    INSERT INTO "Season" (id, seriesId, seasonNumber, monitored)
    VALUES (1, 1, 1, 1);
    INSERT INTO "Episode" (
      id, seriesId, seasonId, tvdbId, seasonNumber, episodeNumber, title, monitored
    ) VALUES (11, 1, 1, 1011, 1, 1, 'Pilot', 1);
  `);
}

function countRows(db: TestDatabase, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number }).count;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('migration data preservation across an upgrade', () => {
  it('preserves seeded user data when upgrading a populated baseline database', () => {
    const { db, databasePath } = createTemporaryDatabase();
    applyMigrationPrefix(db, 1);
    seedUserLibrary(db);

    const before = {
      Series: countRows(db, 'Series'),
      Season: countRows(db, 'Season'),
      Episode: countRows(db, 'Episode'),
    };
    expect(before).toEqual({ Series: 1, Season: 1, Episode: 1 });
    db.close();

    runMigrations(`file:${databasePath}`, { projectRoot: root, logger: () => {} });

    const upgraded = new Database(databasePath);
    try {
      const after = {
        Series: countRows(upgraded, 'Series'),
        Season: countRows(upgraded, 'Season'),
        Episode: countRows(upgraded, 'Episode'),
      };
      const destroyed = Object.entries(before)
        .filter(([table, count]) => after[table as keyof typeof after] < count)
        .map(([table, count]) => `${table}: ${count} -> ${after[table as keyof typeof after]}`);

      expect(
        destroyed,
        `Upgrading a populated database destroyed user rows: ${destroyed.join(', ')}. ` +
          'A migration must never silently reduce user-owned row counts.',
      ).toEqual([]);
      expect(after).toEqual(before);
    } finally {
      upgraded.close();
    }
  });

  it('records why drizzle-kit migrate cannot be used as the upgrade path', () => {
    // Regression documentation for the decision to own migration application.
    // drizzle-orm's migrator destroys the same rows AND commits successfully, so
    // neither an exit code nor a rollback can detect the loss. If a future change
    // makes this assertion fail, drizzle has fixed the pragma-in-transaction
    // behaviour and this runner can be reconsidered.
    const { db, databasePath } = createTemporaryDatabase();
    applyMigrationPrefix(db, 1);
    seedUserLibrary(db);
    db.close();

    expect(() => runDrizzleMigrate(databasePath)).not.toThrow();

    const upgraded = new Database(databasePath);
    try {
      expect(
        { Season: countRows(upgraded, 'Season'), Episode: countRows(upgraded, 'Episode') },
        'drizzle-orm still cascade-deletes child rows during a table rebuild',
      ).toEqual({ Season: 0, Episode: 0 });
      expect(countRows(upgraded, 'Series')).toBe(1);
    } finally {
      upgraded.close();
    }
  });

  it('is idempotent — a second run applies nothing', () => {
    const { db, databasePath } = createTemporaryDatabase();
    applyMigrationPrefix(db, 1);
    seedUserLibrary(db);
    db.close();

    const first = runMigrations(`file:${databasePath}`, { projectRoot: root, logger: () => {} });
    const second = runMigrations(`file:${databasePath}`, { projectRoot: root, logger: () => {} });

    expect(first.applied.length).toBeGreaterThan(0);
    expect(second.applied).toEqual([]);
    expect(second.alreadyApplied).toEqual([...first.alreadyApplied, ...first.applied]);
  });

  it('accepts the checked-in migration chain as non-destructive', () => {
    // The SQLite 12-step rebuild drops tables by design. The destructive guard
    // must not refuse the project's own migrations on a fresh install.
    const { db, databasePath } = createTemporaryDatabase();
    db.close();
    rmSync(databasePath, { force: true });

    const result = runMigrations(`file:${databasePath}`, { projectRoot: root, logger: () => {} });
    expect(result.applied).toEqual(readMigrationMetadata(root).map((migration) => migration.tag));
  });

  it('refuses a migration that drops a table without preserving its rows', () => {
    const findings = findDestructiveStatements(
      'test_drop',
      'DROP TABLE `Series`;--> statement-breakpoint\nCREATE TABLE `Other` (`id` integer);',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.reason).toMatch(/drops table "Series"/);
  });

  it('refuses a migration that drops a column', () => {
    const findings = findDestructiveStatements(
      'test_drop_column',
      'ALTER TABLE `Series` DROP COLUMN `title`;',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.reason).toMatch(/drops column "title"/);
  });
});
