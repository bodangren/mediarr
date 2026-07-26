# Plan: Complete App Regression Suite

## Phase 1: Baseline and Ownership

- [x] Run `CI=true npm run test --workspace=app`; record the 39 failures across 13 suites. Evidence: 1913 passed / 39 failed on 2026-07-13.
- [x] Assign failures to existing focused tracks or this track without weakening assertions.

## Phase 2: Runtime State and Route-Test Contracts

- [x] Restore synchronous UI-state hydration and export the UI preference default contract. Evidence: `useUIStore.test.tsx` and `uiPreferences.test.ts` are 5/5 green.
- [x] Restore named route-page exports used by focused settings tests. Evidence: client/media/profile settings suites are 34/34 green.
- [x] Repair router and QueryClient test harnesses for shell, navigation, and card tests.

## Phase 3: UI Contract Drift

- [x] Align navigation, activity, manual-match, and primitive component assertions with current intentional UI contracts.
- [x] Verify no runtime behavior was changed merely to satisfy stale tests.

## Phase 4: Regression

- [x] Run affected suites together.
- [x] Run `CI=true npm run test --workspace=app`. Evidence: 204 files / 1952 tests passed.
- [x] Run `npm run build --workspace=app`. Evidence: TypeScript and Vite production build passed.

## Phase 5: Closeout

- [x] Reconcile this plan with the focused active regression tracks. — done as part of the 2026-07-26 documentation reconciliation pass: the six sibling tracks (`bug_app_search_api_drift_20260703`, `bug_app_path_validation_ui_20260703`, `bug_app_view_card_props_20260703`, `bug_app_settings_routes_drift_20260703`, `bug_app_dynamic_form_drift_20260703`, `bug_app_hooks_environment_20260703`) were each independently re-verified against their spec's named test files; all are green and their plan.md files carry matching `## Reconciliation (2026-07-26)` sections.
- [x] Archive after the app release gate is green. — release gate confirmed green (see evidence below); actual archiving (moving the track folder, updating `measure/tracks.md`) is out of scope for this documentation-only reconciliation pass and is owned by the orchestrator. Track is evidence-ready to archive. **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.

## Reconciliation (2026-07-26)

This track's stated goal — a green SPA regression suite — is confirmed still true, and now independently re-verified rather than taken on the Phase 4 record alone:

- `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING, 0 failures (orchestrator-verified 2026-07-26). Note this is a slightly higher test count than the 1952 recorded at Phase 4 (2026-07-13) — consistent with additional tests having been added by other work in the interim, not a regression.
- `npm run build --workspace=app` → exit 0, built in 42.39s (tsc -b && vite build both clean) (orchestrator-verified 2026-07-26).
- `npx tsc -p server/tsconfig.json --noEmit` → 0 errors (orchestrator-verified 2026-07-26).
- All test files named across the six sibling API/UI-drift tracks were individually re-run by this reconciliation pass and confirmed passing (21 distinct files, 254 tests, 0 failures) — see those tracks' own `## Reconciliation (2026-07-26)` sections for per-file counts.

No test/source edits were made by this reconciliation pass. This track is ready to archive.
