import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseClient } from '../../server/src/db/drizzleClient';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const databaseUrl = `file:${path.join(repoRoot, 'mediarr.db')}`;

export function createTestDatabaseClient() {
  return new DatabaseClient({ datasources: { db: { url: databaseUrl } } });
}

// Backwards-compatible alias for existing tests
export { createTestDatabaseClient as createTestPrismaClient };

export { databaseUrl as TEST_DATABASE_URL };
