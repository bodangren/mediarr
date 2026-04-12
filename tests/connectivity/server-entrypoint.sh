#!/bin/bash
set -e

echo "[entrypoint] Running Drizzle migrations…"
cd /app
DATABASE_URL="${DATABASE_URL}" \
  bun node_modules/.bin/drizzle-kit migrate --config=drizzle.config.ts 2>/dev/null || \
  bun x drizzle-kit migrate --config=drizzle.config.ts

echo "[entrypoint] Seeding connectivity fixtures…"
DATABASE_URL="${DATABASE_URL}" \
  bun tests/connectivity/scripts/seed-fixtures.ts

echo "[entrypoint] Starting Mediarr server…"
exec bun --no-addons server/src/main.ts
