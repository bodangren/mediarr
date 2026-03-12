# Plan: ImportManager Cleanup — Linked-Movie-Null Fix & Code Quality

## Phase 1 — Linked-movie-null IMPORT_FAILED (TDD)

- [x] 1.1 Red: Add test to `ImportManager.test.ts`:
  - When `torrentRow.movieId` is set but `movie.findUnique` returns null,
    `IMPORT_FAILED` is emitted, `organizeFile` is NOT called, and
    `organizeMovieFile` is NOT called.
  - Run test — confirm it FAILS (current code falls through silently)
- [x] 1.2 Green: In `ImportManager.handleTorrentCompleted`, after `movie.findUnique`
  returns null inside the `if (linkedMovieId)` block, emit `IMPORT_FAILED` and `continue`.
- [x] 1.3 Run tests — confirm Phase 1 test PASSES. ✓ 12/12
- [ ] 1.4 Commit Phase 1.

## Phase 2 — Code quality cleanup

- [ ] 2.1 Fix trailing whitespace on continuation lines inside the score-threshold
  blocks of `autoSearchMovie` and `autoSearchEpisode` in `WantedSearchService.ts`.
- [ ] 2.2 Verify/correct the `Parser.parse` comment for S01E01E02 in
  `WantedSearchService.episodeValidation.test.ts`.
- [ ] 2.3 Run affected tests — confirm they still pass.
- [ ] 2.4 Commit Phase 2.

## Phase 3 — Full verification

- [ ] 3.1 Run full test suite.
- [ ] 3.2 Run production build.
- [ ] 3.3 Note any pre-existing failures; confirm no new failures.
- [ ] 3.4 Archive track.
