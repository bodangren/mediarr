#!/bin/bash
set -e

DB_PATH="${DATABASE_URL#file:}"
# Always start fresh — this DB is ephemeral for the connectivity test.
rm -f "${DB_PATH}"
echo "[entrypoint] Applying Drizzle migrations via sqlite3 CLI to ${DB_PATH}…"

# Apply each migration SQL file in order (bypasses drizzle-kit's bundled better-sqlite3).
for sql_file in /app/drizzle/*.sql; do
  echo "[entrypoint]   → ${sql_file}"
  sqlite3 "${DB_PATH}" < "${sql_file}"
done

# Record migrations as applied so drizzle ORM doesn't try to re-run them.
sqlite3 "${DB_PATH}" "
CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT NOT NULL UNIQUE,
  created_at INTEGER
);
INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at)
  VALUES ('connectivity-e2e-applied', strftime('%s','now'));
"

echo "[entrypoint] Seeding connectivity fixtures…"
DATABASE_URL="${DATABASE_URL}" \
  node_modules/.bin/tsx tests/connectivity/scripts/seed-fixtures.ts

echo "[entrypoint] Starting Mediarr server (tsx)…"
exec node_modules/.bin/tsx server/src/main.ts
