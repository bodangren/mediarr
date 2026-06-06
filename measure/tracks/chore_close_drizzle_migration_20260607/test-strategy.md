# Test Strategy: Remove Prisma $executeRawUnsafe Shim

## 1. Testing Pyramid Guidance Per Phase

### Phase 1 (Audit & Catalog) — Unit-heavy
- **Unit (70%)**: Script/test that scans source for `$executeRawUnsafe` and `$queryRawUnsafe` call sites.
- **Integration (20%)**: Validate grep results against a known fixture file with mixed raw-call patterns.
- **E2E (10%)**: None needed.

### Phase 2 (Backend Replacement) — Unit + Integration
- **Unit (50%)**: Per-query tests asserting identical return shape between old `executeRaw` and new Drizzle `db.run()`/`sql` template.
- **Integration (40%)**: In-memory SQLite test verifying each replaced query mutates rows identically.
- **E2E (10%)**: None needed.

### Phase 3 (Route Verification) — Integration-heavy
- **Unit (20%)**: Route handler unit tests with mocked DB.
- **Integration (60%)**: Fastify inject tests hitting real routes with real in-memory SQLite.
- **E2E (20%)**: Full server smoke test (`/api/system/health`, `/api/stats`) against a seeded DB.

### Phase 4 (Cleanup & Regression) — Full suite
- Run existing test suite as regression gate. No new pyramid layer; rely on accumulated coverage.

### Phase 5 (Finalize) — No new tests
- Documentation and track management only.

## 2. Shared Test Fixtures and Mocks

### Existing mock landscape (DO NOT duplicate)
| Pattern | File | Usage |
|---------|------|-------|
| `createPrismaMock` | `server/src/repositories/AppSettingsRepository.test.ts` | Repo unit tests |
| `makePrisma` | `server/src/services/MovieOrganizeService.test.ts` et al. | Service tests |
| `createMockPrisma` | `server/src/services/LibraryScanService.test.ts` | Library scan tests |
| `$executeRawUnsafe: vi.fn()` | `server/src/api/routes/manualTestFindings.regression.test.ts` | Route regression |

### New shared fixture needed
- **`tests/helpers/drizzleTestDb.ts`**: Creates an in-memory `better-sqlite3` DB, runs Drizzle migrations, and returns `{ db, sqlite }` (the `DatabaseClient` + raw `sqlite` handle). This replaces the `prisma.sqlite` pattern used in `main.ts` and gives a real DB for integration tests.
- **`tests/helpers/seedTestDb.ts`**: Seeds the in-memory DB with minimal rows for Torrent, AppSettings, QualityProfile, Notification, ActivityEvent (the tables touched by `executeRaw` calls).

### Mock strategy
- **Phase 2 unit tests**: Use `drizzleTestDb` (real in-memory DB) instead of mocks — raw SQL assertions are fragile with mocks.
- **Phase 3 route tests**: Use `drizzleTestDb` + Fastify `inject()`. No HTTP server startup.
- **Existing tests**: Leave as-is; they mock `$executeRawUnsafe` which will be removed. Update only when the interface changes in Phase 2.

## 3. Cross-Phase Edge Cases and Dependencies

| Edge Case | Phases | Risk | Mitigation |
|-----------|--------|------|------------|
| Dynamic column names in AppSettings UPDATE | P1→P2 | SQL injection via string interpolation | Use Drizzle `sql` template with identifier escaping or whitelisted column set |
| `prisma.$queryRawUnsafe` in statsRoutes (3 call sites) | P2→P3 | Not in original `executeRaw` scope but same Prisma interface | Include in audit; replace with `db.all(sql\`...\`)` |
| `prisma.$queryRaw` in SystemHealthService (tagged template, safe) | P3 | Different API — `$queryRaw` uses tagged templates, not unsafe | Verify `DatabaseClient.$queryRaw` exists; may need a Drizzle `sql` wrapper |
| `prisma.sqlite` direct access in `main.ts:executeRaw` | P2 | `sqlite.prepare()` is Node `better-sqlite3` API; Drizzle wraps it differently | `DatabaseClient.sqlite` already exposes raw handle; test that `db.sqlite.prepare` still works |
| Existing test mocks referencing `$executeRawUnsafe` | P2→P4 | 3 mock sites in `manualTestFindings.regression.test.ts` will break | Update mocks to match new `DatabaseClient` API after replacement |
| `_prisma_migrations` table reference in SystemHealthService | P3 | Drizzle uses `_drizzle_migrations` | Guard: check which migration table exists before querying |

