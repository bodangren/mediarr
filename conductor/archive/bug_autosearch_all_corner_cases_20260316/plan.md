# Plan: WantedSearchService.autoSearchAll Corner Cases

## Phase 1 — Red: Write failing tests

- [x] Create `server/src/services/WantedSearchService.autoSearchAll.test.ts`
- [x] Test: calling `autoSearchAll` twice concurrently — second call does NOT trigger a second search loop (FAILS — no guard exists)
- [x] Test: start event emitted before background work
- [x] Test: completion event emitted after all searches complete
- [x] Test: empty DB — no movies/series searched, start + completion events fire
- [x] Run tests; confirm the concurrent-execution test fails

**Checkpoint:** `CI=true npx vitest run server/src/services/WantedSearchService.autoSearchAll.test.ts 2>&1 | tail -20`

## Phase 2 — Green: Fix concurrent-execution bug

- [x] Add `private isRunning = false` guard to `WantedSearchService`
- [x] Set `isRunning = true` at start of background task; set `isRunning = false` in `finally` so it always clears
- [x] Early-return from `autoSearchAll` when `isRunning === true`
- [x] Run tests; confirm all pass

**Checkpoint:** `CI=true npx vitest run server/src/services/WantedSearchService.autoSearchAll.test.ts 2>&1 | tail -20`

## Phase 3 — Expand: DB failure path & guard reset

- [x] Test: `prisma.movie.findMany` throws — completion event is NOT emitted, `isRunning` resets to false
- [x] Test: after one successful run completes, a second call starts a new run (guard is cleared)
- [x] Run tests; confirm all pass

**Checkpoint:** `CI=true npx vitest run server/src/services/WantedSearchService.autoSearchAll.test.ts 2>&1 | tail -20`

## Phase 4 — Verify: Full suite

- [x] `CI=true npx vitest run 2>&1 | tail -20` — 1092 tests pass (190 files), 0 failures
- [x] `cd app && npm run build 2>&1 | tail -10` — build clean (chunk-size warning is pre-existing)
