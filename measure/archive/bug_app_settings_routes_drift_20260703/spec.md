# Spec: Fix App Settings Routes API Drift Test Failures

## Problem
`src/settings-routes.test.tsx` has 5 failures covering API payload/response drift and subtitle provider rendering:

- `calls indexerApi.create with correct payload on form submit`
- `reloads indexers after successful create`
- `calls indexerApi.remove when Delete is clicked`
- `loads and displays subtitle providers`
- `calls settingsApi.update with correct payload on save`

These tests exercise routed settings pages and their API contracts.

## Goal
Align settings-route tests with current API contracts and page behavior.

## Acceptance Criteria
- [ ] `settings-routes.test.tsx` — all tests pass
- [ ] `cd app && bun run test -- src/settings-routes.test.tsx` passes
- [ ] Root `CI=true npm test` shows no new failures

## Scope
Settings route tests and the settings/indexer/subtitle APIs they depend on.
