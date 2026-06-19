# Plan: Indexer Health Monitoring and Auto-Disable

## Phase 1: Health Check Service (TDD)
- [~] Write tests for IndexerHealthService — Red committed; awaiting Green
  - **Targeted Red command:** `./node_modules/.bin/vitest run server/src/repositories/IndexerHealthRepository.test.ts -t "extends snapshot with threshold context"`
  - **Fail count:** 4 failed / 6 skipped (10 tests total). All four failures are `TypeError: repo.getByIndexerIdWithThresholdContext is not a function` — the production method does not yet exist.
  - **Full Red summary (Phase 1 test surface):**
    - `server/src/services/IndexerHealthService.test.ts` — 6/6 failed (`Cannot find module '/server/src/services/IndexerHealthService'` — the service class does not exist yet).
    - `server/src/repositories/IndexerHealthRepository.test.ts` — 8/10 failed (artifact-contract 2 tests pass; extensions `getByIndexerIdWithThresholdContext`, `list`, `disable` do not exist yet).
    - `server/src/api/routes/indexerRoutes.health.test.ts` — 2/3 failed (`expected 404 to be 200` — the `GET /api/indexers/:id/health` route does not exist yet; Fastify returns 404 for the unregistered path).
  - **Inline fake helper:** `makeIndexerHealthRepo()` lives at the top of `server/src/repositories/IndexerHealthRepository.test.ts` (no `server/test-utils/` directory). Artifact-contract test verifies the production class shape vs. the in-test fake; a shared helper can be re-extracted in the Green phase once Phase 1 implementation lands.
  - **Command-construction note:** the Phase 1 Red command uses the project-local vitest binary because `better-sqlite3` is not Bun-compatible; `bunx vitest` would crash with "better-sqlite3 is not yet supported in Bun" before reaching the new tests.
- [ ] Implement health check ping for Torznab/Newznab/Cardigann indexers
- [ ] Store health status in SQLite (indexer_health table)
- [ ] Tests pass

## Phase 2: Auto-Disable Logic (TDD)
- [ ] Write tests for consecutive failure threshold detection
- [ ] Implement auto-disable when threshold exceeded
- [ ] Skip disabled indexers in search queries
- [ ] Tests pass

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
