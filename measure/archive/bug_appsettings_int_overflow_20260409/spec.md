# Specification: AppSettings INT Overflow Bug Fix

## Overview

Fix critical startup crash caused by `createdAt`/`updatedAt` columns in `AppSettings` table using INT (4-byte integer) which overflows with `Date.now()` millisecond values.

## Problem Statement

- `AppSettings.createdAt` and `AppSettings.updatedAt` columns are defined as INT
- `Date.now()` returns milliseconds since Unix epoch (~1.77 billion in 2026)
- INT max value is ~2.14 billion, causing **P2023** (integer overflow) Prisma errors on startup
- `npm run dev` fails immediately when AppSettings are accessed

## Root Cause

Prisma schema uses `@default(dbgenerated("Date.now()"))` or similar that generates INT instead of BIGINT for timestamp columns.

## Scope

1. Identify all affected timestamp columns across the schema
2. Create Prisma migration to change INT → BIGINT for `createdAt`/`updatedAt` fields
3. Verify migration works against existing database
4. Ensure application starts successfully after migration

## Acceptance Criteria

1. `npm run dev` starts without P2023 errors
2. All timestamp fields use BIGINT or proper DateTime mapping
3. Existing AppSettings data is preserved after migration
4. Test suite passes with migration applied

## Out of Scope

- Full Drizzle migration (chore_drizzle_migration track is PAUSED)
- Schema changes beyond timestamp overflow fix