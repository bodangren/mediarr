# Plan: Fix App Search API Drift Test Failures

## Phase 1: Reproduce
- [ ] Run each affected search test file and record exact assertion failures.
- [ ] Inspect `seriesApi.searchReleases`, `movieApi.searchReleases`, and related API signatures.
- [ ] Update plan with contract mismatch details.
- [ ] Commit: `docs(measure): diagnose app search API drift failures`

## Phase 2: Fix Series/Movie Search Pagination
- [ ] Decide correct `pageSize` for interactive search (100 or 500).
- [ ] Update component or test to match.
- [ ] Verify `fetches additional pages so results include non-first-page indexers` passes.
- [ ] Commit: `fix(app): align interactive search pagination pageSize with tests`

## Phase 3: Fix Series Search Level Params
- [ ] Verify `seasonNumber`/`episodeNumber` are passed correctly at Season/Episode level.
- [ ] Fix component or test wiring.
- [ ] Verify season/episode search tests pass.
- [ ] Commit: `fix(app): pass season/episode numbers in series interactive search`

## Phase 4: Fix Calendar/Poster/Overview Drift
- [ ] Update `CalendarPage`, `MoviePosterView`, and `SeriesOverviewView` tests for current markup/data.
- [ ] Verify affected files green.
- [ ] Commit: `test(app): update search-related view tests for current contracts`

## Phase 5: Regression Verification
- [ ] Run affected test files together.
- [ ] Run root `CI=true npm test` and confirm no regressions.
- [ ] Commit: `test(app): verify search API drift fixes`

## Phase 6: Closeout
- [ ] Update `measure/tech-debt.md`.
- [ ] Archive track.
- [ ] Commit: `docs(measure): close out search API drift track`
