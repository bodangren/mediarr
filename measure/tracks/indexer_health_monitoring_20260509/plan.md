# Plan: Indexer Health Monitoring and Auto-Disable

## Phase 1: Health Check Service (TDD)
- [x] Write tests for IndexerHealthService — Red committed; awaiting Green
  - **Targeted Red command:** `./node_modules/.bin/vitest run server/src/repositories/IndexerHealthRepository.test.ts -t "extends snapshot with threshold context"`
  - **Fail count:** 4 failed / 6 skipped (10 tests total). All four failures are `TypeError: repo.getByIndexerIdWithThresholdContext is not a function` — the production method does not yet exist.
  - **Full Red summary (Phase 1 test surface):**
    - `server/src/services/IndexerHealthService.test.ts` — 6/6 failed (`Cannot find module '/server/src/services/IndexerHealthService'` — the service class does not exist yet).
    - `server/src/repositories/IndexerHealthRepository.test.ts` — 8/10 failed (artifact-contract 2 tests pass; extensions `getByIndexerIdWithThresholdContext`, `list`, `disable` do not exist yet).
    - `server/src/api/routes/indexerRoutes.health.test.ts` — 2/3 failed (`expected 404 to be 200` — the `GET /api/indexers/:id/health` route does not exist yet; Fastify returns 404 for the unregistered path).
  - **Inline fake helper:** `makeIndexerHealthRepo()` lives at the top of `server/src/repositories/IndexerHealthRepository.test.ts` (no `server/test-utils/` directory). Artifact-contract test verifies the production class shape vs. the in-test fake; a shared helper can be re-extracted in the Green phase once Phase 1 implementation lands.
  - **Command-construction note:** the Phase 1 Red command uses the project-local vitest binary because `better-sqlite3` is not Bun-compatible; `bunx vitest` would crash with "better-sqlite3 is not yet supported in Bun" before reaching the new tests.
  - **2026-06-19 MID Red re-verification (current session):** stashed the dirty worktree (`server/src/api/routes/indexerRoutes.ts`, `server/src/repositories/IndexerHealthRepository.ts`, untracked `server/src/services/IndexerHealthService.ts`) into `stash@{0}` ("WIP-green-phase-stash"), ran the targeted Red command plus the other two Phase 1 test files at clean HEAD, then popped the stash to restore the dirty WIP. Verified fail profile matches exactly: 4 failed / 6 skipped on `extends snapshot with threshold context` (all `TypeError: repo.getByIndexerIdWithThresholdContext is not a function`), 8 failed / 1 passed across the full service + route test surface. Red is alive at commit `12acd8bb` and ready for Green.
  - **2026-06-19 MID Red attempt-2 supervisor-gate fix:** supervisor flagged the pre-existing dirty worktree (Green-phase WIP + unrelated scheduler-dashboard cron parity) as a Red-phase boundary violation because the worktree was dirty at session-end. Restashed the same 4 items into a NEW labeled stash `stash@{0}` ("indexer-health Phase 1 Red attempt-2 supervisor-gate fix: 3 pre-existing dirty items stashed off-tree... DO NOT POP — preserved for recovery. Recover via: git stash pop stash@{0}"). The dirty worktree contained NO changes authored by the MID agent — these were already dirty when the session started (proven by the git status output captured at MID start). They are now stashed off-tree so the Red-phase boundary is satisfied. Worktree is now clean of all non-test/non-Measure modifications. The original "WIP-green-phase-stash" from attempt-1 is no longer in the stash list (it was popped in attempt-1 and the files were restashed with a clearer label in attempt-2).
  - **2026-06-19 JR Green:** Commit `2c116173`. Implemented `getByIndexerIdWithThresholdContext`, `list()`, `disable()` on `IndexerHealthRepository` with Drizzle-native SQL; created `IndexerHealthService` with `ping()` dispatching by implementation string (Torznab/Newznab → `buildTestUrl`, Cardigann → `baseUrl`); added `GET /api/indexers/:id/health` route using existing `loadHealthSnapshot` helper. All 19 Phase 1 tests pass: 10 repo + 6 service + 3 route. Typecheck clean on all three changed files. `graph.db` updated with all three changed files. **npm test:** 276 files passed, 2244 tests passed, 11 skipped — green (attempt-1 flaky timeout in unrelated WantedSearchService resolved on retry).
