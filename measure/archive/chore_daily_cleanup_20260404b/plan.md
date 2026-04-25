# Plan: Daily Cleanup — Finish Stale Archives, Verify Green Suite

## Phase 1 — Stage and Commit Stale Changes

- [ ] Move `chore_daily_cleanup_20260404` folder to `measure/archive/`
- [ ] Stage all measure-related changes (deletions, moves, stray artifact fix)
- [ ] Commit with descriptive message
- [ ] Run `CI=true bun run test --run 2>&1 | tail -40` — confirm green

## Phase 2 — Verify Production Build

- [ ] Run `cd app && npm run build 2>&1 | tail -20`
- [ ] If build fails with new error, fix it
- [ ] Commit any build fixes
