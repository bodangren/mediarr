# Plan: Daily Cleanup — Finish Stale Archives, Verify Green Suite

## Phase 1 — Stage and Commit Stale Changes

- [x] Move `chore_daily_cleanup_20260404` folder to `conductor/archive/` (f4adbdc)
- [x] Stage all conductor-related changes (deletions, moves, stray artifact fix) (f4adbdc)
- [x] Commit with descriptive message (f4adbdc)
- [x] Run `CI=true bun run test --run 2>&1 | tail -40` — confirm green (1341 passed)

## Phase 2 — Verify Production Build

- [x] Run `cd app && npm run build 2>&1 | tail -20` — build succeeds (f4adbdc)
- [ ] If build fails with new error, fix it
- [ ] Commit any build fixes
