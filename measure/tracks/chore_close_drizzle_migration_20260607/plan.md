# Plan: Close Drizzle Migration (Shim Removal + Naming Residue)

> Consolidates `remove_prisma_shim_20260508` + `chore_prisma_naming_cleanup_20260526`.
> Read [test-strategy.md](./test-strategy.md) before starting S1–S3.
> S1 was already started under the old shim track (red-phase audit committed `30ffb37`).

## Phase S1: Audit & catalog raw-SQL shim call sites *(carried over — in progress)*
- [x] Write audit test that scans source for `$executeRawUnsafe` / `$queryRawUnsafe` / `$queryRaw` call sites — red phase committed in `b63665d` (`tests/closeDrizzleMigration.audit.test.ts`, 20 tests, 1 failing on missing `audit-results.md`)
- [x] Document each usage with suggested Drizzle replacement (audit-results.md artifact) — green phase committed in `076e91c` (`audit-results.md`, 8 files catalogued: 2 production, 1 type-decl, 4 test-mock, 1 comment-only)
- [x] Commit audit findings

## Phase S2: Replace raw-SQL shim with Drizzle-native queries (TDD) *(in progress — Red phase)*
- [~] For each `executeRaw` call in `main.ts`: test old-vs-new behavior against in-memory SQLite, then replace with Drizzle `sql`` template / ORM method
- [~] Replace 3 `$queryRawUnsafe` sites in `statsRoutes.ts` with `db.all(sql`` …`` )`
- [~] Replace 3 `$queryRaw` sites in `SystemHealthService.ts` (guard `_drizzle_migrations` vs `_prisma_migrations`)
- [~] Remove the `sqlite.query` vs `sqlite.prepare` Bun/Node branching logic
- [ ] Run affected test files green

## Phase S3: Route verification (integration-heavy)
- [ ] Fastify `inject()` tests for `/api/stats` and `/api/system/health` against seeded in-memory DB
- [ ] Regression test for the startup AppSettings repair loop in `main.ts`
- [ ] Verify response shapes match current production contract

## Phase S4: Remove PrismaClient type shim
- [ ] Read `server/src/types/prisma.ts` and `server/src/db/drizzleClient.ts`
- [ ] Replace every non-test import of `PrismaClient` with `DatabaseClient`
- [ ] Replace every test-file import/annotation of `PrismaClient` with `DatabaseClient`
- [ ] Delete `server/src/types/prisma.ts`
- [ ] `grep -r "PrismaClient" server/src/ --include="*.ts" | grep -v node_modules | grep -v archive` → zero hits
- [ ] `CI=true npm test` → GREEN; commit

## Phase S5: Rename test mock helpers to Drizzle/Db naming
- [ ] List files with Prisma-named helpers: `grep -rl "createPrismaMock\|createMockPrisma\|makePrisma\|makeMoviePrisma" server/src/ tests/ --include="*.ts"`
- [ ] For each file (one commit per file): rename `createPrismaMock→createDbMock`, `createMockPrisma→createMockDb`, `makePrisma→makeDb`, `makeMoviePrisma→makeMovieDb`; update call sites; run file's tests
- [ ] Verify zero remaining Prisma-named helpers
- [ ] `CI=true npm test` → GREEN; commit

## Phase S6: Remove stale OPENAI_API_KEY from .env
- [ ] Confirm `OPENAI_API_KEY` present and `AI_GATEWAY_BASE_URL` configured
- [ ] Remove the `OPENAI_API_KEY` line; verify app starts and AI path works via gateway
- [ ] Commit

## Phase S7: Verification, debt closeout & handoff
- [ ] `CI=true npm test` GREEN; `npm run typecheck` zero errors; `npm run lint` zero errors
- [ ] Zero grep hits for `$executeRawUnsafe`/`$queryRawUnsafe`, `PrismaClient`, and Prisma-named helpers in non-archived code
- [ ] Update `tech-debt.md`: mark Resolved — `$executeRawUnsafe` shim, PrismaClient type shim, stale OPENAI_API_KEY, createPrismaMock naming residue
- [ ] Update `lessons-learned.md` with Drizzle mock-naming convention
- [ ] Archive this track; update `tracks.md`; final commit and push
