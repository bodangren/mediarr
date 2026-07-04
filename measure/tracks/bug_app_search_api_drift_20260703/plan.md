# Plan: Fix App Search API Drift Test Failures

## Phase 1: Reproduce
- [x] Run each affected search test file and record exact assertion failures.
- [x] Inspect `seriesApi.searchReleases`, `movieApi.searchReleases`, and related API signatures.
- [x] Update plan with contract mismatch details.
- [x] Commit: `docs(measure): diagnose app search API drift failures`

### Phase 1 Findings

RED_TEST_COMMAND run (default 5 s timeout):
```
cd app && bun run test -- src/components/series/SeriesInteractiveSearchModal.test.tsx src/components/movie/MovieInteractiveSearchModal.test.tsx src/components/shell/PageLayout.test.tsx src/pages/CalendarPage.test.tsx src/components/movie/MoviePosterView.test.tsx src/components/series/SeriesOverviewView.test.tsx
```

Only three of the six referenced test files exist in the repo; the other three were removed or never created:
- `src/pages/CalendarPage.test.tsx` — does not exist
- `src/components/movie/MoviePosterView.test.tsx` — does not exist
- `src/components/series/SeriesOverviewView.test.tsx` — does not exist

Because Vitest ignores missing file arguments, the effective run covered:
- `src/components/series/SeriesInteractiveSearchModal.test.tsx` (23 tests)
- `src/components/movie/MovieInteractiveSearchModal.test.tsx` (17 tests)
- `src/components/shell/PageLayout.test.tsx` (7 tests)

Result with default timeout: **9 failed | 38 passed**.

#### Failures at default timeout

1. `MovieInteractiveSearchModal > fetches additional pages so results include non-first-page indexers`
   - AssertionError: expected 1st call to have been called with `[123, ObjectContaining{…}]`
   - Mismatch: test expects `{ page: 1, pageSize: 100 }`; component sends `{ pageSize: 500, title: 'Test Movie', year: 2024, imdbId: 'tt1234567' }`.

2. `MovieInteractiveSearchModal > re-runs search when the Search button is clicked` — timeout (5000 ms).
3. `MovieInteractiveSearchModal > calls releaseApi.grabCandidate with selected release details` — timeout.
4. `MovieInteractiveSearchModal > shows grabbing spinner while grab is in-flight` — timeout.
5. `MovieInteractiveSearchModal > shows Grabbed success state after successful grab` — timeout.
6. `SeriesInteractiveSearchModal > passes seasonNumber when searching at Season level` — timeout.
7. `SeriesInteractiveSearchModal > passes seasonNumber and episodeNumber when searching at Episode level` — timeout.
8. `SeriesInteractiveSearchModal > fetches additional pages so results include non-first-page indexers`
   - AssertionError: expected 1st call to have been called with `[10, ObjectContaining{…}]`
   - Mismatch: test expects `{ page: 1, pageSize: 100 }`; component sends `{ pageSize: 500 }`.

9. `PageLayout > renders mobile bottom navigation with 4 primary items and a More button` — timeout.

#### Re-run with `--testTimeout=30000`

Result: **2 failed | 45 passed**.
- The two pagination tests still fail with the same `pageSize: 100` vs `pageSize: 500` assertion.
- All season/episode tests pass (they were only timing out, not mis-wired).
- All `PageLayout` tests pass (the first test is render-slow, not contract-broken).

#### API signature inspection

`app/src/lib/api/seriesApi.ts:294`:
```ts
searchReleases(seriesId: number, input: SeriesSearchInput): Promise<PaginatedResult<...>>
interface SeriesSearchInput {
  query?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeId?: number;
  qualityProfileId?: number;
  page?: number;
  pageSize?: number;
}
```
- `seasonNumber` and `episodeNumber` are accepted in the POST body.
- `page`/`pageSize` are accepted as query params.

`app/src/lib/api/movieApi.ts:303`:
```ts
searchReleases(movieId: number, input: MovieSearchInput): Promise<PaginatedResult<...>>
interface MovieSearchInput {
  query?: string;
  title?: string;
  year?: number;
  tmdbId?: number;
  imdbId?: string;
  qualityProfileId?: number;
  page?: number;
  pageSize?: number;
}
```
- `title`, `year`, `imdbId`, `tmdbId` are accepted in the POST body.
- `page`/`pageSize` are accepted as query params.

#### Component wiring inspection

`SeriesInteractiveSearchModal.tsx:20` — `const SEARCH_PAGE_SIZE = 500;`
`SeriesInteractiveSearchModal.tsx:222-226` — calls `seriesApi.searchReleases(seriesId, { ...input, page, pageSize: SEARCH_PAGE_SIZE })` where `input` includes `seasonNumber` when level is `season`/`episode` and `episodeNumber` when level is `episode`.

`MovieInteractiveSearchModal.tsx:74` — `const SEARCH_PAGE_SIZE = 500;`
`MovieInteractiveSearchModal.tsx:197-201` — calls `movieApi.searchReleases(movieId, { ...baseInput, page, pageSize: SEARCH_PAGE_SIZE })` where `baseInput` includes `title`, conditional `imdbId`/`tmdbId`, and conditional `year`.

#### Contract mismatch summary

- **Pagination pageSize**: Tests expect `100`; components use `500`. This is the only true contract mismatch in the existing failures.
- **Season/episode params**: Component wiring is correct; tests only fail because the default 5 s timeout is insufficient for the interactive search round-trip. No source change needed other than stabilizing test timing.
- **PageLayout navigation**: The first test is render-slow and exceeds 5 s on the default runner; with a longer timeout it passes. No markup or navigation contract mismatch.
- **CalendarPage / MoviePosterView / SeriesOverviewView**: These test files do not exist, so the spec’s “view test drift” items are currently moot. They should be removed from this track’s scope or handled as a separate discovery task.

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
