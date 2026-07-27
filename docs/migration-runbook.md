# Database Migration Runbook

Mediarr stores everything in one SQLite database (`$CONFIG_DIR/mediarr.db`, `/config/mediarr.db`
in Docker). Schema changes ship as versioned SQL files in `drizzle/` and are applied by
Mediarr's own migration runner.

## How migrations are applied

On every start, in order:

1. `server/src/config/preflight.ts` — validates the encryption key and that `/config` and `/data`
   are writable. Fails closed before anything touches the database.
2. `scripts/reconcile-migration-compatibility.ts` — adopts a structurally verified legacy schema
   (one created by the old `drizzle-kit push` path) into the migration ledger, so it is not
   re-migrated from scratch.
3. `scripts/run-migrations.ts` — applies pending migrations.
4. `server/src/main.ts` — applies any still-pending migrations before the API binds. A bare-metal
   `npm run start:api` has no separate migration step, so startup owns it there.

Applied migrations are recorded in the `__drizzle_migrations` table. That table is the single
source of truth; there is no second ledger.

### Why not `drizzle-kit migrate`

`drizzle-kit migrate` applies **all** pending migrations inside **one** transaction. SQLite
treats `PRAGMA foreign_keys` as a no-op inside a transaction, so the `PRAGMA foreign_keys=OFF`
that Drizzle itself emits at the top of a table-rebuild migration never takes effect. The rebuild
then runs with foreign keys enforced, and `DROP TABLE <parent>` cascades into child tables that
were already rebuilt and repopulated.

The failure is silent: the migration commits and reports success while user rows are gone. On a
populated database, upgrading across `0001_panoramic_mindworm` this way destroys every `Season`
and `Episode` row while leaving `Series` intact.

Mediarr's runner (`server/src/db/migrationRunner.ts`) keeps Drizzle's file format and ledger but:

- disables foreign keys **outside** the transaction and restores them afterwards,
- gives each migration its own transaction, so a failure rolls back exactly one migration,
- runs `PRAGMA foreign_key_check` after each migration and rolls back on any violation,
- refuses destructive DDL unless explicitly allowed.

Regression coverage: `server/src/db/migrationDataPreservation.test.ts`.

## Normal update flow

Docker:

```bash
docker compose pull
docker compose up -d
docker compose logs -f mediarr   # look for "Applied migration ..." / "0 pending"
```

Bare metal:

```bash
DATABASE_URL="file:$CONFIG_DIR/mediarr.db" npm run migrate
```

## Check the current schema version

```bash
DATABASE_URL="file:$CONFIG_DIR/mediarr.db" npx tsx scripts/run-migrations.ts
```

With nothing pending it prints the current tag and exits without writing:

```
Database schema up to date at 0006_variant_media_type_check (0 pending).
```

Startup logs the same line on every boot.

## Back up before any upgrade

Always take a hot backup with SQLite's own API — copying the file while the daemon is running can
capture a torn WAL.

```bash
sqlite3 "$CONFIG_DIR/mediarr.db" ".backup '$CONFIG_DIR/mediarr.db.bak'"
sqlite3 "$CONFIG_DIR/mediarr.db.bak" "PRAGMA integrity_check;"   # expect: ok
```

## Recovering from a failed migration

A failed migration is rolled back, so the database is left at the last successfully applied
version. Nothing is half-applied.

1. Read the error. It names the migration and the reason:
   `Migration 0005_truthful_rss_episode_links failed and was rolled back: <cause>`.
2. Confirm where the schema actually is:
   ```bash
   DATABASE_URL="file:$CONFIG_DIR/mediarr.db" npx tsx scripts/run-migrations.ts
   ```
3. Verify the database is intact:
   ```bash
   sqlite3 "$CONFIG_DIR/mediarr.db" "PRAGMA integrity_check; PRAGMA foreign_key_check;"
   ```
4. If the schema is sound, fix the underlying cause (usually disk space or permissions on
   `/config`) and re-run. If it is not, restore the backup:
   ```bash
   docker compose down
   cp "$CONFIG_DIR/mediarr.db.bak" "$CONFIG_DIR/mediarr.db"
   docker compose up -d
   ```

## Destructive migrations

The runner refuses a migration that drops a table or column without preserving its rows:

```
Refusing to apply 1 destructive migration statement(s):
  - 0007_example: drops column "path" from table "Series". Values in this column would be lost.
Back up the database, then re-run with allowDestructive to proceed.
```

The standard SQLite table rebuild (`CREATE __new_X` / `INSERT INTO __new_X SELECT FROM X` /
`DROP TABLE X` / `ALTER TABLE __new_X RENAME TO X`) is **not** flagged — the rows are carried into
the replacement. Two of the checked-in migrations use that idiom.

To proceed anyway, after taking a backup:

```bash
DATABASE_URL="file:$CONFIG_DIR/mediarr.db" npx tsx scripts/run-migrations.ts --allow-destructive
```

## Manual SQLite fallback

Only when the runner cannot proceed and you accept the risk.

```bash
docker compose down                                   # never edit a live database
sqlite3 "$CONFIG_DIR/mediarr.db" ".backup '$CONFIG_DIR/mediarr.db.manual.bak'"
sqlite3 "$CONFIG_DIR/mediarr.db"
```

Inspect the ledger and apply a migration by hand:

```sql
SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at;
PRAGMA foreign_keys=OFF;            -- outside any transaction
BEGIN;
-- paste the statements from drizzle/<tag>.sql, minus the `--> statement-breakpoint` markers
INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('<sha256 of the .sql file>', <when>);
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_key_check;           -- expect no rows
```

`<when>` is the `when` value for that tag in `drizzle/meta/_journal.json`; `<sha256>` is
`sha256sum drizzle/<tag>.sql`. Getting either wrong makes the runner re-apply or permanently skip
the migration.

## Forced reset (destroys all data)

Last resort. The library, settings, indexers, and history are all lost.

```bash
docker compose down
mv "$CONFIG_DIR/mediarr.db" "$CONFIG_DIR/mediarr.db.discarded"
docker compose up -d      # a fresh database is created and fully migrated
```

## Scope

- SQLite only.
- Single process. The runner assumes no other process is migrating concurrently.
- Rolling back an *applied* migration is manual — Drizzle does not generate down-migrations.
  Restore from backup instead.
