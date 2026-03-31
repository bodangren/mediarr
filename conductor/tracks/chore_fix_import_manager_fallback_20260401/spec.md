# Spec: Fix ImportManager Episode-to-Movie Fallback Bug

## Context

The `bug_corner_case_testing_wantedsearch_import_20260331` track discovered a bug in
ImportManager's slow path. A test was written that documents the bug (see
`ImportManager.slowPath.test.ts:136` — "BUG: parsed episode with no matching DB episode
does NOT fall through to movie path"). The bug remains unfixed and is tracked in tech-debt.

## Problem Statement

`ImportManager.ts:439` guards the movie import path with `if (!parsed)`. When the release
parser successfully parses a filename as an episode (returns a non-null `parsed` result),
but no matching episode exists in the DB (series found but episode missing, or series not
found), the code falls through the episode block without `continue` — but then the movie
path is skipped because `parsed` is truthy. The file ends up at the "no match found"
IMPORT_FAILED event at line 500.

Real-world impact: A movie file named with episode-style patterns (e.g., a standalone film
released as "Movie.2024.S01E01.1080p.mkv") will never be matched as a movie, even if the
movie exists in the library.

## Subsystem Scope

- `server/src/services/ImportManager.ts` — lines 329-513 (slow path)
- `server/src/services/ImportManager.slowPath.test.ts` — update existing bug-documented test

## Acceptance Criteria

- The `if (!parsed)` guard at line 439 is replaced with a condition that allows movie fallback
  when the episode path found no matching DB episode
- The existing "BUG" test is updated to assert the correct behavior (movie fallback succeeds)
- A new test covers: parsed as episode, series NOT found in DB → falls through to movie path
- A new test covers: parsed as episode, series found but episode NOT found → falls through to movie path
- Full test suite remains green

## Out of Scope

- ImportManager fast path (linked episodeId/movieId) — not affected by this bug
- SearchAggregationService / MediaSearchService — next subsystem per directive
