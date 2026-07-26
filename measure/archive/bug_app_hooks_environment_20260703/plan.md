# Plan: Fix App Hooks/Test-Environment Test Failures

## Phase 1: Reproduce
- [ ] Run each file and record exact failures.
- [ ] Identify environment mocks needed (window.matchMedia, touch events, timers).
- [ ] Update plan with findings.
- [ ] Commit: `docs(measure): diagnose app hooks environment failures`

## Phase 2: Fix Touch/Media Query Hooks
- [ ] Update `useTouchGestures` and `useMediaQuery` tests for current hook behavior.
- [ ] Verify both files green.
- [ ] Commit: `test(app): fix touch and media query hook tests`

## Phase 3: Fix ActivityQueuePage / CalendarPage
- [ ] Fix `setSpeedLimits` bulk action test.
- [ ] Fix `CalendarPage` date and search button assertions.
- [ ] Commit: `test(app): fix activity queue and calendar page tests`

## Phase 4: Regression
- [ ] Run all affected files together.
- [ ] Run root `CI=true npm test`.
- [ ] Commit: `test(app): verify hooks environment fixes`

## Phase 5: Closeout
- [ ] Update `measure/tech-debt.md`.
- [ ] Archive track.
- [ ] Commit: `docs(measure): close out hooks environment track`
