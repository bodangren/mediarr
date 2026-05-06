# Implementation Plan

## Phase 1: Contract & Tests
- [x] Write regression tests for renamed Cardigann indexer (settings.definitionId match)
- [x] Write regression tests for renamed Torznab indexer (settings.url match)
- [x] Write test for name-based fallback still working
- [x] Run tests — expect RED (current implementation fails renamed cases)

## Phase 2: Implement Fix
- [x] Refactor `GET /api/indexers/catalog` in `indexerRoutes.ts` to extract matching logic
- [x] Implement `implementation` + `definitionId` matching for Cardigann
- [x] Implement `implementation` + `baseUrl`/`url`/`host` matching for Torznab/Newznab
- [x] Preserve name-based matching as fallback
- [x] Run tests — expect GREEN

## Phase 3: Verification
- [x] Run full test suite (`CI=true npm test`) — all green (1805 tests)
- [x] Run app build (`npm run build --workspace=app`) — clean
- [x] Verify dev server starts and catalog endpoint returns correct `isConfigured` values
- [x] Commit and push
