# Spec: Corner-Case Testing — WantedSearchService + ImportManager

## Context

The directive mandates comprehensive corner-case testing for the media acquisition pipeline.
Existing tests cover the happy paths and several known bugs, but significant untested code
paths remain in both WantedSearchService and ImportManager.

## Problem Statement

1. **WantedSearchService** — `titlesMatch` has untested edge cases (Cardigann template rejection,
   year stripping, embedded series name rejection). `isSeasonComplete` is not tested with null
   air dates. Series with no monitored seasons is untested.

2. **ImportManager** — The parser-based "slow path" (lines 329-513) is entirely untested.
   This is the path used when a torrent has no linked episodeId/movieId (e.g., manually
   added torrents, RSS grabs without media context). `findMovieMatch` year-scoped matching
   is untested. Multi-file torrents with mixed content are untested. Import hook failure
   resilience is untested.

## Subsystem Scope

- `server/src/services/WantedSearchService.ts` (541 lines)
- `server/src/services/ImportManager.ts` (748 lines)

## Acceptance Criteria

- All new tests follow the existing TDD pattern (Red → Green → Refactor)
- Every new test file ends with a test-run checkpoint
- Full test suite (91 files) remains green after each phase
- Any bugs discovered during testing are fixed with minimal code changes
- No new features, UI changes, or infrastructure work

## Out of Scope

- MediaSearchService / SearchAggregationService (covered in a subsequent track)
- SeedingProtector seed-ratio deletion logic
- Route-level tests
