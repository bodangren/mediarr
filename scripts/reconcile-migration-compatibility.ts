// The import is dynamic on purpose. Files under scripts/ resolve against the
// root tsconfig (`module: nodenext`) while server/ uses `module: preserve`, and
// a static import across that boundary collapses to a default-only CJS
// namespace — the named import then fails at load time with "does not provide
// an export named reconcileLegacyMigrationState". A dynamic import resolves the
// named exports correctly.
const { reconcileLegacyMigrationState } = await import(
  '../server/src/db/migrationCompatibility.js'
);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required before reconciling migration compatibility.');
}

const adopted = reconcileLegacyMigrationState(databaseUrl, process.cwd());
for (const migration of adopted) {
  console.log(
    `Adopted verified legacy schema as Drizzle migration ${migration.tag} (${migration.hash}).`,
  );
}
