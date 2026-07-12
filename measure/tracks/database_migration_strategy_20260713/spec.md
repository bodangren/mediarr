# Specification: Database Migration and Data Preservation Strategy

## Overview

Mediarr currently ships with an empty SQLite database and no migration path for existing user data. The 2026-03-30 Drizzle migration recreated the database from scratch, leaving a backup (`mediarr.db.prisma.bak`) but no supported path back to a live schema. This track defines and implements a migration strategy that preserves user data across schema changes, making Mediarr safe for production deployments and updates.

## Problem

- Schema changes currently require wiping the database or manual SQLite surgery.
- There is no versioned migration baseline; `drizzle-kit` generates migrations but there is no runner test harness.
- User data (settings, library, wanted list, indexer configs, download history) is lost on any incompatible schema change.
- The Docker `/config` volume persists `mediarr.db`, but a new image with a changed schema will fail to start or silently corrupt data.

## Goals

1. Establish a versioned migration baseline for the current schema.
2. Provide an additive-only migration runner that refuses destructive changes without explicit user opt-in.
3. Preserve all user data across migrations unless the user explicitly requests a reset.
4. Add automated tests that prove migration up/down and data preservation work.
5. Document a runbook for operators recovering from migration failures.

## Non-goals

- Converting existing `mediarr.db.prisma.bak` to the new schema (out of scope; documented as manual-only).
- Supporting database engines other than SQLite.
- Adding automatic cloud backup.

## Acceptance Criteria

- [ ] A migration runner executes Drizzle-generated SQL migrations in deterministic order.
- [ ] A migration metadata table records applied versions, checksums, and applied timestamps.
- [ ] A failing migration leaves the database in the pre-migration state (transactional or rollback).
- [ ] Tests prove that seed data survives a forward migration across a representative schema change.
- [ ] Tests prove that a migration can be rolled back to the previous schema without data loss.
- [ ] The runner rejects destructive DDL (DROP TABLE, DROP COLUMN) unless a `--allow-destructive` flag is set.
- [ ] Startup logic runs pending migrations before binding the API server.
- [ ] Operator runbook exists at `docs/migration-runbook.md` with failure-recovery steps.

## Out of Scope

- Backward compatibility with the old Prisma schema.
- Multi-node concurrency; migration runner assumes single Bun process.
