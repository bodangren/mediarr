# Plan: Fix App Hooks/Test-Environment Test Failures

## Phase 1: Reproduce
- [x] Run each file and record exact failures. — resolved upstream before reconciliation; verified green 2026-07-26: all 4 named files pass in full today (see Phase 4 evidence). No currently-reproducible failures exist to record.
- [x] Identify environment mocks needed (window.matchMedia, touch events, timers). — resolved upstream before reconciliation; verified green 2026-07-26: current test setup already provides the mocks needed; `useMediaQuery.test.ts` (6/6) and `useTouchGestures.test.ts` (8/8) pass without further mock work.
- [x] Update plan with findings. — resolved upstream before reconciliation; verified green 2026-07-26: no findings beyond "already green"; see Reconciliation section below.
- [x] Commit: `docs(measure): diagnose app hooks environment failures` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 2: Fix Touch/Media Query Hooks
- [x] Update `useTouchGestures` and `useMediaQuery` tests for current hook behavior. — resolved upstream before reconciliation; verified green 2026-07-26: `useTouchGestures.test.ts` 8/8 passing (incl. right-swipe gesture detection), `useMediaQuery.test.ts` 6/6 passing (incl. multiple media query instances).
- [x] Verify both files green. — resolved upstream before reconciliation; verified green 2026-07-26: both fully green (8/8 and 6/6).
- [x] Commit: `test(app): fix touch and media query hook tests` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 3: Fix ActivityQueuePage / CalendarPage
- [x] Fix `setSpeedLimits` bulk action test. — resolved upstream before reconciliation; verified green 2026-07-26: `ActivityQueuePage.test.tsx` 14/14 passing, incl. `calls setSpeedLimits when applying limits` and `uses -1 for unlimited when limits are 0`.
- [x] Fix `CalendarPage` date and search button assertions. — resolved upstream before reconciliation; verified green 2026-07-26: `CalendarPage.test.tsx` 14/14 passing, incl. `shows calendar items on their respective dates` and `does not show search button for items with future release dates`.
- [x] Commit: `test(app): fix activity queue and calendar page tests` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 4: Regression
- [x] Run all affected files together. — resolved upstream before reconciliation; verified green 2026-07-26: `useTouchGestures.test.ts` (8/8), `useMediaQuery.test.ts` (6/6), `ActivityQueuePage.test.tsx` (14/14), `CalendarPage.test.tsx` (14/14) run together — 0 failures.
- [x] Run root `CI=true npm test`. — resolved upstream before reconciliation; verified green 2026-07-26: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING, 0 failures (orchestrator-verified evidence, 2026-07-26).
- [x] Commit: `test(app): verify hooks environment fixes` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 5: Closeout
- [x] Update `measure/tech-debt.md`. — out of scope for this reconciliation pass; owned by the orchestrator. **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Archive track. — out of scope for this reconciliation pass; owned by the orchestrator. Track is evidence-ready to archive (see Reconciliation section below). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Commit: `docs(measure): close out hooks environment track` — out of scope for this reconciliation pass (documentation-only, no git writes). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.

## Reconciliation (2026-07-26)

This track's failures are resolved. Verified pass counts:

| File | Result |
|---|---|
| `app/src/lib/hooks/useTouchGestures.test.ts` | 8/8 passing |
| `app/src/lib/hooks/useMediaQuery.test.ts` | 6/6 passing |
| `app/src/components/activity/ActivityQueuePage.test.tsx` | 14/14 passing |
| `app/src/components/calendar/CalendarPage.test.tsx` | 14/14 passing |

Broader evidence: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING (orchestrator-verified 2026-07-26); `npm run build --workspace=app` → exit 0.

No test/source edits were made by this reconciliation pass — the hooks/environment drift described in the spec no longer reproduces. This track is ready to archive.
