import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { readMigrationMetadata, type MigrationMetadata } from './migrationCompatibility';

// Track: database_migration_strategy_20260713.
//
// Why this exists instead of `drizzle-kit migrate`:
//
// drizzle-orm's sync SQLite migrator wraps every pending migration in a single
// `BEGIN` ... `COMMIT`. SQLite treats `PRAGMA foreign_keys` as a no-op inside a
// transaction, so the `PRAGMA foreign_keys=OFF` that Drizzle itself emits at the
// top of a table-rebuild migration never takes effect. The rebuild then runs
// with foreign keys enforced, and `DROP TABLE <parent>` cascades into child
// tables that were already rebuilt and repopulated — destroying user rows while
// the migration commits and reports success.
//
// This runner keeps Drizzle's on-disk format (the `drizzle/` folder, the
// `meta/_journal.json` ordering, and the `__drizzle_migrations` ledger) and only
// takes over *how* migrations are applied:
//
//   * foreign keys are disabled OUTSIDE the transaction and restored after it,
//   * each migration gets its own transaction so a failure rolls back exactly
//     one migration rather than an arbitrary batch,
//   * `PRAGMA foreign_key_check` runs after each migration so a rebuild that
//     leaves dangling references fails loudly instead of silently,
//   * genuinely destructive DDL is refused unless explicitly allowed.
//
// It deliberately does NOT introduce a second migration ledger. `__drizzle_migrations`
// remains the single source of truth so `reconcileLegacyMigrationState` and any
// future `drizzle-kit` invocation continue to agree with it.

const MIGRATIONS_TABLE = '__drizzle_migrations';
const STATEMENT_SEPARATOR = '--> statement-breakpoint';

export interface MigrationRunResult {
  /** Tags applied by this invocation, in application order. */
  applied: string[];
  /** Tags already recorded in the ledger before this invocation. */
  alreadyApplied: string[];
}

export interface RunMigrationsOptions {
  /** Repository root containing the `drizzle/` folder. Defaults to the process cwd. */
  projectRoot?: string;
  /** Permit migrations that drop tables or columns without preserving their rows. */
  allowDestructive?: boolean;
  /** Sink for progress reporting. Defaults to `console.log`. */
  logger?: (message: string) => void;
}

export interface DestructiveFinding {
  tag: string;
  statement: string;
  reason: string;
}

interface SqliteHandle {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...parameters: unknown[]): unknown;
    all(...parameters: unknown[]): unknown[];
    run(...parameters: unknown[]): unknown;
  };
  close(): void;
}

export function databasePathFromUrl(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error(
      `Unsupported DATABASE_URL "${databaseUrl}". The migration runner only supports file: SQLite URLs.`,
    );
  }
  return databaseUrl.slice('file:'.length);
}

