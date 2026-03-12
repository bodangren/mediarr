# Spec: ImportManager Cleanup — Linked-Movie-Null Fix & Code Quality

## Problem Statement

### Bug — ImportManager linked-movie fast path: silent fall-through when movie not in DB

Yesterday's track (`bug_episode_matching_corner_cases_20260311`) fixed the linked-episode fast
path: when `episodeId` is set but `episode.findUnique` returns null, `IMPORT_FAILED` is emitted
and the loop continues.

The **linked-movie fast path has the identical bug**. When `torrentRow.movieId` is set but
`movie.findUnique` returns null (movie was deleted after grab), the code falls through to the
parser/fallback paths. This can cause the file to be incorrectly imported as a TV episode,
or silently produce no activity event for the failure.

### Code Quality Debt

1. Trailing whitespace on continuation lines inside `autoSearchMovie` and `autoSearchEpisode`
   score-threshold blocks (lines 86–91 and 175–180 of `WantedSearchService.ts`).
2. Inaccurate comment in `WantedSearchService.episodeValidation.test.ts` describing
   `Parser.parse` behaviour for `S01E01E02` titles — should be verified and corrected.

## Acceptance Criteria

1. When `torrentRow.movieId` is set but `movie.findUnique` returns null, `ImportManager`
   must emit `IMPORT_FAILED` and skip the file (not fall through to parser paths).
2. `organizeFile` and `organizeMovieFile` must NOT be called for the skipped file.
3. Trailing whitespace lines in `WantedSearchService.ts` score-threshold blocks are removed.
4. The `Parser.parse` comment in the episode-validation test is accurate.

## Subsystem Scope

- `server/src/services/ImportManager.ts` (linked-movie fast path fix)
- `server/src/services/ImportManager.test.ts` (new test case)
- `server/src/services/WantedSearchService.ts` (whitespace cleanup)
- `server/src/services/WantedSearchService.episodeValidation.test.ts` (comment cleanup)
