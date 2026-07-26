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

- [ ] Reconcile this plan with the focused active regression tracks.
- [ ] Archive after the app release gate is green.
