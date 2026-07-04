# Spec: Fix App View/Card Component Prop Drift Test Failures

## Problem
Movie and series card/overview tests fail because the components changed props or markup:

- `MoviePosterView.test.tsx` — 8/10 fail: renders cards, monitored toggle, delete, search, rating, runtime, navigation, missing-poster fallback
- `SeriesOverviewView.test.tsx` — 8/9 fail: renders cards, monitored toggle, description expansion, episode progress, delete, navigation
- `IndexerCatalogPanel.test.tsx` — public/private catalog card assertions fail

## Goal
Align tests with current view/card component contracts.

## Acceptance Criteria
- [ ] `MoviePosterView.test.tsx` — all tests pass
- [ ] `SeriesOverviewView.test.tsx` — all tests pass
- [ ] `IndexerCatalogPanel.test.tsx` — all tests pass
- [ ] `cd app && bun run test -- <affected-files>` passes
- [ ] Root `CI=true npm test` shows no new failures

## Scope
Card/overview components and their tests only.
