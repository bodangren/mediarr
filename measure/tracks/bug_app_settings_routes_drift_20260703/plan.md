# Plan: Fix App Settings Routes API Drift Test Failures

## Phase 1: Reproduce
- [ ] Run `src/settings-routes.test.tsx` and capture all 5 failure details.
- [ ] Inspect current `indexerApi.create`, `indexerApi.remove`, `settingsApi.update`, and subtitle provider list contracts.
- [ ] Update plan with mismatch list.
- [ ] Commit: `docs(measure): diagnose app settings routes drift`

## Phase 2: Fix Indexer API Drift
- [ ] Update test expectations for create/remove payload/response.
- [ ] Verify indexer settings-route tests pass.
- [ ] Commit: `test(app): align settings route tests with indexer API`

## Phase 3: Fix Subtitle Providers / Settings Save
- [ ] Update subtitle provider rendering expectation.
- [ ] Update settings save payload expectation.
- [ ] Verify remaining tests pass.
- [ ] Commit: `test(app): align subtitle and settings save route tests`

## Phase 4: Regression
- [ ] Run `src/settings-routes.test.tsx`.
- [ ] Run root `CI=true npm test`.
- [ ] Commit: `test(app): verify settings routes drift fixes`

## Phase 5: Closeout
- [ ] Update `measure/tech-debt.md`.
- [ ] Archive track.
- [ ] Commit: `docs(measure): close out settings routes drift track`
