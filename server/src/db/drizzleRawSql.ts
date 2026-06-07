import type { SQL } from 'drizzle-orm';
import type { DatabaseClient } from './drizzleClient';

export async function runRawDrizzle(
  client: DatabaseClient,
  query: SQL,
): Promise<number> {
  const { sql: rawSql, params } = query.toSQL();
  const stmt = client.sqlite.prepare(rawSql);
  const result = stmt.run(...params);
  return Number(result.changes ?? 0);
}
