# Spec: Prisma Naming Residue Cleanup

## Overview

The Drizzle migration is complete (archived track `chore_drizzle_migration_20260314`), but Prisma naming residue remains throughout the codebase. This creates confusion about which ORM is active and makes onboarding harder.

## Problem Statement

Knowledge graph analysis (2026-05-26) found:

| Issue | Location | Count |
|-------|----------|-------|
| `PrismaClient` type shim | `server/src/types/prisma.ts` | 1 file |
| `createPrismaMock` helpers in tests | Various `.test.ts` files | ~15 files |
| `createMockPrisma` helpers | `tests/api-calendar.test.ts`, `LibraryScanService.test.ts` | 2 files |
| `makePrisma` helpers | Various test files | ~8 files |
| `makeMoviePrisma` helper | `BulkImportService.test.ts` | 1 file |
| Stale `OPENAI_API_KEY` in `.env` | `.env` | 1 file (tech-debt.md item) |

These are naming-only issues — the runtime code already uses Drizzle. But the naming creates a false impression that Prisma is still in use.

## Stories

### S1: Remove PrismaClient type shim
As a **developer**, I want the `PrismaClient` type shim removed so that no code references the old ORM type.

**Acceptance Criteria:**
```gherkin
Given server/src/types/prisma.ts defines PrismaClient
When all references to PrismaClient are updated to use DatabaseClient (from drizzleClient.ts)
Then server/src/types/prisma.ts can be deleted
And all imports of PrismaClient resolve to DatabaseClient
And CI passes with zero type errors

Given VariantBackfillService.ts imports PrismaClient
When the import is changed to DatabaseClient
Then the constructor still accepts the correct database type
And existing tests pass
```

**Estimate:** M
**Priority:** Must

### S2: Rename test mock helpers from Prisma to Drizzle
As a **developer**, I want test mock helpers renamed from `createPrismaMock`/`makePrisma` to `createDrizzleMock`/`makeDrizzle` so that test code accurately reflects the ORM in use.

**Acceptance Criteria:**
```gherkin
Given a test file using createPrismaMock()
When the helper is renamed to createDrizzleMock
And the import is updated
Then the test still passes
And the helper returns a mock matching Drizzle's API surface

Given a test file using makePrisma()
When the helper is renamed to makeDb() or makeDrizzle()
And all call sites are updated
Then the test still passes
```

**Estimate:** L
**Priority:** Should

### S3: Remove stale OPENAI_API_KEY from .env
As a **developer**, I want the old `OPENAI_API_KEY` removed from `.env` so that there's no confusion about which AI provider is configured.

**Acceptance Criteria:**
```gherkin
Given .env contains OPENAI_API_KEY
When the key is removed (the project uses OpenRouter via AI_GATEWAY_BASE_URL)
Then the application still starts correctly
And AI features still work via the gateway
```

**Estimate:** S
**Priority:** Could

## Out of Scope
- Changing runtime behavior (this is naming-only)
- Migrating the `$executeRawUnsafe` shim (tracked separately in `remove_prisma_shim_20260508`)
- Archiving old Prisma migration files