## 4. Architecture Guardrails

1. **No new Prisma imports**: Any file touched by this track must not add new `@prisma/client` imports. Track via lint rule or audit script.
2. **Single DB client**: All DB access goes through `DatabaseClient` (from `drizzleClient.ts`). No bare `sqlite.prepare()` outside `DatabaseClient` methods.
3. **Type-safe raw SQL**: When Drizzle ORM methods don't fit, use `sql` tagged template from `drizzle-orm` — never string concatenation.
4. **Blast radius containment**: `main.ts:executeRaw` is local/private — 8 call sites, 1 file. `statsRoutes.ts:$queryRawUnsafe` — 3 call sites, 1 file. `SystemHealthService.ts:$queryRaw` — 3 call sites, 1 file. Total: 3 files, ~14 call sites.
5. **No Bun/Node branching**: After Phase 2, the `sqlite.query` vs `sqlite.prepare` branching must be gone. `DatabaseClient` must use a single API (the `better-sqlite3` `prepare().run()` pattern already in `drizzleClient.ts`).

## 5. Per-Phase Test Approach Notes

### Phase 1
- Write a Vitest test that regex-scans all `.ts` files for `\$executeRawUnsafe` and `\$queryRawUnsafe`.
- Assert expected count (currently: 8 `executeRaw` in main.ts + 3 `$queryRawUnsafe` in statsRoutes + 3 `$queryRaw` in SystemHealthService).
- Document each site in a `audit-results.md` artifact.

### Phase 2
- For each `executeRaw` call in `main.ts`: write a test that runs the old SQL via `sqlite.prepare` and the new Drizzle equivalent, then asserts identical `changes` count and row state.
- For `statsRoutes.ts`: test each aggregation function against a seeded in-memory DB.
- For `SystemHealthService.ts`: test `checkDatabase()` against in-memory DB; verify version/migration queries return expected shapes.
- Key: all Phase 2 tests run against real in-memory SQLite, no mocks.

### Phase 3
- Fastify `inject()` tests for `/api/stats`, `/api/system/health`.
- Verify response shape matches current production contract.
- Add regression test for the AppSettings repair logic at startup (the `executeRaw` loop in `main.ts`).

### Phase 4
- `CI=true npm test` — full regression.
- `npx tsc --noEmit` — typecheck.
- `npm run lint` — lint.
- Remove `$executeRawUnsafe` from `PrismaClient` interface in `types/prisma.ts`.
- Update `manualTestFindings.regression.test.ts` mocks to remove `$executeRawUnsafe`.

### Phase 5
- Verify `measure/tech-debt.md` updated.
- No test changes.

## 6. Build-Graph Findings That Shaped This Strategy

- **`build-graph stats`**: 6954 nodes, 10251 edges, 831 files. Large codebase — narrow blast radius is critical.
- **`build-graph search "prisma"`**: 20+ mock factory functions across the codebase (`createPrismaMock`, `makePrisma`, `createMockPrisma`). Strategy: do NOT attempt to unify all mocks; only update the 3 sites that reference `$executeRawUnsafe`.
- **`build-graph search "drizzle"`**: Only 2 nodes (`drizzle.config.ts`, `drizzleClient.ts`). Drizzle adoption is still narrow — `DatabaseClient` is the sole integration point.
- **`build-graph inspect DatabaseClient`**: Exported class at `drizzleClient.ts:415-1300` with `sqlite: any` and `db: any` fields. The `sqlite` field is the raw handle used by `main.ts:executeRaw`. Strategy: replace `executeRaw` with `DatabaseClient` methods that use `this.db` internally.
- **`build-graph callers drizzleClient`**: Only 5 files import it (`categories.ts`, `main.ts`, `qualities.ts`, `smartDefaults.ts`, 1 test). Very low blast radius for changes to `DatabaseClient`.
- **`build-graph search "executeRawUnsafe"`**: Zero results (graph is 10 days stale). Grep confirmed 5 actual references. Strategy: trust grep over graph for this track; graph scan timed out on this codebase.
- **`build-graph deps main.ts --downstream`**: 29+ imported modules. Confirms `main.ts` is the app root — integration tests must cover the startup repair path specifically.
