import type { SQL } from 'drizzle-orm';
import type { DatabaseClient } from './drizzleClient';

export async function runRawDrizzle(
  client: DatabaseClient,
  query: SQL,
): Promise<number> {
  // `client.db` is the Drizzle (better-sqlite3) instance; `.run()` executes the
  // compiled SQL and returns the better-sqlite3 RunResult with `.changes`.
  const result = client.db.run(query);
  return Number(result.changes ?? 0);
}
