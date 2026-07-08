# Plan: Subtitle Services Test Coverage

## Phase 1: Discovery & Contract Mapping
- [ ] Locate `SubtitleNamingService`, `SubtitleRequirementEngine`, and `SubtitleProviderFactory` source files.
- [ ] Document public method signatures, dependencies, and external I/O (DB, filesystem, other services).
- [ ] Identify existing test helpers and mock factories to reuse.
- [ ] Commit: `docs(measure): map subtitle service contracts for test coverage`

## Phase 2: Red Tests — SubtitleNamingService
- [ ] Add `SubtitleNamingService.test.ts` with failing tests for filename construction.
- [ ] Add failing tests for language ordering and tag sanitization.
- [ ] Run tests and confirm they fail (Red).
- [ ] Commit: `test(server): add red tests for SubtitleNamingService`

## Phase 3: Green Tests — SubtitleNamingService
- [ ] Implement or adjust `SubtitleNamingService` to satisfy the Red tests.
- [ ] Verify tests pass and coverage ≥80%.
- [ ] Commit: `feat(server): satisfy SubtitleNamingService tests`

## Phase 4: Red Tests — SubtitleRequirementEngine
- [ ] Add `SubtitleRequirementEngine.test.ts` with failing tests for requirement rules.
- [ ] Add failing tests for language matching and empty/unknown metadata.
- [ ] Run tests and confirm they fail (Red).
- [ ] Commit: `test(server): add red tests for SubtitleRequirementEngine`

## Phase 5: Green Tests — SubtitleRequirementEngine & ProviderFactory
- [ ] Implement or adjust `SubtitleRequirementEngine` to satisfy tests.
- [ ] Add `SubtitleProviderFactory.test.ts` with Red tests for provider resolution.
- [ ] Implement/adjust `SubtitleProviderFactory` to satisfy tests.
- [ ] Verify all three suites pass with ≥80% branch coverage.
- [ ] Run `bun run typecheck` in the server workspace.
- [ ] Commit: `feat(server): satisfy subtitle requirement and provider tests`

## Phase 6: Regression & Closeout
- [ ] Run the full server test suite and confirm no regressions.
- [ ] Update `measure/tech-debt.md` to reflect resolved deferred coverage.
- [ ] Update `measure/tracks.md` to archive this track.
- [ ] Commit: `docs(measure): close out subtitle services test coverage track`
