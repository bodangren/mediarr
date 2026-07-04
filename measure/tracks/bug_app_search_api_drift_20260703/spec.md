# Spec: Fix App Search API Drift Test Failures

## Problem
Search-related tests fail because the component code and tests disagree on API parameters, pagination page size, or result handling:

- `SeriesInteractiveSearchModal.test.tsx` — season/episode search params not passed as expected; pagination expects `pageSize: 100` but component uses `500`
- `MovieInteractiveSearchModal.test.tsx` — pagination expects `pageSize: 100` but component uses `500`
- `PageLayout.test.tsx` — navigation test in More menu times out
- `CalendarPage.test.tsx` — episode info and future-date search button assertions fail
- `MoviePosterView.test.tsx` — `onSearch` callback assertion fails
- `SeriesOverviewView.test.tsx` — episode progress assertion fails

## Goal
Align tests with current search API contracts and component behavior, or fix components if tests reflect the intended contract.

## Acceptance Criteria
- [ ] `SeriesInteractiveSearchModal` search-level tests pass
- [ ] `MovieInteractiveSearchModal` pagination test passes
- [ ] `CalendarPage` date/search assertions pass
- [ ] `MoviePosterView` and `SeriesOverviewView` search/progress assertions pass
- [ ] `PageLayout` More-menu navigation test passes
- [ ] `cd app && bun run test -- <affected-files>` passes
- [ ] Root `CI=true npm test` shows no new failures in these files

## Scope
Search API consumers and their tests only.
