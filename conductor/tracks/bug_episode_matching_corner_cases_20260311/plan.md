# Plan: Episode Matching Corner Cases

## Phase 1 — autoSearchEpisode wrong-episode grab

- [ ] 1.1 Red: Write `WantedSearchService.episodeValidation.test.ts` with tests:
  - `autoSearchEpisode` rejects a release with wrong episode number (S01E02 when searching S01E01)
  - `autoSearchEpisode` rejects a release with wrong season (S02E01 when searching S01E01)
  - `autoSearchEpisode` rejects a release with no parseable episode marker (season pack title)
  - `autoSearchEpisode` accepts a correctly matching release (S01E01)
  - `autoSearchEpisode` accepts a multi-episode release containing the requested episode (S01E01E02 when searching for S01E01)
  - Run tests — confirm they FAIL (candidates are not filtered)
- [ ] 1.2 Green: In `WantedSearchService.autoSearchEpisode`, after obtaining `searchResult.releases`,
  filter candidates to only those where `Parser.parse(r.title)` returns non-null,
  `parsed.seasonNumber === episode.seasonNumber`, and
  `parsed.episodeNumbers.includes(episode.episodeNumber)`.
  Pick `bestCandidate` from the filtered list.
- [ ] 1.3 Run tests — confirm Phase 1 tests PASS.
- [ ] 1.4 Commit Phase 1.

## Phase 2 — isSingleSeasonPack false positive

- [ ] 2.1 Red: Add tests to `WantedSearchService.episodeValidation.test.ts` (or new file):
  - `isSingleSeasonPack("Show.S01-S05.Complete")` → false
  - `isSingleSeasonPack("Show.S01-S10.Complete.Series.BluRay")` → false
  - `isSingleSeasonPack("Show.S01.Complete")` → true (should still work)
  - `isSingleSeasonPack("Show.Season.2.Complete")` → true (should still work)
  - Run tests — confirm the range-pack tests FAIL
- [ ] 2.2 Green: In `WantedSearchService.isSingleSeasonPack`, add a range detection check:
  if the title contains a season range pattern (e.g. `S\d{1,2}[-–]\s*S?\d{1,2}`), return false.
- [ ] 2.3 Run tests — confirm Phase 2 tests PASS.
- [ ] 2.4 Commit Phase 2.

## Phase 3 — ImportManager linked-episode-not-found fall-through

- [ ] 3.1 Red: Add test to `ImportManager.test.ts`:
  - When `torrentRow.episodeId` is set but `episode.findUnique` returns null,
    `IMPORT_FAILED` is emitted, `organizeFile` is NOT called, and `organizeMovieFile`
    is NOT called.
  - Run test — confirm it FAILS (current code falls through silently)
- [ ] 3.2 Green: In `ImportManager.handleTorrentCompleted`, after `episode.findUnique` returns
  null (inside the `if (linkedEpisodeId)` block), emit `IMPORT_FAILED` and `continue`.
- [ ] 3.3 Run tests — confirm Phase 3 test PASSES.
- [ ] 3.4 Commit Phase 3.

## Phase 4 — Full verification

- [ ] 4.1 Run full test suite: `CI=true bun run test --run 2>&1 | tail -60`
- [ ] 4.2 Run production build: `cd app && npm run build 2>&1 | tail -20`
- [ ] 4.3 Fix any newly introduced failures (max 2 attempts).
- [ ] 4.4 Archive track.
