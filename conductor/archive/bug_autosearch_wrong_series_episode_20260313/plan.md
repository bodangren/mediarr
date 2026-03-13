# Plan: Wrong-Series Episode Grab + autoSearchMovie Coverage

## Phase 1 — Red: wrong-series episode test (must FAIL)

- [x] Add test to `WantedSearchService.episodeValidation.test.ts`:
      "BUG: rejects a release from a different series even if season/episode numbers match"
      — indexer returns Better Call Saul S01E01 (score 100) AND Breaking Bad S01E01 (score 80)
      — expects Breaking Bad to be grabbed (currently grabs Better Call Saul → FAIL)
- [x] Run the test file alone; confirm it FAILS (Red)

## Phase 2 — Green: fix autoSearchEpisode series title validation

- [x] In `WantedSearchService.ts`, add `this.titlesMatch(r.title, series.title)` as an
      additional guard inside the `validCandidates` filter in `autoSearchEpisode`
- [x] Run the test file; confirm all tests pass (Green)
- [x] Run full test suite: `CI=true bun run test --run 2>&1 | tail -40`
- [x] Commit: `fix(wanted-search): reject wrong-series episode candidates in autoSearchEpisode` (4d45ce8)

## Phase 3 — autoSearchMovie core path tests

- [x] Create `server/src/services/WantedSearchService.autoSearchMovie.test.ts`
- [x] Test: movie not found → `{ success: false, reason: 'Movie not found' }`
- [x] Test: no releases found → skip emitted
- [x] Test: best candidate below score threshold → skip emitted
- [x] Test: successful grab → RELEASE_GRABBED event + `{ success: true, release }`
- [x] Test: `searchAllIndexers` throws → `{ success: false, reason: 'Search failed: ...' }`
- [x] Run test file; confirm all pass
- [ ] Run full test suite: `CI=true bun run test --run 2>&1 | tail -40`
- [x] Commit: `test(wanted-search): add autoSearchMovie core path coverage` (602362d)

## Phase 4 — Verify

- [x] Run full test suite: `CI=true bun run test --run 2>&1 | tail -40`
- [x] Run production build: `cd app && npm run build 2>&1 | tail -20` — success
- [x] Note any pre-existing failures; fix any new failures introduced by this track
      Server: 578 passed, 4 failed (all pre-existing: mediaRoutes.wanted 3 + downloadClientRoutes 1)
