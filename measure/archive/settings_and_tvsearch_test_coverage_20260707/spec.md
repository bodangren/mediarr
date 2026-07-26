# Spec: Settings and TV Search Service Test Coverage

## Problem
Two server services were deferred from `chore_untested_server_services_20260526` and remain without dedicated tests:

- `SettingsService` — reads and writes application settings, handles defaults and validation.
- `TvSearchService` — orchestrates TV episode/season searches across indexers and formats results.

## Goal
Add focused unit tests for both services, mocking repositories and external API clients per the established Mediarr pattern. Reach ≥80% branch coverage on new/changed code.

## Acceptance Criteria
- [ ] `SettingsService` tests cover CRUD, default fallback, validation, and serialization edge cases.
- [ ] `TvSearchService` tests cover season/episode search dispatch, result aggregation, and indexer error handling.
- [ ] `cd server && bun run test -- <affected-files>` passes.
- [ ] `cd server && bun run typecheck` reports no new errors in affected files.

## Scope
Server workspace only; no UI or API route changes unless a bug is found.

## Notes
- `TvSearchService` was previously an orphan alias; verify the current source file name and unify mocks accordingly.
- Use `vi.useFakeTimers({ toFake: ['Date'] })` if date assertions are needed, to avoid `setTimeout` interactions seen in `MediaSearchService` sibling tests.
