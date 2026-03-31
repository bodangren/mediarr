# Plan: Fix ImportManager Episode-to-Movie Fallback Bug

## Phase 1 — Fix the Bug and Update Existing Test

- [x] Modify `ImportManager.ts:439`: replace `if (!parsed)` with a flag-based condition that allows movie fallback when episode path found no DB match
- [x] Update `ImportManager.slowPath.test.ts:136` ("BUG" test): change assertions to expect movie import succeeds instead of IMPORT_FAILED
- [x] Run `CI=true bun run test --run 2>&1 | tail -40` — confirm updated test passes

## Phase 2 — Add Adjacent Coverage

- [ ] Add test: parsed as episode, series NOT found → falls through to movie path and imports
- [ ] Add test: parsed as episode, series found but episode NOT found → falls through to movie path and imports
- [ ] Add test: parsed as episode, series found, episode NOT found, movie also NOT found → IMPORT_FAILED (no match)
- [ ] Run `CI=true bun run test --run 2>&1 | tail -40` — confirm all pass

## Phase 3 — Verify and Finalize

- [ ] Run full test suite: `CI=true bun run test --run 2>&1 | tail -60`
- [ ] Run production build: `cd app && npm run build 2>&1 | tail -20`
- [ ] Update `conductor/tech-debt.md`: mark ImportManager fallback bug as Resolved
- [ ] Archive track and push
