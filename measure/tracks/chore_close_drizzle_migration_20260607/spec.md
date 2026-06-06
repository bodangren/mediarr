# Spec: Close Drizzle Migration (Shim Removal + Naming Residue)

## Overview

The Prisma→Drizzle migration (archived `chore_drizzle_migration_20260314`) left a tail of
residue that has spawned multiple follow-up tracks. This track consolidates that tail into a
single decisive pass so the migration is finished once and not revisited.

It supersedes and merges:
- `remove_prisma_shim_20260508` (raw-SQL shim removal — Phase 1 audit already started)
- `chore_prisma_naming_cleanup_20260526` (type shim + mock-helper naming + stale env key)

The authoritative testing approach is preserved in [test-strategy.md](./test-strategy.md).

## Goal

Eliminate every remaining Prisma artifact — runtime and naming — so the codebase
unambiguously uses Drizzle:

1. Remove the `$executeRawUnsafe`/`$queryRawUnsafe` shim and the `sqlite.query` vs
   `sqlite.prepare` Bun/Node branching.
2. Delete the `PrismaClient` type shim (`server/src/types/prisma.ts`) in favor of
   `DatabaseClient` (`drizzleClient.ts`).
3. Rename Prisma-named test mock helpers (`createPrismaMock`, `createMockPrisma`,
   `makePrisma`, `makeMoviePrisma`) to Drizzle/Db naming.
4. Remove the stale `OPENAI_API_KEY` from `.env` (project uses OpenRouter via
   `AI_GATEWAY_BASE_URL`).

## Stories

### S1: Audit & catalog raw-SQL shim call sites *(carried over — in progress)*
As a developer, I want every `$executeRawUnsafe`/`$queryRawUnsafe`/`$queryRaw` call site
catalogued with a suggested Drizzle replacement, so the replacement work has a known blast
radius.

**Acceptance Criteria:**
```gherkin
Given the server source tree
When the audit test scans for raw-SQL shim usage
Then it reports the known call sites (main.ts executeRaw, statsRoutes $queryRawUnsafe, SystemHealthService $queryRaw)
And each site has a documented Drizzle replacement
```
**Estimate:** S | **Priority:** Must

### S2: Replace raw-SQL shim with Drizzle-native queries
As a developer, I want the raw-SQL shim replaced with type-safe Drizzle queries and the
Bun/Node branching removed, so there is a single DB access path.

**Acceptance Criteria:**
```gherkin
Given each catalogued raw-SQL call site
When it is replaced with a Drizzle sql`` template or ORM method
Then the query mutates/returns identical row state (verified against in-memory SQLite)
And the sqlite.query vs sqlite.prepare branching is gone
```
**Estimate:** L | **Priority:** Must

### S3: Verify affected routes
As a developer, I want integration coverage of the routes that used the shim, so removal
causes no regression.

**Acceptance Criteria:**
```gherkin
Given /api/stats and /api/system/health and the startup AppSettings repair path
When exercised via Fastify inject against a seeded in-memory DB
Then responses match the current production contract
```
**Estimate:** M | **Priority:** Must

### S4: Remove PrismaClient type shim
As a developer, I want `server/src/types/prisma.ts` deleted and all references using
`DatabaseClient`, so no code references the old ORM type.

**Acceptance Criteria:**
```gherkin
Given files importing PrismaClient from types/prisma
When each is changed to DatabaseClient from drizzleClient.ts
Then types/prisma.ts is deleted
And grep for PrismaClient in non-archived code returns zero hits
And CI passes with zero type errors
```
**Estimate:** M | **Priority:** Must

### S5: Rename test mock helpers to Drizzle/Db naming
As a developer, I want `createPrismaMock`/`createMockPrisma`/`makePrisma`/`makeMoviePrisma`
renamed to Db/Drizzle naming, so test code reflects the ORM in use.

**Acceptance Criteria:**
```gherkin
Given a test file using a Prisma-named mock helper
When the helper and its call sites are renamed (one file per commit)
Then the test still passes
And grep for the Prisma-named helpers returns zero hits
```
**Estimate:** L | **Priority:** Should

### S6: Remove stale OPENAI_API_KEY from .env
As a developer, I want the old `OPENAI_API_KEY` removed, so there is no confusion about the
AI provider.

**Acceptance Criteria:**
```gherkin
Given .env contains OPENAI_API_KEY
When it is removed (AI_GATEWAY_BASE_URL is the active config)
Then the app starts and AI features still work via the gateway
```
**Estimate:** S | **Priority:** Could

## Out of Scope
- Archiving old Prisma migration SQL files (cosmetic; not residue that affects runtime/typing).
- Any change to runtime behavior beyond the shim replacement.

## Notes for Implementer
- S1/S2/S3 carry the detailed pyramid guidance, shared fixtures, and edge cases in
  `test-strategy.md` — read it before starting.
- `remove_prisma_shim` Phase 1 was already in progress (red-phase audit committed; see
  git history `30ffb37`). Resume from there rather than restarting.
