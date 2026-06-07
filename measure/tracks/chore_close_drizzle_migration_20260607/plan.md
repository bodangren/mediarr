# Plan: Close Drizzle Migration (Shim Removal + Naming Residue)

> Consolidates `remove_prisma_shim_20260508` + `chore_prisma_naming_cleanup_20260526`.
> Read [test-strategy.md](./test-strategy.md) before starting S1–S3.
> S1 was already started under the old shim track (red-phase audit committed `30ffb37`).

## Phase S1: Audit & catalog raw-SQL shim call sites *(carried over — in progress)*
- [x] Write audit test that scans source for `$executeRawUnsafe` / `$queryRawUnsafe` / `$queryRaw` call sites — red phase committed in `b63665d` (`tests/closeDrizzleMigration.audit.test.ts`, 20 tests, 1 failing on missing `audit-results.md`)
- [x] Document each usage with suggested Drizzle replacement (audit-results.md artifact) — green phase committed in `076e91c` (`audit-results.md`, 8 files catalogued: 2 production, 1 type-decl, 4 test-mock, 1 comment-only)
- [x] Commit audit findings

## Phase S2: Replace raw-SQL shim with Drizzle-native queries (TDD) *(Green phase complete `378df6c`)*

> Red phase expanded in `7cddd1a` to cover all 8+ `executeRaw` call sites in `main.ts` (Notification.config, ActivityEvent.details, Torrent.eta downscale/clamp/negative-null, AppSettings dynamic-column with bound params, AppSettings nullable NULL), the 3rd `$queryRawUnsafe` call site in `statsRoutes.ts` (`getAverageDownloadSpeed`), and the 3rd `$queryRaw` call site in `SystemHealthService.ts` (populated `__drizzle_migrations` table returns latest hash). All 16 tests in `tests/closeDrizzleMigration.s2.replacement.test.ts` fail in Red phase for the expected missing behavior.
>
> > Red phase re-verified 2026-06-07: 16/16 tests fail for the expected missing behavior under the green-phase source reverted to its red-phase state (commit `c4b1d25` added a small seed-data fix so the Notification Red test fails on the intended `runRawDrizzle` import error rather than on a NOT NULL constraint error in the green phase).
> >
> > > Red phase re-verified 2026-06-07 (mid-agent run): 16/16 tests fail for the expected missing behavior on a clean HEAD with the in-progress green-phase work stashed. Failures break down as 9 S2.1 `runRawDrizzle` import errors (no `drizzleRawSql.ts` module), 3 S2.2 stats-route assertions (routes return 0 instead of real aggregation), 3 S2.3 `checkDatabase` status='error' (not 'ok'), and 1 S2.4 source-presence check (drizzleClient.ts still uses `createRequire` for `bun:sqlite` vs `better-sqlite3` branching). Test-design refinements since `c4b1d25` (commits `65b9c7e` "tighten S2 Torrent.eta equivalence test design" and `e49c0e6` "fix AppSettings nullable NULL test seed") do not change the Red-phase shape — they only fix seed-data hygiene so each equivalence test fails on the intended `runRawDrizzle` import error rather than on a NOT NULL constraint error.
> > >
> > > > Red phase re-verified 2026-06-07 (post-green mid-agent run): 16/16 tests fail for the expected missing behavior on `git checkout HEAD~1 --` of the S2 Green source set (committed in `378df6c`). The Red-phase tests are well-designed: they fail cleanly on `runRawDrizzle` import errors, route assertions returning 0, `checkDatabase` status='error', and the lingering `createRequire` branching check. With the S2 Green source restored (`git checkout HEAD --`), 16/16 tests pass, and the surrounding SystemHealthService (14/14) and statsRoutes (17/17) suites are green. Audit counts updated in `audit-results.md` to reflect that 2 raw-method references were removed by the S2 Green commit (production: 2→1, test-mock: 4→3, total files: 8→6).

- [x] For each `executeRaw` call in `main.ts`: test old-vs-new behavior against in-memory SQLite, then replace with Drizzle `sql`` template / ORM method *(Red: 7 equivalence tests covering QualityProfile.items + Notification.config + ActivityEvent.details + Torrent.eta (downscale/clamp/negative-null) + AppSettings dynamic-column with params + AppSettings nullable NULL)*
- [x] Replace 3 `$queryRawUnsafe` sites in `statsRoutes.ts` with `db.all(sql`` …`` )` *(Red: 3 tests covering SUM(downloaded) + page_count*page_size + AVG(downloadSpeed))*
- [x] Replace 3 `$queryRaw` sites in `SystemHealthService.ts` (guard `_drizzle_migrations` vs `_prisma_migrations`) *(Red: 3 tests — SELECT 1, sqlite_version, plus a populated `__drizzle_migrations` table returns the latest hash)*
- [x] Remove the `sqlite.query` vs `sqlite.prepare` Bun/Node branching logic
- [x] Run affected test files green

## Phase S3: Route verification (integration-heavy) *(Red phase in progress)*
- [~] Fastify `inject()` tests for `/api/stats` and `/api/system/health` against seeded in-memory DB
- [~] Regression test for the startup AppSettings repair loop in `main.ts`
- [~] Verify response shapes match current production contract

> Red phase committed in `3d9eaab` (30 tests in `tests/closeDrizzleMigration.s3.routes.test.ts`).
> S3.1 (12 tests, all green) verifies the route outputs are intact after the S2 raw-SQL shim removal
> by running Fastify `inject()` against a seeded in-memory SQLite DB: LibraryStats envelope
> (empty + seeded counts, file aggregation, quality breakdown, missing counts, ActivityEvent date
> filters) and SystemStatus envelope (database health, sqlite version, dependencies). S3.2 (9
> tests, all red) is the regression test for the startup AppSettings repair loop. The helper
> currently lives as a private function in `server/src/main.ts:295` and is not importable, so
> each S3.2 test fails on the expected `repairMalformedJsonColumns` import error; the S3 Green
> phase must extract it to `server/src/maintenance/repairJsonColumns` so the loop is regression-
> testable (QualityProfile.items, Notification.config, ActivityEvent.details, Torrent.eta
> downscale/clamp/negative-null, AppSettings required + nullable JSON columns). S3.3 (9 tests,
> all green) asserts the production contract for the /api/system/{stats,status} and
> /api/stats/{downloads,system} envelopes.
>
> Red phase verification (vitest run, 2026-06-07):
>   Tests  9 failed | 21 passed (30)
>   9 S3.2 failures = repairMalformedJsonColumns not importable (expected)
>   21 S3.1+S3.3 passes = routes + envelopes already conform to contract (route verification complete)

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
