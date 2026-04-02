# Spec: SeriesMonitoringService Corner-Case Testing

## Problem Statement

`SeriesMonitoringService` (304 lines, 8 monitoring strategies) has zero test coverage. It determines which episodes get searched for by `WantedSearchService` — incorrect monitoring logic directly causes wrong-episode grabs (directive's primary concern).

The `determineMonitoredEpisodes` method has complex branching:
- `latestSeason` has a fallback path (no air dates → highest season number) and tie-breaking logic (multiple seasons sharing the latest air date → pick highest season number)
- `lastSeason` uses `Math.max` which could produce `-Infinity` if the episode list is empty (currently guarded upstream but fragile)
- `existing` strategy depends on `fileVariants` presence
- `monitored` strategy preserves current state

## Acceptance Criteria

1. All 8 monitoring strategies (`all`, `none`, `firstSeason`, `lastSeason`, `latestSeason`, `pilotOnly`, `monitored`, `existing`) have dedicated unit tests covering normal and edge-case inputs
2. `applyMonitoringStrategy` is tested for: invalid strategy, non-existent series, empty episodes, correct DB updates, no-op when already correct
3. `getSeriesMonitoringState` is tested for: non-existent series, correct season aggregation
4. All new tests pass; full suite remains green

## Subsystem Scope

- `server/src/services/SeriesMonitoringService.ts` — only file in scope
- New test file: `server/src/services/SeriesMonitoringService.test.ts`
