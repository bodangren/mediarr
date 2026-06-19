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
- [x] Write tests for consecutive failure threshold detection (commit `269bce9d`)
- [x] Implement auto-disable when threshold exceeded (commit `2db7448c`)
- [x] Skip disabled indexers in search queries (already satisfied by existing `findAllEnabled` usage; regression test in `269bce9d`)
- [x] Tests pass (commit `2db7448c`)
  - **2026-06-19 JR Green:** Commit `2db7448c`. Recovered Phase 2 Green WIP from stash@{0} (pre-written by a prior out-of-session attempt), validated against spec, and committed. Created `IndexerAutoDisable` service with pure `shouldAutoDisable(snapshot, threshold)` threshold detector (returns false for null snapshot, false when below threshold, true at-or-above threshold, and false for threshold=0 sentinel) and `handleFailure(indexerId, message)` orchestrator that records failures via `IndexerHealthRepository.recordFailure`, reads threshold from a `SettingsProvider`, checks `shouldAutoDisable`, calls `healthRepo.disable(indexerId)` when threshold is reached, emits SSE `indexer:healthChanged` via optional `ApiEventHub`, and tracks already-disabled indexers via an in-memory `Set<number>` for idempotent disable. Wired `autoDisable` as optional 4th constructor parameter in `IndexerTester.ts`; on test failure, routes through `handleFailure()` when `autoDisable` is present (else falls back to direct `recordFailure` for backward compatibility). Added `.onConflictDoUpdate()` to the INSERT path in `IndexerHealthRepository.recordFailure` for atomic concurrent failure counter under parallel calls.
  - **Targeted Red command:** `./node_modules/.bin/vitest run server/src/services/IndexerAutoDisable.test.ts -t "disables indexer at threshold"` → **GREEN (1 passed | 12 skipped).**
  - **Full Phase 2 test surface:** 3 files, 29 tests, **all GREEN**:
    - `server/src/services/IndexerAutoDisable.test.ts` — 13/13 passed (5 `shouldAutoDisable` + 8 orchestrator)
    - `server/src/indexers/IndexerTester.autoDisable.test.ts` — 4/4 passed (live proof with real Drizzle, real repo, real `IndexerAutoDisable`)
    - `server/src/services/MediaSearchService.searchAllIndexers.test.ts` — 12/12 passed (11 pre-existing + 1 Phase 2 regression)
  - **Full Phase 1+2 test surface:** 6 files, 48 tests, **all GREEN** (Phase 1: 10 repo + 6 service + 3 route; Phase 2: 13 orchestrator + 4 live proof + 12 search-skip).
  - **Typecheck:** Clean on all three changed files (`IndexerAutoDisable.ts`, `IndexerTester.ts`, `IndexerHealthRepository.ts`). Server-wide typecheck shows only pre-existing errors in unrelated test files (`FilterService.test.ts`, `VariantInventoryIndexer.test.ts`, `TorrentRepository.test.ts`, `SubtitleRequirementEngine.test.ts`) and one pre-existing `createApiServer.ts` `exactOptionalPropertyTypes` issue — none caused by this track.
  - **`graph.db` updated** with all three changed files (8→15 nodes, 20→26 edges).
  - **Command-construction note:** same as Phase 1 — `./node_modules/.bin/vitest` (project-local) used because `better-sqlite3` is not Bun-compatible. Node v22.22.3 via nvm.

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
