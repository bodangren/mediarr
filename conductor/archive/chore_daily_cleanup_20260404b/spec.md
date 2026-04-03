# Spec: Daily Cleanup — Finish Stale Archives, Verify Green Suite

## Problem

The previous session left uncommitted changes:
1. `chore_daily_cleanup_20260404` track was marked `done` but its folder was never moved to `conductor/archive/`
2. `bug_organize_services_corner_cases_20260404` track files were deleted from `conductor/tracks/` but the deletions were not committed
3. A stray modification in `conductor/archive/cardigann_runtime_parity_20260223/artifacts/final-phase5-compatibility-matrix.json`

## Acceptance Criteria

1. `chore_daily_cleanup_20260404` folder moved to `conductor/archive/`
2. `bug_organize_services_corner_cases_20260404` deletions committed
3. Stray artifact change committed
4. All tracked changes committed cleanly
5. Full test suite passes (`CI=true bun run test --run`)
6. Production build succeeds (`cd app && npm run build`)

## Subsystem Scope

Conductor housekeeping only — no server code changes expected.
