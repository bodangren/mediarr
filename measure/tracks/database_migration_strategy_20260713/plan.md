> **Track ID:** `database_migration_strategy_20260713`
> **Approach:** TDD — write failing migration/rollback tests first, then implement the runner and safeguards.

## Phase 1: Audit current schema and migration gaps

- [ ] Task: Inventory all Drizzle schema files and existing `drizzle-kit` migrations.
- [ ] Task: Document current startup path and where `migrate()` is (or is not) invoked.
- [ ] Task: Identify all tables that carry user data vs. derived/cache tables.
- [ ] Task: Write a Red test proving that a simulated schema change currently loses data.
- [ ] Task: Measure — User Manual Verification 'Phase 1'.

## Phase 2: Design migration runner contract and metadata table

- [ ] Task: Define the `MigrationRecord` metadata table schema (id, hash, appliedAt, durationMs, checksum).
- [ ] Task: Define the runner API: `runMigrations(db, options)` returning applied IDs and any errors.
- [ ] Task: Write Red tests for: duplicate application idempotency, missing migration file detection, hash mismatch detection.
- [ ] Task: Implement the metadata table and runner scaffold to make tests compile but still fail meaningfully.
- [ ] Task: Measure — User Manual Verification 'Phase 2'.

## Phase 3: Implement safe migration execution

- [ ] Task: Implement ordered migration discovery from the Drizzle migrations directory.
- [ ] Task: Implement per-migration transaction wrapping and failure rollback.
- [ ] Task: Implement destructive-change detection (DROP TABLE, DROP COLUMN) with `--allow-destructive` opt-in.
- [ ] Task: Implement startup wiring so migrations run before the Fastify server binds.
- [ ] Task: Make Phase 2 Red tests Green.
- [ ] Task: Measure — User Manual Verification 'Phase 3'.

## Phase 4: Data-preservation and rollback tests

- [ ] Task: Write a Red test that seeds representative user data, applies a schema-addition migration, and asserts data is preserved.
- [ ] Task: Write a Red test that applies a migration, inserts post-migration data, rolls back, and asserts original-schema data remains.
- [ ] Task: Implement rollback support for additive migrations (remove new columns/tables, restore removed columns only if data was preserved).
- [ ] Task: Make data-preservation and rollback tests Green.
- [ ] Task: Measure — User Manual Verification 'Phase 4'.

## Phase 5: Runbook and operator documentation

- [ ] Task: Write `docs/migration-runbook.md` covering: normal update flow, forced reset, recovery from failed migration, and manual SQLite fallback.
- [ ] Task: Add a CLI command or startup log line that prints current migration version and pending count.
- [ ] Task: Run lint, typecheck, and the full migration test suite.
- [ ] Task: Measure — User Manual Verification 'Phase 5'.