function splitStatements(sql: string): string[] {
  return sql
    .split(STATEMENT_SEPARATOR)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function readMigrationSql(projectRoot: string, tag: string): string {
  return fs.readFileSync(path.join(projectRoot, 'drizzle', `${tag}.sql`), 'utf8');
}

function quotedName(pattern: RegExp, statement: string): string | null {
  const match = pattern.exec(statement);
  return match?.[1] ?? match?.[2] ?? null;
}

/**
 * Classifies data-destroying DDL.
 *
 * Keyword matching alone is unusable here: SQLite cannot alter most table
 * constraints in place, so Drizzle emits the standard 12-step rebuild
 * (CREATE `__new_X` / INSERT INTO `__new_X` SELECT FROM `X` / DROP TABLE `X` /
 * ALTER TABLE `__new_X` RENAME TO `X`). Two of this project's seven checked-in
 * migrations use it, so a naive "reject DROP TABLE" rule would refuse the
 * project's own migration chain on a fresh install. A drop is only destructive
 * when the rows are not carried into a replacement that takes over the name.
 */
export function findDestructiveStatements(tag: string, sql: string): DestructiveFinding[] {
  const statements = splitStatements(sql);
  const findings: DestructiveFinding[] = [];

  const rebuiltTables = new Set<string>();
  const copiedInto = new Set<string>();
  const temporaryTables = new Set<string>();

  for (const statement of statements) {
    const renamed = /ALTER\s+TABLE\s+[`"]?(\w+)[`"]?\s+RENAME\s+TO\s+[`"]?(\w+)[`"]?/i.exec(statement);
    if (renamed?.[1] && renamed[2]) {
      rebuiltTables.add(renamed[2]);
    }
    const copied = /INSERT\s+INTO\s+[`"]?(\w+)[`"]?[\s\S]*?\bSELECT\b[\s\S]*?\bFROM\b\s+[`"]?(\w+)[`"]?/i.exec(statement);
    if (copied?.[1] && copied[2]) {
      copiedInto.add(copied[2]);
    }
    if (/CREATE\s+(TEMP|TEMPORARY)\s+TABLE/i.test(statement)) {
      const temporary = quotedName(/CREATE\s+(?:TEMP|TEMPORARY)\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?/i, statement);
      if (temporary) {
        temporaryTables.add(temporary);
      }
    }
  }

  for (const statement of statements) {
    const droppedTable = quotedName(
      /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?[`"]?(\w+)[`"]?/i,
      statement,
    );
    if (droppedTable) {
      if (temporaryTables.has(droppedTable)) {
        continue;
      }
      // Rebuild idiom: rows were copied out of this table and a replacement
      // takes over its name in the same migration.
      if (copiedInto.has(droppedTable) && rebuiltTables.has(droppedTable)) {
        continue;
      }
      findings.push({
        tag,
        statement,
        reason:
          `drops table "${droppedTable}" without copying its rows into a replacement. ` +
          'Rows in this table would be lost.',
      });
      continue;
    }

    const droppedColumn = /ALTER\s+TABLE\s+[`"]?(\w+)[`"]?\s+DROP\s+(?:COLUMN\s+)?[`"]?(\w+)[`"]?/i.exec(statement);
    if (droppedColumn?.[1] && droppedColumn[2]) {
      findings.push({
        tag,
        statement,
        reason:
          `drops column "${droppedColumn[2]}" from table "${droppedColumn[1]}". ` +
          'Values in this column would be lost.',
      });
    }
  }

  return findings;
}

function ensureLedger(db: SqliteHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )
  `);
}

function readAppliedTimestamps(db: SqliteHandle): Set<number> {
  const rows = db
    .prepare(`SELECT created_at FROM "${MIGRATIONS_TABLE}"`)
    .all() as Array<{ created_at: number | string | null }>;
  return new Set(
    rows
      .map((row) => Number(row.created_at))
      .filter((value) => Number.isFinite(value)),
  );
}

/** Returns the migrations that are present on disk but absent from the ledger. */
export function findPendingMigrations(
  db: SqliteHandle,
  migrations: MigrationMetadata[],
): MigrationMetadata[] {
  ensureLedger(db);
  const applied = readAppliedTimestamps(db);
  return migrations.filter((migration) => !applied.has(migration.when));
}

function assertNoForeignKeyViolations(db: SqliteHandle, tag: string): void {
  const violations = db.prepare('PRAGMA foreign_key_check').all() as Array<{
    table?: string;
    rowid?: number;
  }>;
  if (violations.length > 0) {
    const summary = violations
      .slice(0, 5)
      .map((violation) => `${violation.table ?? 'unknown'}#${violation.rowid ?? '?'}`)
      .join(', ');
    throw new Error(
      `Migration ${tag} left ${violations.length} foreign-key violation(s) (${summary}). ` +
        'The migration was rolled back.',
    );
  }
}

/**
 * Applies every pending Drizzle migration.
 *
 * Foreign-key enforcement is suspended around the transaction — not inside it,
 * where SQLite would ignore the pragma — so table rebuilds cannot cascade-delete
 * rows out of child tables.
 */
export function runMigrations(
  databaseUrl: string,
  options: RunMigrationsOptions = {},
): MigrationRunResult {
  const projectRoot = options.projectRoot ?? process.cwd();
  const log = options.logger ?? ((message: string) => console.log(message));
  const migrations = readMigrationMetadata(projectRoot);
  const db = new Database(databasePathFromUrl(databaseUrl)) as unknown as SqliteHandle;

  try {
    const pending = findPendingMigrations(db, migrations);
    const alreadyApplied = migrations
      .filter((migration) => !pending.includes(migration))
      .map((migration) => migration.tag);

    if (pending.length === 0) {
      return { applied: [], alreadyApplied };
    }

    if (!options.allowDestructive) {
      const findings = pending.flatMap((migration) =>
        findDestructiveStatements(migration.tag, readMigrationSql(projectRoot, migration.tag)),
      );
      if (findings.length > 0) {
        const detail = findings
          .map((finding) => `  - ${finding.tag}: ${finding.reason}`)
          .join('\n');
        throw new Error(
          `Refusing to apply ${findings.length} destructive migration statement(s):\n${detail}\n` +
            'Back up the database, then re-run with allowDestructive to proceed.',
        );
      }
    }

    // SQLite ignores this pragma inside a transaction, so it must be set here.
    db.exec('PRAGMA foreign_keys = OFF');
    const applied: string[] = [];

    try {
      for (const migration of pending) {
        const statements = splitStatements(readMigrationSql(projectRoot, migration.tag));
        db.exec('BEGIN');
        try {
          for (const statement of statements) {
            db.exec(statement);
          }
          db.prepare(
            `INSERT INTO "${MIGRATIONS_TABLE}" (hash, created_at) VALUES (?, ?)`,
          ).run(migration.hash, migration.when);
          assertNoForeignKeyViolations(db, migration.tag);
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw new Error(
            `Migration ${migration.tag} failed and was rolled back: ${(error as Error).message}`,
            { cause: error },
          );
        }
        applied.push(migration.tag);
        log(`Applied migration ${migration.tag}.`);
      }
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }

    return { applied, alreadyApplied };
  } finally {
    db.close();
  }
}

/** Reports the ledger state for startup logging and the operator CLI. */
export function describeMigrationState(
  databaseUrl: string,
  projectRoot: string = process.cwd(),
): { current: string | null; pending: string[] } {
  const migrations = readMigrationMetadata(projectRoot);
  const db = new Database(databasePathFromUrl(databaseUrl)) as unknown as SqliteHandle;
  try {
    const pending = findPendingMigrations(db, migrations);
    const pendingTags = new Set(pending.map((migration) => migration.tag));
    const appliedTags = migrations
      .map((migration) => migration.tag)
      .filter((tag) => !pendingTags.has(tag));
    return {
      current: appliedTags.at(-1) ?? null,
      pending: pending.map((migration) => migration.tag),
    };
  } finally {
    db.close();
  }
}
