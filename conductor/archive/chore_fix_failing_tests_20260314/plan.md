# Plan: Fix Failing Tests

## Won't Fix (deferred to chore_drizzle_migration_20260314)

These tests mock `prisma.*` client methods directly or test Prisma-specific paths.
They will be fully rewritten as part of the Drizzle migration track.

- [x] `tests/rss-media-monitor.test.js` - 1 failure (mocks `prisma.movie.findFirst`)
- [x] `tests/rss-tv-monitor.test.js` - 1 failure (mocks `prisma.movie.findFirst`)
- [x] `tests/wanted-search-service.test.ts` - 2 failures (mocks `prisma.movie.findUnique`)
- [x] `tests/database-migration.test.js` - 1 failure (hard-codes `prisma/migrations/` + `prisma/dev.db`)

---

## Phase 1: Server/API Tests

### Task 1.1: Fix api-calendar tests (9 failures)
- [x] Run test to see exact errors: `npm test -- tests/api-calendar.test.ts`
- [x] Analyze why validation returns 400 instead of 422
- [x] Fix test or implementation to align
- Status: COMPLETED (12/12 tests passing)

### Task 1.2: Fix torrent-completion tests (5 failures)
- [ ] Run test to see exact errors
- [ ] Analyze failures
- [ ] Fix test or implementation
- Status:

### Task 1.3: SKIP — api-route-map test (1 failure) — Prisma-coupled, rewrite in Drizzle track
- [x] Deferred: mocks prisma directly; will be rewritten in chore_drizzle_migration_20260314

### Task 1.4: SKIP — mediaRoutes.wanted tests (3 failures) — Prisma-coupled, rewrite in Drizzle track
- [x] Deferred: 6 Prisma refs in test; will be rewritten in chore_drizzle_migration_20260314

### Task 1.5: SKIP — downloadClientRoutes test (1 failure) — Prisma-coupled, rewrite in Drizzle track
- [x] Deferred: 2 Prisma refs in test; will be rewritten in chore_drizzle_migration_20260314

### Task 1.6: SKIP — activity-event-emission (2 failures) — Prisma-coupled, rewrite in Drizzle track
- [x] Deferred: 4 Prisma refs in test; will be rewritten in chore_drizzle_migration_20260314

### Task 1.3 (revised): Fix remaining server tests (no Prisma)
- [x] torrent-completion - already passing
- [x] api-sdk-contract - already passing
- [x] metadata-provider-unified - already passing
- [x] torrent-manager-sync-loop - already passing
- [x] media-search-service - already passing
- [x] search-translator - already passing
- [x] indexer-test-capability - already passing
- [x] tv-search-service - already passing
- [x] metadata-provider - already passing
- [x] api-contract-harness - already passing
- [x] torrent-api - already passing
- [x] integration/subtitle-provider - already passing
- [x] subtitle-provider-factory - already passing
- Status: COMPLETE — all were already fixed by prior track work

## Phase 2: App/Frontend Tests

### Task 2.1: Fix app/src/lib tests
- [x] indexerPresets.test.ts - updated counts (53→62, popular cap 20→30), fixed Cardigann first-field assertion
- [x] colorImpaired.test.ts - added @vitest-environment jsdom (ran in node, window undefined caused false-return)
- [x] useTouchGestures.test.ts - added @vitest-environment jsdom (document not defined in node env)
- [x] uiPreferences.test.ts - added @vitest-environment jsdom (window/document not defined in node env)
- Status: COMPLETE — 43/43 tests pass

### Task 2.2: Run full test suite
- [x] All targeted tests pass (server + frontend lib suites)
- [x] Skipped tests (Prisma-coupled): activity-event-emission, api-route-map, downloadClientRoutes, mediaRoutes.wanted — deferred to chore_drizzle_migration_20260314
- Status: COMPLETE
