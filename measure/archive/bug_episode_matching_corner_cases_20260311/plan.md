# Plan: Episode Matching Corner Cases

## Phase 1 — autoSearchEpisode wrong-episode grab

- [x] 1.1 Red: Write `WantedSearchService.episodeValidation.test.ts` with tests:
  - `autoSearchEpisode` rejects a release with wrong episode number (S01E02 when searching S01E01)
  - `autoSearchEpisode` rejects a release with wrong season (S02E01 when searching S01E01)
  - `autoSearchEpisode` rejects a release with no parseable episode marker (season pack title)
  - `autoSearchEpisode` accepts a correctly matching release (S01E01)
  - `autoSearchEpisode` accepts a multi-episode release containing the requested episode (S01E01E02 when searching for S01E01)
  - Run tests — confirm they FAIL (candidates are not filtered) ✓ e1f6533
- [x] 1.2 Green: In `WantedSearchService.autoSearchEpisode`, after obtaining `searchResult.releases`,
  filter candidates to only those where `Parser.parse(r.title)` returns non-null,
  `parsed.seasonNumber === episode.seasonNumber`, and
  `parsed.episodeNumbers.includes(episode.episodeNumber)`.
  Pick `bestCandidate` from the filtered list. ✓ e1f6533
- [x] 1.3 Run tests — confirm Phase 1 tests PASS. ✓
- [x] 1.4 Commit Phase 1. ✓ e1f6533

## Phase 2 — isSingleSeasonPack false positive

- [x] 2.1 Red: Add tests to `WantedSearchService.episodeValidation.test.ts`:
  - `isSingleSeasonPack("Show.S01-S05.Complete")` → false
  - `isSingleSeasonPack("Show.S01-S10.Complete.Series.BluRay")` → false
  - `isSingleSeasonPack("Show.S01.Complete")` → true (should still work)
  - `isSingleSeasonPack("Show.Season.1.Complete")` → true (should still work, fixed dot-sep too)
  - Run tests — confirm the range-pack tests FAIL ✓
- [x] 2.2 Green: In `WantedSearchService.isSingleSeasonPack`, add a range detection check:
  `S\d{1,2}\s*[-–]\s*S?\d{1,2}` → return false. Also fix `hasSeason` to use `[.\s]*`
  between "Season" and digit to handle dot-separated titles. ✓ e1f6533
- [x] 2.3 Run tests — confirm Phase 2 tests PASS. ✓
- [x] 2.4 Commit Phase 2. ✓ e1f6533

## Phase 3 — ImportManager linked-episode-not-found fall-through

- [x] 3.1 Red: Add test to `ImportManager.test.ts`:
  - When `torrentRow.episodeId` is set but `episode.findUnique` returns null,
    `IMPORT_FAILED` is emitted, `organizeFile` is NOT called, and `organizeMovieFile`
    is NOT called.
  - Run test — confirm it FAILS (current code falls through silently) ✓
- [x] 3.2 Green: In `ImportManager.handleTorrentCompleted`, after `episode.findUnique` returns
  null (inside the `if (linkedEpisodeId)` block), emit `IMPORT_FAILED` and `continue`. ✓ c4055e6
- [x] 3.3 Run tests — confirm Phase 3 test PASSES. ✓
- [x] 3.4 Commit Phase 3. ✓ c4055e6

## Phase 4 — Full verification

- [x] 4.1 Run full test suite: 86 failures / 1305 passed — pre-existing app failures only; no new failures from this track.
- [x] 4.2 Run production build: PASSED (vite build succeeded).
- [x] 4.3 No newly introduced failures.
- [x] 4.4 Archive track.
