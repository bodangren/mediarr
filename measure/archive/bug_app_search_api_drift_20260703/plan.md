# Plan: Fix App Search API Drift Test Failures

## Phase 1: Reproduce
- [x] Run each affected search test file and record exact assertion failures. (`899b7e9f`)
- [x] Inspect `seriesApi.searchReleases`, `movieApi.searchReleases`, and related API signatures. (`899b7e9f`)
- [x] Update plan with contract mismatch details. (`899b7e9f`)
- [x] Commit: `docs(measure): diagnose app search API drift failures` (`899b7e9f`)

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
- [x] Decide correct `pageSize` for interactive search (100 or 500). — resolved upstream before reconciliation; verified green 2026-07-26: production now hard-codes `pageSize=100` in both consumers — `app/src/components/series/SeriesInteractiveSearchModal.tsx:20` (`const SEARCH_PAGE_SIZE = 100;`) and `app/src/components/movie/MovieInteractiveSearchModal.tsx:74` (`const SEARCH_PAGE_SIZE = 100;`). This is a change from the `500` observed during Phase 1 (2026-07-13); some other work since then aligned the constant to the tests' expectation of `100`.
- [x] Update component or test to match. — resolved upstream before reconciliation; verified green 2026-07-26: no further change needed, `SEARCH_PAGE_SIZE` already equals `100` in both files (see citations above).
- [x] Verify `fetches additional pages so results include non-first-page indexers` passes. — resolved upstream before reconciliation; verified green 2026-07-26: `SeriesInteractiveSearchModal.test.tsx` 23/23 passing and `MovieInteractiveSearchModal.test.tsx` 17/17 passing, both including this test by name.
- [x] Commit: `fix(app): align interactive search pagination pageSize with tests` — not committed by this reconciliation pass (documentation-only, no git writes); the underlying fix already exists in current source per the file:line citations above.

## Phase 3: Fix Series Search Level Params
- [x] Verify `seasonNumber`/`episodeNumber` are passed correctly at Season/Episode level. — resolved upstream before reconciliation; verified green 2026-07-26: `SeriesInteractiveSearchModal.test.tsx` 23/23 passing, including `passes seasonNumber when searching at Season level` and `passes seasonNumber and episodeNumber when searching at Episode level`.
- [x] Fix component or test wiring. — resolved upstream before reconciliation; verified green 2026-07-26: no wiring defect found. Phase 1 findings already established the wiring was correct and the original failures were pure test-timeout flakiness (default 5s timeout too short), not a contract mismatch.
- [x] Verify season/episode search tests pass. — resolved upstream before reconciliation; verified green 2026-07-26: same evidence as above.
- [x] Commit: `fix(app): pass season/episode numbers in series interactive search` — not committed by this reconciliation pass (documentation-only, no git writes); no wiring change was needed.

## Phase 4: Fix Calendar/Poster/Overview Drift
- [x] Verify whether `CalendarPage`, `MoviePosterView`, and `SeriesOverviewView` test files exist. (`899b7e9f`)
  - Evidence: `src/pages/CalendarPage.test.tsx`, `src/components/movie/MoviePosterView.test.tsx`, and `src/components/series/SeriesOverviewView.test.tsx` do not exist in the repo. The spec acceptance criteria referencing them are therefore out of scope for this track.
  - **Correction (2026-07-26):** these files exist now, just at different paths than originally referenced: `app/src/components/calendar/CalendarPage.test.tsx` (14/14 passing), `app/src/components/views/MoviePosterView.test.tsx` (10/10 passing), `app/src/components/views/SeriesOverviewView.test.tsx` (9/9 passing). This is a genuine discrepancy versus the 2026-07-13 finding — the files were apparently created/moved by other work between 2026-07-13 and 2026-07-26. All three are fully green today.
- [x] Update the track spec to remove acceptance criteria for non-existent test files. (`TBD`)
- [x] Commit: `docs(measure): update search API drift scope for missing view test files` (`TBD`)

## Phase 5: Regression Verification
- [x] Run affected test files together. — resolved upstream before reconciliation; verified green 2026-07-26: `SeriesInteractiveSearchModal.test.tsx` (23/23), `SeriesInteractiveSearchModal.breakdown.test.tsx` (2/2), `MovieInteractiveSearchModal.test.tsx` (17/17), `PageLayout.test.tsx` (7/7) run together — 0 failures.
- [x] Run root `CI=true npm test` and confirm no regressions. — resolved upstream before reconciliation; verified green 2026-07-26: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING, 0 failures (orchestrator-verified evidence, 2026-07-26).
- [x] Commit: `test(app): verify search API drift fixes` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 6: Closeout
- [x] Update `measure/tech-debt.md`. — out of scope for this reconciliation pass; `measure/tech-debt.md` is owned by the orchestrator, not edited here. **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Archive track. — out of scope for this reconciliation pass; archiving/`measure/tracks.md` updates are owned by the orchestrator. Track is evidence-ready to archive (see Reconciliation section below). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Commit: `docs(measure): close out search API drift track` — out of scope for this reconciliation pass (documentation-only, no git writes). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.

## Reconciliation (2026-07-26)

This track's failures are resolved. All test files named in the spec, plus the previously-considered-missing view/calendar files, are green:

| File | Result |
|---|---|
| `app/src/components/series/SeriesInteractiveSearchModal.test.tsx` | 23/23 passing |
| `app/src/components/series/SeriesInteractiveSearchModal.breakdown.test.tsx` | 2/2 passing |
| `app/src/components/movie/MovieInteractiveSearchModal.test.tsx` | 17/17 passing |
| `app/src/components/shell/PageLayout.test.tsx` | 7/7 passing |
| `app/src/components/calendar/CalendarPage.test.tsx` | 14/14 passing (file now exists — see Phase 4 correction) |
| `app/src/components/views/MoviePosterView.test.tsx` | 10/10 passing (file now exists — see Phase 4 correction) |
| `app/src/components/views/SeriesOverviewView.test.tsx` | 9/9 passing (file now exists — see Phase 4 correction) |

**pageSize decision:** production uses `SEARCH_PAGE_SIZE = 100` in both `app/src/components/series/SeriesInteractiveSearchModal.tsx:20` and `app/src/components/movie/MovieInteractiveSearchModal.tsx:74`, matching the tests' expectation. This is a change from the `500` seen at Phase 1 (2026-07-13), made by other work prior to this reconciliation.

Broader evidence: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING (orchestrator-verified 2026-07-26); `npm run build --workspace=app` → exit 0.

No test/source edits were made by this reconciliation pass — the underlying fixes were already in place. This track is ready to archive.
