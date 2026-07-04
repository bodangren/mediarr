# Spec: Fix App Modal Close Behavior Test Failures

## Problem
Six modal components fail close-interaction tests across the app workspace:

- `InteractiveSearchModal` — Escape and backdrop close
- `MovieInteractiveSearchModal` — Escape and backdrop close
- `SeriesInteractiveSearchModal` — Escape and backdrop close
- `EditCollectionModal` — header close button
- `PageLayout` mobile More menu — open/close via More button, backdrop, Escape

These tests likely broke after a Radix Dialog or custom Dialog wrapper change (e.g., `onOpenChange` wiring, overlay markup, or focus-guard behavior).

## Goal
All listed modal close tests pass without regressing real UX.

## Acceptance Criteria
- [ ] `src/components/search/InteractiveSearchModal.test.tsx` — 2 close tests green
- [ ] `src/components/movie/MovieInteractiveSearchModal.test.tsx` — 2 close tests green
- [ ] `src/components/series/SeriesInteractiveSearchModal.test.tsx` — 2 close tests green
- [ ] `src/components/collections/EditCollectionModal.test.tsx` — 1 close test green
- [ ] `src/components/shell/PageLayout.test.tsx` — mobile More menu open/close tests green
- [ ] `cd app && bun run test -- <affected-files>` passes
- [ ] Root `CI=true npm test` shows no new failures in these files

## Scope
Only modal close/open interaction wiring and the tests that verify it. Do not refactor unrelated modal internals.
