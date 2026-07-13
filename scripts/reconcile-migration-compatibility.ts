import { reconcileLegacyMigrationState } from '../server/src/db/migrationCompatibility';

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
