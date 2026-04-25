# Plan: Daily Cleanup — April 5, 2026

## Phase 1: Review and Commit Stale Changes

- [ ] Check git status for untracked/uncommitted files
- [ ] Review git diff for working tree changes
- [ ] Commit or revert as appropriate

## Phase 2: Verify Test Suite

- [ ] Run `CI=true bun run test --run` — all tests must pass
- [ ] Note any pre-existing failures from known issues

## Phase 3: Verify Production Build

- [ ] Run `cd app && npm run build` — build must succeed
- [ ] Note any pre-existing build warnings

## Phase 4: Measure Housekeeping

- [ ] Trim `tech-debt.md` to ≤ 50 lines if needed
- [ ] Trim `lessons-learned.md` to ≤ 50 lines if needed
- [ ] Archive track and update `tracks.md`
