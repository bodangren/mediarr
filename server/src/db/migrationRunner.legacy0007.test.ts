import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { runMigrations } from './migrationRunner';

const root = process.cwd();
const journal = JSON.parse(fs.readFileSync(path.join(root, 'drizzle', 'meta', '_journal.json'), 'utf-8')) as {
  version: string;
  dialect: string;
  entries: Array<{ idx: number; version: string; when: number; tag: string; breakpoints: boolean }>;
};

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** Copies the drizzle folder but records only the first N migrations in its journal. */
function projectWithPrefix(prefixCount: number): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-0007-'));
  dirs.push(projectRoot);
  const drizzle = path.join(projectRoot, 'drizzle');
  fs.mkdirSync(path.join(drizzle, 'meta'), { recursive: true });
  for (const entry of journal.entries) {
    fs.copyFileSync(path.join(root, 'drizzle', `${entry.tag}.sql`), path.join(drizzle, `${entry.tag}.sql`));
  }
  writeJournal(drizzle, journal.entries.slice(0, prefixCount));
  return projectRoot;
}

function writeJournal(drizzle: string, entries: typeof journal.entries): void {
  fs.writeFileSync(
    path.join(drizzle, 'meta', '_journal.json'),
    JSON.stringify({ ...journal, entries }, null, 2),
  );
}

describe('migration runner: 0007 with a baseline-era `when`', () => {
  it('applies 0007 once on a database whose ledger is newer than 0007.when', () => {
    const index0007 = journal.entries.findIndex((entry) => entry.tag.startsWith('0007_'));
    expect(index0007).toBeGreaterThan(0);
    expect(journal.entries[index0007]!.when).toBeLessThan(journal.entries[index0007 - 1]!.when);

    const projectRoot = projectWithPrefix(index0007);
    const databasePath = path.join(projectRoot, 'legacy.db');
    const databaseUrl = `file:${databasePath}`;
    const log = () => undefined;

    const first = runMigrations(databaseUrl, { projectRoot, logger: log, allowDestructive: true });
    expect(first.applied).not.toContain(journal.entries[index0007]!.tag);

    // A real drizzle-kit run would skip 0007 here because its `when` is older than the ledger's max
    // created_at; the custom runner matches exact `when` membership instead and must still apply it.
    writeJournal(path.join(projectRoot, 'drizzle'), journal.entries);

    const second = runMigrations(databaseUrl, { projectRoot, logger: log, allowDestructive: true });
    expect(second.applied).toContain(journal.entries[index0007]!.tag);

    const db = new Database(databasePath, { readonly: true });
    try {
      const columns = db.prepare('PRAGMA table_info("Movie")').all() as Array<{ name: string }>;
      const seriesColumns = db.prepare('PRAGMA table_info("Series")').all() as Array<{ name: string }>;
      expect(columns.map((column) => column.name)).toContain('backdropUrl');
      expect(seriesColumns.map((column) => column.name)).toContain('backdropUrl');
      const ledger = db.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get() as { n: number };
      expect(ledger.n).toBe(journal.entries.length);
    } finally {
      db.close();
    }

    // A third run is a no-op: 0007 is not replayed.
    const third = runMigrations(databaseUrl, { projectRoot, logger: log, allowDestructive: true });
    expect(third.applied).toEqual([]);
  });
});
