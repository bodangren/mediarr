# Spec: App Workspace Pre-existing Test & Typecheck Cleanup

## Background

Multiple recent tracks (indexer_health_monitoring_20260509, chore_frontend_component_test_gaps_20260526, chore_import_list_ui_tests_20260526) have been unable to pass the full app-suite green gate because of pre-existing failures unrelated to their scope:

- **App typecheck:** 4 errors in `ImportListSettings.tsx:254`, `msw/factories.ts:152`, `msw/handlers/helpers.ts:57,65`.
- **App tests:** ~133 failures across 34+ files including `useTouchGestures.test.ts`, `useUIStore.test.tsx`, `download-client-settings.test.tsx`, `settings-routes.test.tsx`, `ActivityQueuePage.test.tsx`, `MovieCell.test.tsx`, `PageLayout.test.tsx`, etc.

This blocks the app workspace from being a reliable quality gate and forces every frontend track to document "pre-existing failures" instead of passing cleanly.

## Acceptance Criteria

1. `cd app && bun run typecheck` exits 0 with 0 errors.
2. `cd app && bun run test` exits 0 with 0 failures.
3. No production behavior is changed; only types, mocks, test helpers, and test assertions are adjusted.
4. The fixes are grouped and committed by root cause so the history is reviewable.

## Known Failure Buckets

- **Type:** `SharedArrayBuffer` → `ArrayBuffer` mismatch in MSW handler helpers.
- **Type:** Unknown property `qualityProfileId` in `MockSeries` factory.
- **Type:** Type mismatch in `ImportListSettings.tsx`.
- **Tests:** MSW handler / factory drift from schema changes.
- **Tests:** Timer / async cleanup warnings turned into failures.
- **Tests:** Component prop drift from refactored shared components.

The exact list must be re-derived at track start because HEAD may have shifted.

## Out of Scope

- New features or UI changes.
- Server workspace fixes.
- Performance work.

## Definition of Done

- [ ] App typecheck is clean.
- [ ] App test suite is green.
- [ ] Root `npm test` still passes (server side unaffected).
- [ ] `measure/tech-debt.md` updated to mark the app pre-existing failures item Resolved.
- [ ] `measure/lessons-learned.md` updated with any recurring patterns discovered.