- [x] Implement health check ping for Torznab/Newznab/Cardigann indexers (commit `2c116173`)
- [x] Store health status in SQLite (indexer_health table) (commit `2c116173`)
- [x] Tests pass (commit `2c116173`)

## Phase 2: Auto-Disable Logic (TDD)
- [~] Write tests for consecutive failure threshold detection
- [ ] Implement auto-disable when threshold exceeded
- [~] Skip disabled indexers in search queries
- [ ] Tests pass
  - **2026-06-19 MID Red (current session):** Phase 2 test surface committed. Targeted Red command `./node_modules/.bin/vitest run server/src/services/IndexerAutoDisable.test.ts -t "disables indexer at threshold"` fails with `Cannot find module '/server/src/services/IndexerAutoDisable'` — 1 failed | 12 skipped (filter narrows to the targeted test). Live proof test `server/src/indexers/IndexerTester.autoDisable.test.ts` also fails with the same root cause — 1 failed (suite) | 4 skipped. Both will go Green in the next phase once `services/IndexerAutoDisable.ts` lands and `IndexerTester` is wired to call `handleFailure()` after each failure.
  - **Test surface (Phase 2 Red):**
    - `server/src/services/IndexerAutoDisable.test.ts` (new, 13 tests) — pure `shouldAutoDisable(snapshot, threshold)` + orchestrator `handleFailure(indexerId, message)`. Targeted test = "disables indexer at threshold". Includes threshold boundary (N-1 vs N), settings provider injection, SSE `indexer:healthChanged` emission, idempotent disable, null-snapshot guard, and threshold=0 sentinel.
    - `server/src/indexers/IndexerTester.autoDisable.test.ts` (new, 4 tests) — live behavior proof: real in-memory Drizzle (Phase 1 pattern reused from `IndexerHealthRepository.test.ts`), seeded Torznab indexer, real `IndexerHealthRepository`, real `IndexerAutoDisable`, `HttpClient` mock that returns 500. Asserts `indexers.enabled=false` after N consecutive failures, NOT flipped below threshold, `failureCount === N` recorded, and N=10 concurrent `recordFailure` calls preserve every increment (atomic SQL `failureCount + 1` regression).
    - `server/src/services/MediaSearchService.searchAllIndexers.test.ts` (existing file, +1 describe block) — Phase 2 regression test: queries `findAllEnabled` and never `findAll`, so an auto-disabled indexer stays out of the search path. **Already passes at HEAD** because the existing `searchAllIndexers` (line 463) already uses `findAllEnabled`. Marked as "already satisfied with evidence" per MID Red rules (test-strategy.md §5 explicitly mandates this regression lock-in). Task 3 flipped to `[~]` because the regression test is in place; the spec task itself (`Skip disabled indexers in search queries`) is satisfied by existing code, not by new implementation.
  - **Command-construction note:** same as Phase 1 — `./node_modules/.bin/vitest` (project-local) is used because `better-sqlite3` is not Bun-compatible; `bunx vitest` would crash with "better-sqlite3 is not yet supported in Bun" before reaching the new tests. Verified at Node v22.22.3.
  - **Dirty worktree context (preserved untouched):** `M conductor/archive/cardigann_runtime_parity_20260223/artifacts/final-phase5-compatibility-matrix.json` (1-line `generatedAt` timestamp bump on archived track artifact; framework regenerates periodically) and `?? measure/__pycache__/` (Python cache dir) are both unrelated to this track. They are documented but NOT touched by this Red commit per MID supervisor-gate rules (preserved for the framework to regenerate).

## Phase 3: UI Integration
- [ ] Add health status badge to indexer list in settings
- [ ] Add manual re-enable button for auto-disabled indexers
- [ ] Add health history tooltip
- [ ] Component tests pass

## Phase 4: Verification
- [ ] Full test suite green
- [ ] Typecheck clean
- [ ] Update tech-debt.md
- [ ] Commit and push
