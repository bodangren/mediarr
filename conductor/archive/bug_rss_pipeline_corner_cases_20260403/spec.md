# Spec: RssMediaMonitor + RssSyncService Corner-Case Testing

## Problem Statement

The RSS pipeline (RssSyncService → RssMediaMonitor) is a core automatic acquisition path:
RSS feeds are polled, releases are stored, and wanted TV/movie media is auto-grabbed based
on scoring thresholds. This pipeline has only 6 basic tests covering the "happy path" and
a few trivial skip conditions. Multiple real corner cases are untested and may harbor bugs.

## Known Potential Bugs

1. **Season pack / empty episodeNumbers**: `handleTvRelease` accesses `parsed.episodeNumbers[0]`
   at line 79. If the parser returns a season pack (empty `episodeNumbers`), this evaluates to
   `undefined`, causing the Prisma query to match with `episodeNumber: undefined` — potentially
   matching the wrong episode or returning null silently.

2. **Multi-episode releases (S01E01E02)**: Only the first episode number is checked. If E01 is
   already downloaded but E02 is wanted, the RSS release is silently skipped.

3. **Movie releases without year**: `parseMovieTitle` returns `null` when no 4-digit year is found,
   completely skipping any movie release that omits the year from the title.

4. **TV score-rejection blocks movie fallback**: `handleTvRelease` returns `true` (matched) even
   when the release is rejected due to low score (line 103). This prevents `handleMovieRelease`
   from being tried, which is correct for TV releases but could be wrong if the TV match was a
   false positive.

5. **RssSyncService has zero tests**: No coverage for HTTP errors, non-Torznab indexers, JSON
   settings parsing, empty feeds, partial indexer failures, or upsert behavior.

## Acceptance Criteria

- All corner cases in RssMediaMonitor.handleTvRelease, handleMovieRelease, parseMovieTitle,
  and meetsMinimumAvailability have failing-then-passing tests
- RssSyncService.sync(), syncIndexer(), and storeRelease() have comprehensive corner-case tests
- Any bugs discovered are fixed
- All new tests pass in CI (`CI=true bun run test --run`)
- No regressions in the existing 1030+ test suite

## Subsystem Scope

- `server/src/services/RssMediaMonitor.ts` — auto-grab TV/movie from RSS releases
- `server/src/services/RssSyncService.ts` — RSS feed polling and release storage
