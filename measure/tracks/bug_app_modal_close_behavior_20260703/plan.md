# Plan: Fix App Modal Close Behavior Test Failures

## Phase 1: Reproduce & Diagnose
- [ ] Run each affected test file and capture the exact failure mode.
- [ ] Inspect the shared Dialog wrapper and Radix Dialog API surface.
- [ ] Identify whether `onOpenChange`, overlay element, or focus-guard changed.
- [ ] Update this plan with root cause.
- [ ] Commit: `docs(measure): diagnose app modal close test failures`

## Phase 2: Fix Shared Dialog / Modal Components
- [ ] Update the shared dialog primitive or modal wrappers to emit `onOpenChange` correctly.
- [ ] Ensure overlay/backdrop is clickable and identifiable in tests.
- [ ] Ensure Escape key closes modals.
- [ ] Run affected tests and verify green.
- [ ] Commit: `fix(app): restore modal Escape and backdrop close behavior`

## Phase 3: Update Per-Modal Tests
- [ ] Adjust selectors in `InteractiveSearchModal`, `MovieInteractiveSearchModal`, `SeriesInteractiveSearchModal`, `EditCollectionModal`, and `PageLayout` tests if markup changed.
- [ ] Add regression test for `PageLayout` More menu if missing.
- [ ] Run affected test files and verify green.
- [ ] Commit: `test(app): update modal close tests for current dialog markup`

## Phase 4: Regression Verification
- [ ] Run `cd app && bun run test -- src/components/search/InteractiveSearchModal.test.tsx src/components/movie/MovieInteractiveSearchModal.test.tsx src/components/series/SeriesInteractiveSearchModal.test.tsx src/components/collections/EditCollectionModal.test.tsx src/components/shell/PageLayout.test.tsx`
- [ ] Run root `CI=true npm test` and confirm no new failures.
- [ ] Commit: `test(app): verify modal close behavior fixes`

## Phase 5: Closeout
- [ ] Update `measure/tech-debt.md`.
- [ ] Add lesson to `measure/lessons-learned.md` if a recurring pattern surfaced.
- [ ] Archive this track.
- [ ] Commit: `docs(measure): close out modal close behavior track`
