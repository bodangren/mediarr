import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { DatabaseClient } from '../../server/src/db/drizzleClient';
import { reconcileLegacyMigrationState } from '../../server/src/db/migrationCompatibility';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const databaseUrl = `file:${path.join(repoRoot, 'mediarr.db')}`;

export function createTestDatabaseClient() {
  reconcileLegacyMigrationState(databaseUrl, repoRoot);
  const client = new DatabaseClient({ datasources: { db: { url: databaseUrl } } });
  migrate(client.db, { migrationsFolder: path.join(repoRoot, 'drizzle') });
  return client;
}

// Backwards-compatible alias for existing tests
export { createTestDatabaseClient as createTestPrismaClient };

export { databaseUrl as TEST_DATABASE_URL };
