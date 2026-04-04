# Spec: WantedSearchService Comprehensive Corner-Case Testing

## Problem Statement

The WantedSearchService has been partially tested but several critical edge cases remain unverified:

1. **No movie title validation on grabbed releases** — `autoSearchMovie` trusts the indexer's movie search entirely. If an indexer returns a wrong movie with a high score (e.g., a remake, similarly-titled film), it will be grabbed without any title verification.

2. **`isSeasonComplete` vs `isReleasedYet` inconsistency** — `isSeasonComplete` uses `<= now` with no grace period, while `isReleasedYet` uses a 24-hour grace period. This means a season could be considered "complete" for pack searching while individual episodes within it would still be skipped by the air-date guard, causing the service to grab a season pack before all episodes have actually aired.

3. **Regex fallback only captures first episode number** — `S01E01E02` returns `episodeNumbers: [1]` from the regex fallback. If searching for E02 and AI parsing is unavailable, this valid multi-episode release would be incorrectly rejected.

## Acceptance Criteria

- [ ] **Bug 1 (Movie title validation):** A test proves that `autoSearchMovie` can grab a release for the wrong movie when the indexer returns a similarly-titled film. After fix, the service must validate that the grabbed release title contains the movie title (with the same tolerance as `titlesMatch` uses for series).

- [ ] **Bug 2 (Season completeness consistency):** A test proves that `isSeasonComplete` considers a season complete when the last episode aired less than 24 hours ago, while `isReleasedYet` would skip that same episode. After fix, both functions must use the same grace period.

- [ ] **Bug 3 (Multi-episode regex capture):** A test proves that `S01E01E02` parsed via regex fallback returns only `episodeNumbers: [1]`, causing E02 searches to miss valid releases. After fix, the regex must capture all episode numbers in multi-episode patterns.

- [ ] All existing tests continue to pass (no regressions).
- [ ] Each bug fix includes at least 3 tests: one that reproduces the bug (red), one that verifies the fix (green), and one that tests an adjacent edge case.

## Subsystem Scope

- `WantedSearchService.ts` — primary changes
- `ReleaseParser.ts` — regex fallback fix for multi-episode capture
- Test files: new test file or additions to existing WantedSearchService test files

## Out of Scope

- Retry logic for failed grabs (design decision, not a bug)
- Fire-and-forget promise tracking (architectural improvement, not a bug)
- UI changes
- Any other service
