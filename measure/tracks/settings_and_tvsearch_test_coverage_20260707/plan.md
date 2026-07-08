# Plan: Settings and TV Search Service Test Coverage

## Phase 1: Discovery
- [ ] Locate `SettingsService` and `TvSearchService` source files.
- [ ] Map public methods, dependencies, and I/O boundaries.
- [ ] Identify existing mock factories and the `TvSearchService` alias history.
- [ ] Commit: `docs(measure): map SettingsService and TvSearchService contracts`

## Phase 2: Red Tests — SettingsService
- [ ] Add `SettingsService.test.ts` with failing tests for read operations.
- [ ] Add failing tests for write operations and validation.
- [ ] Add failing tests for default fallback and serialization edge cases.
- [ ] Run tests and confirm they fail (Red).
- [ ] Commit: `test(server): add red tests for SettingsService`

## Phase 3: Green Tests — SettingsService
- [ ] Implement or adjust `SettingsService` to satisfy the Red tests.
- [ ] Verify tests pass and coverage ≥80%.
- [ ] Commit: `feat(server): satisfy SettingsService tests`

## Phase 4: Red Tests — TvSearchService
- [ ] Add `TvSearchService.test.ts` with failing tests for season search dispatch.
- [ ] Add failing tests for episode search dispatch.
- [ ] Add failing tests for result aggregation and indexer error handling.
- [ ] Run tests and confirm they fail (Red).
- [ ] Commit: `test(server): add red tests for TvSearchService`

## Phase 5: Green Tests — TvSearchService
- [ ] Implement or adjust `TvSearchService` to satisfy the Red tests.
- [ ] Verify tests pass and coverage ≥80%.
- [ ] Run `bun run typecheck` in the server workspace.
- [ ] Commit: `feat(server): satisfy TvSearchService tests`

## Phase 6: Regression & Closeout
- [ ] Run the full server test suite and confirm no regressions.
- [ ] Update `measure/tech-debt.md` if these coverage gaps are resolved.
- [ ] Update `measure/tracks.md` to archive this track.
- [ ] Commit: `docs(measure): close out Settings and TV Search test coverage track`
