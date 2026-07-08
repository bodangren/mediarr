# Plan: Filter Service Test Coverage

## Phase 1: Discovery
- [ ] Locate `FilterService` source and its public methods.
- [ ] Map dependencies (repositories, custom-format service, indexer service, etc.).
- [ ] Identify existing mock factories to reuse.
- [ ] Commit: `docs(measure): map FilterService contracts for test coverage`

## Phase 2: Red Tests — Core Filter Logic
- [ ] Add `FilterService.test.ts` with failing tests for single-filter pass/fail.
- [ ] Add failing tests for composite AND/OR logic.
- [ ] Add failing tests for unknown/unsupported filter types.
- [ ] Run tests and confirm they fail (Red).
- [ ] Commit: `test(server): add red tests for FilterService`

## Phase 3: Green Tests — Core Filter Logic
- [ ] Implement or adjust `FilterService` to satisfy the Red tests.
- [ ] Verify tests pass and coverage ≥80%.
- [ ] Commit: `feat(server): satisfy FilterService core tests`

## Phase 4: Red Tests — Filter Categories
- [ ] Add failing tests for quality filter evaluation.
- [ ] Add failing tests for language filter evaluation.
- [ ] Add failing tests for size and indexer filter evaluation.
- [ ] Add failing tests for custom-format filter evaluation.
- [ ] Run tests and confirm they fail (Red).
- [ ] Commit: `test(server): add red tests for FilterService categories`

## Phase 5: Green Tests — Filter Categories
- [ ] Implement or adjust `FilterService` to satisfy category tests.
- [ ] Verify full `FilterService` suite passes with ≥80% branch coverage.
- [ ] Run `bun run typecheck` in the server workspace.
- [ ] Commit: `feat(server): satisfy FilterService category tests`

## Phase 6: Regression & Closeout
- [ ] Run the full server test suite and confirm no regressions.
- [ ] Update `measure/tech-debt.md` if this resolves the FilterService coverage gap.
- [ ] Update `measure/tracks.md` to archive this track.
- [ ] Commit: `docs(measure): close out FilterService test coverage track`
