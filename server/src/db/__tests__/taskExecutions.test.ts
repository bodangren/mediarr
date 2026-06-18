import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseClient } from '../drizzleClient';
import * as schema from '../schema';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle');

type SqliteExec = { exec: (sql: string) => void };
type SqliteStmt = { all: (params?: unknown[]) => unknown[] };

function applyMigrations(sqlite: SqliteExec): void {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const statements = content.split('--> statement-breakpoint');
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        sqlite.exec(trimmed);
      }
    }
  }
}

type PragmaColumn = { name: string; type: string; notnull: number; pk: number };

function pragmaTableInfo(
  sqlite: { prepare: (sql: string) => SqliteStmt },
  tableName: string,
): PragmaColumn[] {
  return sqlite.prepare(`PRAGMA table_info("${tableName}")`).all() as PragmaColumn[];
}

function indexExists(
  sqlite: { prepare: (sql: string) => SqliteStmt },
  indexName: string,
): boolean {
  const rows = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name = ?`)
    .all([indexName]) as Array<{ name: string }>;
  return rows.length > 0;
}

describe('taskExecutions schema (Phase 1: FR-1, FR-2)', () => {
  describe('Drizzle schema export', () => {
    it('exposes a `taskExecutions` table symbol from the schema module', () => {
      expect(schema.taskExecutions).toBeDefined();
    });

    it('declares a TaskExecutionStatusEnum covering SUCCESS, FAILED, and RUNNING', () => {
      expect(Array.isArray(schema.TaskExecutionStatusEnum)).toBe(true);
      const values = schema.TaskExecutionStatusEnum as readonly string[];
      expect(values).toContain('SUCCESS');
      expect(values).toContain('FAILED');
      expect(values).toContain('RUNNING');
    });
  });

  describe('Migration-applied table layout (FR-1.1, FR-1.2)', () => {
    let inMemory: DatabaseClient;
    const tableName = 'TaskExecution';

    beforeAll(() => {
      inMemory = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
      applyMigrations(inMemory.sqlite);
    });

    afterAll(async () => {
      await inMemory.$disconnect();
    });

    it('creates the TaskExecution table with all required columns', () => {
      const info = pragmaTableInfo(inMemory.sqlite, tableName);
      const columnNames = info.map((c) => c.name);
      expect(columnNames).toEqual(
        expect.arrayContaining([
          'id',
          'taskName',
          'startedAt',
          'completedAt',
          'status',
          'durationMs',
          'errorMessage',
        ]),
      );
    });

    it('uses INTEGER PRIMARY KEY for id (autoincrement semantics)', () => {
      const info = pragmaTableInfo(inMemory.sqlite, tableName);
      const idCol = info.find((c) => c.name === 'id');
      expect(idCol).toBeDefined();
      expect(idCol!.type.toUpperCase()).toBe('INTEGER');
      expect(idCol!.pk).toBe(1);
    });

    it('marks taskName, startedAt, and status NOT NULL', () => {
      const info = pragmaTableInfo(inMemory.sqlite, tableName);
      for (const name of ['taskName', 'startedAt', 'status']) {
        const col = info.find((c) => c.name === name);
        expect(col, `column ${name} should exist`).toBeDefined();
        expect(col!.notnull, `column ${name} should be NOT NULL`).toBe(1);
      }
    });

    it('marks completedAt, durationMs, and errorMessage nullable', () => {
      const info = pragmaTableInfo(inMemory.sqlite, tableName);
      for (const name of ['completedAt', 'durationMs', 'errorMessage']) {
        const col = info.find((c) => c.name === name);
        expect(col, `column ${name} should exist`).toBeDefined();
        expect(col!.notnull, `column ${name} should be nullable`).toBe(0);
      }
    });

    it('creates a TaskExecution_taskName_startedAt index for fast recent-history queries', () => {
      const hasIndex = indexExists(inMemory.sqlite, 'TaskExecution_taskName_startedAt_idx');
      expect(hasIndex).toBe(true);
    });

    it('inserts and reads a row with all required fields round-trip', async () => {
      const rows = await inMemory.drizzle
        .insert(schema.taskExecutions)
        .values({
          taskName: 'rss-sync',
          startedAt: new Date('2026-05-24T12:00:00Z'),
          status: 'RUNNING',
        })
        .returning();
      expect(rows).toHaveLength(1);
      const row = rows[0]!;
      expect(row.id).toBeGreaterThan(0);
      expect(row.taskName).toBe('rss-sync');
      expect(row.status).toBe('RUNNING');
      expect(row.completedAt).toBeNull();
      expect(row.durationMs).toBeNull();
      expect(row.errorMessage).toBeNull();
    });

    it('rejects inserts missing the non-null status column', async () => {
      await expect(
        inMemory.drizzle
          .insert(schema.taskExecutions)
          // @ts-expect-error - intentionally omit status to assert NOT NULL constraint
          .values({
            taskName: 'rss-sync',
            startedAt: new Date(),
          }),
      ).rejects.toThrow();
    });
  });
});
