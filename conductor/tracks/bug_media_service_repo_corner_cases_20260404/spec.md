# Spec: MediaService & MediaRepository Corner-Case Testing

## Problem

`MediaService` and `MediaRepository` are core to the media acquisition pipeline but have **zero dedicated test coverage**. Both contain logic with real corner-case potential:

1. **MediaService.deleteMedia** — manual cascade deletion (episodes → seasons → series) with file deletion; could fail silently or leave orphaned records
2. **MediaService.getMovieCandidatesForSearch** — filters movies by availability status; metadata provider interaction could produce wrong candidates
3. **MediaRepository.upsertSeasonsAndEpisodes** — 80-line method populating seasons/episodes from metadata; handles missing tvdbId, missing seasonNumber, empty episodes arrays, duplicate seasons
4. **MediaRepository.upsertMovie/upsertSeries** — dual upsert (media + movie/series) with partial field propagation; could leave media record out of sync with type-specific record

## Acceptance Criteria

1. All public methods of `MediaService` have test coverage for happy path and at least one error/edge path
2. `MediaRepository.upsertSeasonsAndEpisodes` has tests for: empty episodes, missing tvdbId, missing seasonNumber, episodes without matching season, duplicate seasons, null airDate
3. Any bugs found are fixed with minimal code changes
4. Full test suite remains green

## Subsystem Scope

Directive subsystem 4: "Any other subsystem surfaced by test failures during the above work." These services are data-layer primitives used by all three primary subsystems.
