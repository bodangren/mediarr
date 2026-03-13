# Spec: WantedSearchService — Wrong-Series Episode Grab + autoSearchMovie Coverage

## Problem Statement

Two bugs / gaps confirmed in `WantedSearchService`:

### Bug 1 — autoSearchEpisode grabs wrong-series episode

`autoSearchEpisode` filters candidates by `seasonNumber` and `episodeNumber` (fixed in a prior
track) but does **not** check that the release title belongs to the requested series.

When an indexer returns results for two shows that have the same season/episode numbers,
the wrong show's episode can be grabbed if its `customFormatScore` is higher.

**Example:** Searching for *Breaking Bad* S01E01 — an indexer also returns
*Better Call Saul* S01E01 with a higher score. The current filter passes both candidates;
`validCandidates[0]` = Better Call Saul → wrong content is grabbed.

**Fix:** Add `this.titlesMatch(r.title, series.title)` to the candidate filter inside
`autoSearchEpisode`. The private `titlesMatch()` method already exists and handles
normalisation, article stripping, and year variants — it just isn't called here.

### Bug 2 — autoSearchMovie core paths are entirely untested

`autoSearchMovie` has only release-date guard tests. The following paths have zero coverage:
- Movie not found in DB
- No releases returned by indexers
- Best candidate below score threshold
- Successful grab + RELEASE_GRABBED event emitted
- `searchAllIndexers` throws → failure returned

These paths are unlikely to be broken but must be verified.

## Acceptance Criteria

1. A failing test that reproduces the wrong-series episode grab — confirmed RED before fix.
2. After fix: wrong-series candidate is rejected; correct-series candidate is grabbed.
3. All pre-existing episode validation tests still pass (no regression).
4. `autoSearchMovie` has tests for all 5 untested paths above.
5. Full test suite passes with no new failures.

## Subsystem Scope

- `server/src/services/WantedSearchService.ts`
- `server/src/services/WantedSearchService.episodeValidation.test.ts`  ← add wrong-series test
- `server/src/services/WantedSearchService.autoSearchMovie.test.ts`    ← new file
