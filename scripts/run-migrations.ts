// Operator/container entrypoint for schema migrations. Replaces `drizzle-kit
// migrate`, which applies every pending migration inside one transaction where
// SQLite silently ignores `PRAGMA foreign_keys=OFF` and table rebuilds
// cascade-delete user rows. See server/src/db/migrationRunner.ts.
//
// `--allow-destructive` opts in to migrations that drop tables or columns
// without preserving their rows. Take a backup first; see docs/migration-runbook.md.
//
// The import is dynamic on purpose. Files under scripts/ resolve against the
// root tsconfig (`module: nodenext`) while server/ uses `module: preserve`, and
// a static import across that boundary collapses to a default-only CJS
// namespace — every named import then fails at load time with "does not provide
// an export named ...". A dynamic import resolves the named exports correctly.
const { describeMigrationState, runMigrations } = await import(
  '../server/src/db/migrationRunner.js'
);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required before running migrations.');
}

const allowDestructive = process.argv.includes('--allow-destructive');
const before = describeMigrationState(databaseUrl, process.cwd());

if (before.pending.length === 0) {
  console.log(`Database schema up to date at ${before.current ?? 'baseline'} (0 pending).`);
} else {
  console.log(
    `Database schema at ${before.current ?? 'baseline'}; ` +
      `applying ${before.pending.length} pending migration(s): ${before.pending.join(', ')}`,
  );
  if (allowDestructive) {
    console.warn('Destructive migrations are ALLOWED for this run.');
  }
  const result = runMigrations(databaseUrl, { projectRoot: process.cwd(), allowDestructive });
  const after = describeMigrationState(databaseUrl, process.cwd());
  console.log(
    `Applied ${result.applied.length} migration(s). Schema now at ${after.current ?? 'baseline'} ` +
      `(${after.pending.length} pending).`,
  );
}
