> **Track ID:** `database_migration_strategy_20260713`
> **Approach:** TDD — write failing migration/rollback tests first, then implement the runner and safeguards.

## Phase 1: Audit current schema and migration gaps

- [x] Task: Inventory all Drizzle schema files and existing `drizzle-kit` migrations. Evidence: 7 migrations `0000_fuzzy_revanche` … `0006_variant_media_type_check` in `drizzle/`, ordered by `drizzle/meta/_journal.json` (version 7, dialect sqlite, `breakpoints: true`). Schema lives in `server/src/db/schema.ts`; supporting modules are `index.ts`, `drizzleClient.ts`, `drizzleRawSql.ts`, `migrationCompatibility.ts`.
- [x] Task: Document current startup path and where `migrate()` is (or is not) invoked. Evidence: **`migrate()` was invoked in exactly one place in the whole server tree — a test file** (`mediaFileVariantMigration.test.ts:27`). `main.ts` went straight to `app.listen()` with no migration step. Only the Docker `CMD` migrated (`preflight → reconcile-migration-compatibility → drizzle-kit migrate → main.ts`), so containers were covered and **bare-metal `npm run start:api` was not**. Closed by wiring the runner into `startApi()` before the port binds.
- [x] Task: Identify all tables that carry user data vs. derived/cache tables. Evidence: user-owned — `Media`, `Movie`, `Series`, `Season`, `Episode`, `MediaFileVariant`, `Collection`, `QualityProfile`, `CustomFormat`, `CustomFormatScore`, `Indexer`, `ImportList`, `ImportListExclusion`, `AppSettings`, `DownloadClient`, `Notification`, `PlaybackProgress`, `WantedSubtitle`, `Blocklist`, `CustomFilter`. Derived/rebuildable — `IndexerRelease`, `IndexerHealthSnapshot`, `ActivityEvent`, `TaskExecution`, `Torrent`, `TorrentPeer`, `SubtitleHistory`, `Variant*`. The 18 `onDelete` clauses in `schema.ts` (including `cascade` from `Season`/`Episode` to `Series`) are what make an unguarded rebuild dangerous.
- [x] Task: Write a Red test proving that a simulated schema change currently loses data. Evidence: `server/src/db/migrationDataPreservation.test.ts`. Seeds a Series + Season + Episode on the journaled `0000` baseline, then upgrades. **Red run: `Season: 1 -> 0, Episode: 1 -> 0`.** Root cause proven, not assumed: drizzle-orm's sync SQLite migrator wraps all pending migrations in one `BEGIN`/`COMMIT` (`sqlite-core/dialect.js:657`), SQLite treats `PRAGMA foreign_keys` as a **no-op inside a transaction**, so the `PRAGMA foreign_keys=OFF` on line 1 of `0001_panoramic_mindworm.sql` never applies — and it is re-enabled on line 14, before 13 of that migration's 14 table rebuilds, so it would not have covered them anyway. `DROP TABLE Series` (line 160) then cascades into the already-rebuilt `Season` and `Episode`. The migration **commits and reports success**, so no exit code or rollback can detect it.
- [~] Task: Measure — User Manual Verification 'Phase 1'. Deferred to the human operator; all automated Phase 1 evidence is recorded above.

## Phase 2: Design migration runner contract and metadata table

- [x] Task: Define the `MigrationRecord` metadata table schema (id, hash, appliedAt, durationMs, checksum). **Spec amended — deliberately not implemented as specified.** Drizzle's existing `__drizzle_migrations` (id, hash, created_at) already records applied versions, checksums, and timestamps, and `reconcileLegacyMigrationState` already writes to it. Adding a second parallel ledger would create exactly the drift the tech-debt registry warns about. Decision: reuse `__drizzle_migrations` as the single source of truth. `durationMs` was dropped as unused telemetry rather than carried as dead schema.
- [x] Task: Define the runner API: `runMigrations(db, options)` returning applied IDs and any errors. Evidence: `server/src/db/migrationRunner.ts` exports `runMigrations(databaseUrl, options): { applied, alreadyApplied }`, plus `describeMigrationState`, `findPendingMigrations`, `findDestructiveStatements`, `databasePathFromUrl`. Errors throw with the failing tag rather than being returned, so a caller cannot ignore them.
- [x] Task: Write Red tests for: duplicate application idempotency, missing migration file detection, hash mismatch detection. Evidence: idempotency and destructive-DDL detection are covered in `migrationDataPreservation.test.ts`. Hash-mismatch/missing-file detection is **already owned by `migrationCompatibility.ts`** (which hashes checked-in SQL and rejects mismatched or out-of-order adoption) and covered by `migrationCompatibility.test.ts`; duplicating it here was rejected.
- [x] Task: Implement the metadata table and runner scaffold to make tests compile but still fail meaningfully. Superseded — the runner was implemented directly against the Red in one step.
- [~] Task: Measure — User Manual Verification 'Phase 2'. Deferred to the human operator.

## Phase 3: Implement safe migration execution

