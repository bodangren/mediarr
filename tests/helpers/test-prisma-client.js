import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../../server/src/db/prismaClient';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const databaseUrl = `file:${path.join(repoRoot, 'mediarr.db')}`;

export function createTestPrismaClient() {
  return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
}

export { databaseUrl as TEST_DATABASE_URL };
