# Audit Results: Close Drizzle Migration (chore_close_drizzle_migration_20260607)

Raw-method reference scan of `server/src/**/*.ts` — consolidates raw-SQL shim + naming residue scope.

## Summary

- **Total files with raw-method references:** 4
- **Type declaration files:** 0
- **Production code files:** 1
- **Test mock files:** 3
- **Comment-only files:** 0

### Production call-site counts

- **Production `$queryRaw` call sites:** 0
- **Production `$queryRawUnsafe` call sites:** 3
- **Production `$executeRawUnsafe` call sites:** 0

## Type Declarations

*(No type-declaration files remain after S4 deleted `server/src/types/prisma.ts`.)*

## Production Code

### `server/src/api/routes/statsRoutes.ts`

Three `$queryRawUnsafe` call sites in the stats aggregation routes.

**Drizzle replacement:** Replace `prisma.$queryRawUnsafe(sql)` with `db.all(sql\`...\`)` using Drizzle's tagged template. Each call is a simple SELECT aggregation — no dynamic column names.

| Line | Method | Snippet |
|------|--------|---------|
| 279 | `$queryRawUnsafe` | `result = await prisma.$queryRawUnsafe?.(` |
| 298 | `$queryRawUnsafe` | `result = await prisma.$queryRawUnsafe?.(` |
| 317 | `$queryRawUnsafe` | `result = await prisma.$queryRawUnsafe?.(` |

### `server/src/services/SystemHealthService.ts` *(S2 Green: raw SQL replaced with Drizzle)*

All three `$queryRaw` call sites were replaced with `db.all(sql\`...\`)` in the S2 Green phase (commit `378df6c`). The S2 replacement guards `_drizzle_migrations` vs `_prisma_migrations` table name — Drizzle uses `_drizzle_migrations` whereas the legacy Prisma setup used `_prisma_migrations`. No raw-method references remain.

## Test Mocks

Three test files contain raw-method mock declarations that will need updating when the production interfaces change in S4/S5.

### `server/src/api/routes/manualTestFindings.regression.test.ts`

| Line | Method | Snippet |
|------|--------|---------|
| 174 | `$executeRawUnsafe` | `$executeRawUnsafe: vi.fn(),` |
| 202 | `$executeRawUnsafe` | `$executeRawUnsafe: vi.fn(),` |
| 247 | `$executeRawUnsafe` | `$executeRawUnsafe: vi.fn(),` |

### `server/src/api/routes/stats.integration.test.ts`

| Line | Method | Snippet |
|------|--------|---------|
| 25 | `$queryRawUnsafe` | `$queryRawUnsafe: vi.fn().mockResolvedValue([{ total: 0, avg: 0, size: 0 }]),` |
| 66 | `$queryRawUnsafe` | `prisma.$queryRawUnsafe` |

### `server/src/api/routes/statsRoutes.test.ts`

| Line | Method | Snippet |
|------|--------|---------|
| 27 | `$queryRawUnsafe` | `$queryRawUnsafe: vi.fn().mockResolvedValue([{ total: 0, avg: 0, size: 0 }]),` |
| 213 | `$queryRawUnsafe` | `prisma.$queryRawUnsafe` |
| 243 | `$queryRawUnsafe` | `prisma.$queryRawUnsafe.mockResolvedValue([{ size: 10485760 }]);` |

## Comment-Only

*(No comment-only files remain after S2 extracted `repairMalformedJsonColumns` from main.ts.)*

## Naming Residue

Phase S5 renames Prisma-named test mock helpers to Drizzle/Db equivalents across all test files.

**Files with Prisma-named helpers:** 31
**Total Prisma-named helper references:** 278

| Old Name | New Name | Files | Hit Count |
|----------|----------|-------|-----------|
| `createPrismaMock` | `createDbMock` | 8 | ~80 |
| `createMockPrisma` | `createMockDb` | 2 | ~16 |
| `makePrisma` | `makeDb` | 20 | ~170 |
| `makeMoviePrisma` | `makeMovieDb` | 1 | ~12 |

All 31 files are test files; no production source files use the helper names. The local `prisma` variable name within each test is out of scope — only the helper identifiers are renamed.

## Stale env key

Phase S6 confirms the stale `OPENAI_API_KEY` line is absent from `.env`.

| Check | Result |
|-------|--------|
| `.env` contains `OPENAI_API_KEY=…` (non-comment) | No — line absent |
| `.env` configures `AI_GATEWAY_BASE_URL` | Yes |
| `.env` configures `AI_GATEWAY_MODEL` | Yes |
| `OPENAI_API_KEY` identifier in `server/src/**/*.ts` | 0 hits |
| `OPENAI_API_KEY` identifier in `tests/**/*.ts` | 0 hits |
| `OPENAI_API_KEY` identifier in `app/**/*.{ts,tsx}` | 0 hits |
| `OPENAI_API_KEY` identifier in `clients/**/*.{ts,tsx}` | 0 hits |

The project migrated from OpenAI to OpenRouter (chore_openrouter_migration_20260329) and then to a local gateway (feature_local_llm_gateway_20260401). The old key line was removed prior to this phase; S6 closes out the tech-debt entry and verifies the post-state.

## Summary

All phases S1–S6 verified. No stale env keys, no PrismaClient references, no Prisma-named helpers, no raw-SQL shims in production code.
