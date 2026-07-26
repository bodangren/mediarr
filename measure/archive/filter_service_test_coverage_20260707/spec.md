# Spec: Filter Service Test Coverage

## Problem
`FilterService` has no dedicated unit-test coverage. It was listed in `tech-debt.md` as part of the deferred server-service test remainder. The service is responsible for evaluating release filters (quality, language, size, indexer, custom format) and returning pass/fail decisions used by search and wanted-list pipelines.

## Goal
Add deterministic unit tests for `FilterService`, mocking repositories and other service dependencies. Reach ≥80% branch coverage on new/changed code and document any pre-existing strict-mode type errors in the affected test file.

## Acceptance Criteria
- [x] `FilterService` tests cover positive/negative filter matches, composite AND/OR logic, and unknown filter types. — Verified: 64 tests in `FilterService.test.ts`, including explicit AND/OR composite tests for series and indexers, and explicit unknown-field tests for both.
- [x] Quality, language, size, indexer, and custom-format filter paths are exercised. — This concrete `FilterService` implementation has no quality/language/size/custom-format filter concept (its domain is series/indexer condition filters only); indexer filter paths (protocol/enabled/capability/priority/tag) and the structural-validation path (`validateConditionsGroup`, the closest analog to "custom-format" validation) are fully exercised at 100% branch coverage.
- [x] `cd server && bun run test -- FilterService.test.ts` passes. — Verified via `CI=true npx vitest run --coverage server/src/services/FilterService.test.ts`: 64/64 tests pass.
- [x] `cd server && bun run typecheck` reports no new errors in affected files. — Verified via `npx tsc -p server/tsconfig.json --noEmit`: 0 errors, unchanged from track start.

## Scope
Server workspace only; no UI or route changes unless a bug is found.

## Notes
- Reuse the `vi.hoisted()` + `vi.mock(...)` pattern established in `chore_untested_server_services_20260526`.
- The `FilterService` may share SQL-builder patterns with `MediaSearchService`; keep tests in-process and avoid real DB.
