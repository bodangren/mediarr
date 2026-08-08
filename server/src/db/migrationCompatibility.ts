import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export interface MigrationMetadata {
  tag: string;
  when: number;
  hash: string;
}

interface Journal {
  entries: Array<{ tag: string; when: number }>;
}

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface SqliteStatement {
  get(...parameters: unknown[]): unknown;
  all(...parameters: unknown[]): unknown[];
  run(...parameters: unknown[]): unknown;
  pluck(): SqliteStatement;
}

export interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
  close(): void;
  transaction<T>(operation: () => T): () => T;
}

const SCHEDULER_MIGRATION_TAGS = [
  '0003_workable_sage',
  '0004_scheduler_enabled_state',
] as const;

const PUSH_BASELINE_TABLES = [
  'ActivityEvent', 'AppSettings', 'Blocklist', 'Category', 'Collection', 'CustomFilter',
  'CustomFormat', 'CustomFormatScore', 'DownloadClient', 'Episode', 'ImportList',
  'ImportListExclusion', 'Indexer', 'IndexerCategory', 'IndexerHealthSnapshot',
  'IndexerRelease', 'Media', 'MediaFileVariant', 'Movie', 'Notification',
  'PlaybackProgress', 'Proxy', 'QualityDefinition', 'QualityProfile', 'Season', 'Series',
  'SubtitleHistory', 'TaskExecution', 'Torrent', 'TorrentPeer', 'VariantAudioTrack',
  'VariantMissingSubtitle', 'VariantSubtitleTrack', 'WantedSubtitle',
] as const;

const LEGACY_APP_SETTINGS_COLUMNS = [
  'id', 'torrentLimits', 'schedulerIntervals', 'pathVisibility', 'apiKeys', 'host', 'security',
  'logging', 'update', 'mediaManagement', 'streaming', 'createdAt', 'updatedAt',
] as const;

/** Reads the checked-in Drizzle journal and hashes the exact SQL Drizzle will apply. */
export function readMigrationMetadata(projectRoot: string): MigrationMetadata[] {
  const migrationsDir = path.join(projectRoot, 'drizzle');
  const journal = JSON.parse(
    fs.readFileSync(path.join(migrationsDir, 'meta', '_journal.json'), 'utf8'),
  ) as Journal;

  return journal.entries.map(({ tag, when }) => {
    const contents = fs.readFileSync(path.join(migrationsDir, `${tag}.sql`));
    return {
      tag,
      when,
      hash: crypto.createHash('sha256').update(contents).digest('hex'),
    };
  });
}

function databasePathFromUrl(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('Migration compatibility only supports SQLite file: DATABASE_URL values.');
  }

  const location = databaseUrl.slice('file:'.length);
  if (!location || location === ':memory:') {
    throw new Error('Migration compatibility requires a persistent SQLite file, not an in-memory database.');
  }

  if (location.startsWith('//')) {
    return decodeURIComponent(new URL(databaseUrl).pathname);
  }

  return path.resolve(decodeURIComponent(location));
}

function hasTable(db: SqliteDatabase, table: string): boolean {
  return db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
  ).get(table) !== undefined;
}

function readColumns(db: SqliteDatabase): Map<string, ColumnInfo> {
  return new Map(
    (db.prepare('PRAGMA table_info("AppSettings")').all() as ColumnInfo[])
      .map((column) => [column.name, column]),
  );
}