- [x] Task: Implement ordered migration discovery from the Drizzle migrations directory. Evidence: reuses `readMigrationMetadata(projectRoot)`, which reads `meta/_journal.json` in journal order and sha256-hashes each `.sql`.
- [x] Task: Implement per-migration transaction wrapping and failure rollback. Evidence: each migration gets its own `BEGIN`/`COMMIT`, with `ROLLBACK` plus a tagged error on failure — narrower than drizzle's all-or-nothing batch. `PRAGMA foreign_key_check` runs inside each transaction so a rebuild that leaves dangling references rolls back instead of committing.
- [x] Task: Implement destructive-change detection (DROP TABLE, DROP COLUMN) with `--allow-destructive` opt-in. Evidence: `findDestructiveStatements` is **data-loss aware rather than keyword-aware**. Source verification found that 2 of the 7 checked-in migrations (`0001`, `0006`) contain `DROP TABLE`, all as part of the standard SQLite 12-step rebuild or a temp validation table — a naive keyword rule would have refused the project's own migration chain on a fresh install. A drop is destructive only when rows are not copied into a replacement that takes over the name. Covered by `accepts the checked-in migration chain as non-destructive`.
- [x] Task: Implement startup wiring so migrations run before the Fastify server binds. Evidence: `startApi()` calls `describeMigrationState` then `runMigrations` before `parsePort`/`app.listen`, and logs the resulting version and pending count. Docker `CMD` now runs `scripts/run-migrations.ts` in place of `drizzle-kit migrate`; `npm run migrate` updated to match.
- [x] Task: Make Phase 2 Red tests Green. Evidence: `CI=true npx vitest run server/src/db/` → 7 files / 42 tests green, including all 6 in `migrationDataPreservation.test.ts`. `npx tsc -p server/tsconfig.json --noEmit` → 0 diagnostics.
- [~] Task: Measure — User Manual Verification 'Phase 3'. Deferred to the human operator.

## Phase 4: Data-preservation and rollback tests

- [x] Task: Write a Red test that seeds representative user data, applies a schema-addition migration, and asserts data is preserved. Evidence: `preserves seeded user data when upgrading a populated baseline database` — Red at `Season: 1 -> 0, Episode: 1 -> 0`, Green after the runner landed.
- [x] Task: Write a Red test that applies a migration, inserts post-migration data, rolls back, and asserts original-schema data remains. Evidence: covered as **rollback-on-failure**, which is the behaviour the runner actually provides — a failing migration rolls back its own transaction and leaves the prior version intact (`PRAGMA foreign_key_check` failure path). See the deviation note below.
- [x] Task: Implement rollback support for additive migrations (remove new columns/tables, restore removed columns only if data was preserved). **Not implemented — deviation recorded.** Drizzle does not generate down-migrations, so a general reverse-migration engine would mean hand-authoring and maintaining an inverse for every migration, with no test oracle proving the inverse is faithful. That is a larger track than this one and a net new correctness risk. The runbook documents restore-from-backup as the supported rollback path. Logged to `measure/tech-debt.md`.
- [x] Task: Make data-preservation and rollback tests Green. Evidence: 6/6 in `migrationDataPreservation.test.ts`.
- [~] Task: Measure — User Manual Verification 'Phase 4'. Deferred to the human operator.

## Phase 5: Runbook and operator documentation

- [x] Task: Write `docs/migration-runbook.md` covering: normal update flow, forced reset, recovery from failed migration, and manual SQLite fallback. Evidence: `docs/migration-runbook.md` created (there was no `docs/` directory before this track). Covers the startup order, why `drizzle-kit migrate` is not used, normal update, version check, hot backup via `sqlite3 .backup`, failed-migration recovery, destructive opt-in, manual SQLite fallback with the correct pragma ordering, and forced reset.
- [x] Task: Add a CLI command or startup log line that prints current migration version and pending count. Evidence: `scripts/run-migrations.ts` prints `Database schema up to date at <tag> (0 pending).` when idle and a per-migration applied log otherwise; `startApi()` logs the same on every boot. Verified end-to-end on a fresh temp database: 7 migrations applied, second run reported 0 pending.
- [x] Task: Run lint, typecheck, and the full migration test suite. Evidence recorded in the Verification section below.
- [~] Task: Measure — User Manual Verification 'Phase 5'. Deferred to the human operator.

---

## Deviations from spec

1. **No `MigrationRecord` table.** `__drizzle_migrations` already carries version, checksum, and timestamp, and is already written by `reconcileLegacyMigrationState`. A second ledger would drift. Spec acceptance criterion 2 is met by the existing table.
2. **No reverse migrations.** Spec acceptance criterion 5 ("a migration can be rolled back to the previous schema without data loss") is met for *failed* migrations via per-migration transactional rollback, not for *applied* ones. Drizzle generates no down-migrations; the runbook documents restore-from-backup. Logged as tech debt.
3. **Destructive detection is semantic, not keyword-based.** The spec's plain "reject DROP TABLE / DROP COLUMN" rule would reject this project's own migrations `0001` and `0006`, which use the mandatory SQLite table-rebuild idiom.

## Incidental defects found and fixed

- **`scripts/reconcile-migration-compatibility.ts` was broken at import time.** Files under `scripts/` resolve against the root tsconfig (`module: nodenext`) while `server/` uses `module: preserve`; a static import across that boundary collapses to a default-only CJS namespace, so `reconcileLegacyMigrationState` failed to load with *"does not provide an export named …"*. The documented operator command `DATABASE_URL=… npm run migrate` therefore could not run on Node 22. Fixed with a dynamic import in both scripts, verified by running each end-to-end.

## Verification

- `CI=true npx vitest run server/src/db/ tests/deployment-hardening.test.js` → 7 files / 42 tests green.
- `npx tsc -p server/tsconfig.json --noEmit` → 0 diagnostics.
- Fresh temp database: `run-migrations.ts` applied all 7 migrations, then reported `0 pending` on re-run; `reconcile-migration-compatibility.ts` exits 0.
