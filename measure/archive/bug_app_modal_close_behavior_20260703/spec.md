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
- [x] `src/components/search/InteractiveSearchModal.test.tsx` — 2 close tests green (`8713f739`)
- [x] `src/components/movie/MovieInteractiveSearchModal.test.tsx` — 2 close tests green (`8713f739`)
- [x] `src/components/series/SeriesInteractiveSearchModal.test.tsx` — 2 close tests green (`8713f739`)
- [x] `src/components/collections/EditCollectionModal.test.tsx` — 1 close test green (`6b4dfcd3`)
- [x] `src/components/shell/PageLayout.test.tsx` — mobile More menu open/close tests green (`6b4dfcd3`)
- [x] `cd app && bun run test -- <affected-files>` passes for close-behavior subset (`d17da788`)
- [x] Root `CI=true npm test` shows no new failures in these files (`d17da788`)

## Scope
Only modal close/open interaction wiring and the tests that verify it. Do not refactor unrelated modal internals.