function appSettingsColumnsMatchMigrationPrefix(
  db: SqliteDatabase,
  projectRoot: string,
  migrations: MigrationMetadata[],
): boolean {
  const expected = new Database(':memory:');
  try {
    for (const migration of migrations) {
      expected.exec(fs.readFileSync(path.join(projectRoot, 'drizzle', `${migration.tag}.sql`), 'utf8'));
    }
    const actualColumns = readColumns(db);
    const expectedColumns = readColumns(expected);
    if (actualColumns.size !== expectedColumns.size) return false;
    return [...expectedColumns.entries()].every(([name, expectedColumn]) => {
      const actualColumn = actualColumns.get(name);
      return actualColumn !== undefined
        && actualColumn.type.toLowerCase() === expectedColumn.type.toLowerCase()
        && actualColumn.notnull === expectedColumn.notnull
        && actualColumn.dflt_value === expectedColumn.dflt_value
        && actualColumn.pk === expectedColumn.pk;
    });
  } finally {
    expected.close();
  }
}

function assertLegacyAppSettingsBase(columns: Map<string, ColumnInfo>): void {
  const missing = LEGACY_APP_SETTINGS_COLUMNS.filter((name) => !columns.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Refusing migration-history adoption: AppSettings is not a recognized legacy shape (missing ${missing.join(', ')}).`,
    );
  }
}

function assertSchedulerStateColumn(column: ColumnInfo): void {
  if (
    column.type.toLowerCase() !== 'text'
    || column.notnull !== 1
    || column.dflt_value?.replace(/\s/g, '') !== "'{}'"
  ) {
    throw new Error(
      'Refusing migration-history adoption: AppSettings.schedulerState does not match tracked migration 0003_workable_sage.',
    );
  }
}

function assertSchedulerEnabledColumn(column: ColumnInfo): void {
  if (column.type.toLowerCase() !== 'text' || column.notnull !== 0 || column.dflt_value !== null) {
    throw new Error(
      'Refusing migration-history adoption: AppSettings.schedulerEnabled does not match tracked migration 0004_scheduler_enabled_state.',
    );
  }
}

function assertDatabaseIntegrity(db: SqliteDatabase): void {
  const integrity = db.prepare('PRAGMA integrity_check').pluck().get();
  if (integrity !== 'ok') {
    throw new Error(`Refusing migration-history adoption: SQLite integrity_check returned ${String(integrity)}.`);
  }

  const foreignKeyViolations = db.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeyViolations.length > 0) {
    throw new Error('Refusing migration-history adoption: SQLite foreign_key_check found violations.');
  }
}

interface SchemaObject {
  type: 'table' | 'index' | 'trigger';
  name: string;
  sql: string;
}

function normalizeSchemaSql(sql: string): string {
  return sql
    .toLowerCase()
    .replace(/[`"]+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),=])\s*/g, '$1')
    .trim();
}

function readSchemaObjects(db: SqliteDatabase): Map<string, string> {
  const objects = db.prepare(`
    SELECT type, name, sql
    FROM sqlite_master
    WHERE type IN ('table', 'index', 'trigger')
      AND sql IS NOT NULL
      AND name NOT LIKE 'sqlite_%'
      AND name <> '__drizzle_migrations'
    ORDER BY type, name
  `).all() as SchemaObject[];
  return new Map(objects.map(object => [
    `${object.type}:${object.name}`,
    normalizeSchemaSql(object.sql),
  ]));
}

function readExpectedSchema(
  projectRoot: string,
  migrations: MigrationMetadata[] = readMigrationMetadata(projectRoot),
): Map<string, string> {
  const expected = new Database(':memory:');
  try {
    for (const migration of migrations) {
      expected.exec(fs.readFileSync(path.join(projectRoot, 'drizzle', `${migration.tag}.sql`), 'utf8'));
    }
    return readSchemaObjects(expected);
  } finally {
    expected.close();
  }
}

function readExpectedPushBaseline(projectRoot: string): Map<string, string> {
  return readExpectedSchema(projectRoot);
}

function assertSchemaMatchesMigrations(
  db: SqliteDatabase,
  projectRoot: string,
  migrations: MigrationMetadata[],
): void {
  assertDatabaseIntegrity(db);
  const expected = readExpectedSchema(projectRoot, migrations);
  const actual = readSchemaObjects(db);
  const objectNames = new Set([...expected.keys(), ...actual.keys()]);
  for (const objectName of objectNames) {
    if (expected.get(objectName) !== actual.get(objectName)) {
      if (
        objectName === 'table:AppSettings'
        && appSettingsColumnsMatchMigrationPrefix(db, projectRoot, migrations)
      ) {
        continue;
      }
      const [, name = objectName] = objectName.split(':', 2);
      throw new Error(
        `Refusing migration-history adoption: database schema object ${name} differs from the tracked migration prefix.`,
      );
    }
  }
}

function assertPushBaseline(
  db: SqliteDatabase,
  columns: Map<string, ColumnInfo>,
  projectRoot: string,
): void {
  const missingTables = PUSH_BASELINE_TABLES.filter((table) => !hasTable(db, table));
  if (missingTables.length > 0) {
    throw new Error(
      `Refusing migration-history adoption: database has no Drizzle journal and is not the known push baseline (missing ${missingTables.join(', ')}).`,
    );
  }
  assertDatabaseIntegrity(db);
  assertLegacyAppSettingsBase(columns);

  const expected = readExpectedPushBaseline(projectRoot);
  const actual = readSchemaObjects(db);
  const objectNames = new Set([...expected.keys(), ...actual.keys()]);
  for (const objectName of objectNames) {
    if (expected.get(objectName) !== actual.get(objectName)) {
      const [, name = objectName] = objectName.split(':', 2);
      throw new Error(
        `Refusing migration-history adoption: database is not the known push baseline; schema object ${name} differs from checked-in migrations.`,
      );
    }
  }
}

function createJournal(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )
  `);
}

function insertJournalEntry(db: SqliteDatabase, migration: MigrationMetadata): void {
  db.prepare('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)')
    .run(migration.hash, migration.when);
}

/**
 * Repairs a legacy database whose schema was pushed through migration 0003 but whose
 * journal only records that latest migration. We require an exact schema match for
 * the recorded prefix before adding the missing baseline ledger entries.
 */
function reconcileMissingBaselineJournalEntries(
  db: SqliteDatabase,
  migrations: MigrationMetadata[],
  projectRoot: string,
): MigrationMetadata[] {
  const baseline = migrations.slice(0, 3);
  if (baseline.length !== 3) {
    throw new Error('Migration compatibility requires the 0000–0002 baseline migrations.');
  }

  const appliedHashes = new Set(
    (db.prepare('SELECT hash FROM "__drizzle_migrations"').all() as Array<{ hash: string }>)
      .map((row) => row.hash),
  );
  const missingBaseline = baseline.filter((migration) => !appliedHashes.has(migration.hash));
  if (missingBaseline.length === 0) {
    return [];
  }
  if (missingBaseline.length !== baseline.length) {
    throw new Error('Refusing migration-history adoption: Drizzle journal records only part of the 0000–0002 baseline.');
  }

  const highestAppliedIndex = migrations.reduce(
    (highest, migration, index) => (appliedHashes.has(migration.hash) ? index : highest),
    -1,
  );
  if (highestAppliedIndex < baseline.length) {
    return [];
  }
  for (let index = baseline.length; index <= highestAppliedIndex; index += 1) {
    if (!appliedHashes.has(migrations[index]!.hash)) {
      throw new Error('Refusing migration-history adoption: Drizzle journal has a gap after the missing baseline.');
    }
  }

  assertSchemaMatchesMigrations(db, projectRoot, migrations.slice(0, highestAppliedIndex + 1));
  db.transaction(() => {
    for (const migration of baseline) insertJournalEntry(db, migration);
  })();
  return baseline;
}

/**
 * Records only known, structurally verified legacy schema changes in Drizzle's ledger.
 * It performs no application DDL: after reconciliation `drizzle-kit migrate` remains
 * responsible for all pending tracked SQL.
 */
export function reconcileLegacyMigrationState(
  databaseUrl: string,
  projectRoot: string,
): MigrationMetadata[] {
  const db = new Database(databasePathFromUrl(databaseUrl));
  try {
    if (!hasTable(db, 'AppSettings')) {
      return [];
    }

    const migrations = readMigrationMetadata(projectRoot);
    const schedulerMigrations = SCHEDULER_MIGRATION_TAGS.map((tag) => {
      const migration = migrations.find((candidate) => candidate.tag === tag);
      if (!migration) {
        throw new Error(`Migration compatibility requires checked-in ${tag}.sql metadata.`);
      }
      return migration;
    });
    const rssEpisodeLinksMigration = migrations.find(
      (migration) => migration.tag === '0005_truthful_rss_episode_links',
    );
    if (!rssEpisodeLinksMigration) {
      throw new Error('Migration compatibility requires checked-in 0005_truthful_rss_episode_links.sql metadata.');
    }
    const variantMediaTypeMigration = migrations.find(
      (migration) => migration.tag === '0006_variant_media_type_check',
    );
    if (!variantMediaTypeMigration) {
      throw new Error('Migration compatibility requires checked-in 0006_variant_media_type_check.sql metadata.');
    }
    const columns = readColumns(db);
    assertLegacyAppSettingsBase(columns);

    let journalExists = hasTable(db, '__drizzle_migrations');
    if (!journalExists) {
      assertPushBaseline(db, columns, projectRoot);
      const baseline = migrations.slice(0, 3);
      if (baseline.length !== 3) {
        throw new Error('Migration compatibility requires the 0000–0002 baseline migrations.');
      }
      const stateColumn = columns.get('schedulerState');
      const enabledColumn = columns.get('schedulerEnabled');
      if (stateColumn) assertSchedulerStateColumn(stateColumn);
      if (enabledColumn) assertSchedulerEnabledColumn(enabledColumn);
      if (enabledColumn && !stateColumn) {
        throw new Error('Refusing migration-history adoption: schedulerEnabled exists while schedulerState is absent.');
      }

      const adopted = db.transaction(() => {
        createJournal(db);
        for (const migration of baseline) insertJournalEntry(db, migration);
        return [...baseline];
      })();
      journalExists = true;
      // Continue below so an already-pushed scheduler column gets a precise ledger entry too.
      const reconciled = reconcileKnownSchedulerMigrations(db, schedulerMigrations, columns);
      const rssReconciled = reconcileTorrentEpisodeLinksMigration(db, rssEpisodeLinksMigration);
      const variantReconciled = reconcileVariantMediaTypeMigration(
        db, variantMediaTypeMigration, projectRoot,
      );
      return [...adopted, ...reconciled, ...rssReconciled, ...variantReconciled];
    }

    if (!journalExists) {
      throw new Error('Unable to initialize the Drizzle migration journal.');
    }
    const baselineReconciled = reconcileMissingBaselineJournalEntries(db, migrations, projectRoot);
    return [
      ...baselineReconciled,
      ...reconcileKnownSchedulerMigrations(db, schedulerMigrations, columns),
      ...reconcileTorrentEpisodeLinksMigration(db, rssEpisodeLinksMigration),
      ...reconcileVariantMediaTypeMigration(db, variantMediaTypeMigration, projectRoot),
    ];
  } finally {
    db.close();
  }
}

const VARIANT_MEDIA_TYPE_TRIGGER_NAMES = [
  'MediaFileVariant_mediaType_insert_check',
  'MediaFileVariant_mediaType_update_check',
] as const;

function reconcileVariantMediaTypeMigration(
  db: SqliteDatabase,
  migration: MigrationMetadata,
  projectRoot: string,
): MigrationMetadata[] {
  const applied = db.prepare(
    'SELECT 1 FROM "__drizzle_migrations" WHERE hash = ? LIMIT 1',
  ).get(migration.hash) !== undefined;
  const expected = readExpectedPushBaseline(projectRoot);
  const actual = readSchemaObjects(db);
  const triggersMatch = VARIANT_MEDIA_TYPE_TRIGGER_NAMES.every((name) => (
    actual.get(`trigger:${name}`) === expected.get(`trigger:${name}`)
  ));

  if (applied && !triggersMatch) {
    throw new Error(
      'Refusing migration-history adoption: 0006 is recorded but MediaFileVariant media-type enforcement triggers are absent or drifted.',
    );
  }
  if (!triggersMatch || applied) {
    return [];
  }

  insertJournalEntry(db, migration);
  return [migration];
}

function reconcileTorrentEpisodeLinksMigration(
  db: SqliteDatabase,
  migration: MigrationMetadata,
): MigrationMetadata[] {
  const applied = (db.prepare(
    'SELECT 1 FROM "__drizzle_migrations" WHERE hash = ? LIMIT 1',
  ).get(migration.hash)) !== undefined;
  const column = (db.prepare('PRAGMA table_info("Torrent")').all() as ColumnInfo[])
    .find((candidate) => candidate.name === 'episodeIds');

  if (applied && !column) {
    throw new Error(
      'Refusing migration-history adoption: 0005 is recorded but Torrent.episodeIds is absent.',
    );
  }
  if (!column) {
    return [];
  }
  if (column.type.toLowerCase() !== 'text' || column.notnull !== 0) {
    throw new Error(
      'Refusing migration-history adoption: Torrent.episodeIds does not match tracked migration 0005_truthful_rss_episode_links.',
    );
  }
  if (applied) {
    return [];
  }

  insertJournalEntry(db, migration);
  return [migration];
}

function reconcileKnownSchedulerMigrations(
  db: SqliteDatabase,
  migrations: MigrationMetadata[],
  columns: Map<string, ColumnInfo>,
): MigrationMetadata[] {
  const appliedHashes = new Set(
    (db.prepare('SELECT hash FROM "__drizzle_migrations"').all() as Array<{ hash: string }>)
      .map((row) => row.hash),
  );
  const [schedulerStateMigration, schedulerEnabledMigration] = migrations;
  if (!schedulerStateMigration || !schedulerEnabledMigration) {
    throw new Error('Migration compatibility requires scheduler migration metadata.');
  }
  const stateApplied = appliedHashes.has(schedulerStateMigration.hash);
  const enabledApplied = appliedHashes.has(schedulerEnabledMigration.hash);
  const stateColumn = columns.get('schedulerState');
  const enabledColumn = columns.get('schedulerEnabled');

  if (enabledApplied && !stateApplied) {
    throw new Error('Refusing migration-history adoption: 0004 is recorded while 0003 is absent from the Drizzle journal.');
  }
  if (stateApplied && !stateColumn) {
    throw new Error('Refusing migration-history adoption: 0003 is recorded but AppSettings.schedulerState is absent.');
  }
  if (enabledApplied && !enabledColumn) {
    throw new Error('Refusing migration-history adoption: 0004 is recorded but AppSettings.schedulerEnabled is absent.');
  }
  if (stateColumn) assertSchedulerStateColumn(stateColumn);
  if (enabledColumn) assertSchedulerEnabledColumn(enabledColumn);
  if (enabledColumn && !stateColumn && !stateApplied) {
    throw new Error('Refusing migration-history adoption: schedulerEnabled exists while schedulerState is absent.');
  }

  const adopted: MigrationMetadata[] = [];
  const reconcile = db.transaction(() => {
    if (!stateApplied && stateColumn) {
      insertJournalEntry(db, schedulerStateMigration);
      adopted.push(schedulerStateMigration);
    }
    if (!enabledApplied && enabledColumn) {
      insertJournalEntry(db, schedulerEnabledMigration);
      adopted.push(schedulerEnabledMigration);
    }
  });
  reconcile();
  return adopted;
}
