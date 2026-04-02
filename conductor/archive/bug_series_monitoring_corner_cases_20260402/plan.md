# Plan: SeriesMonitoringService Corner-Case Testing

## Phase 1 — `determineMonitoredEpisodes` unit tests

- [x] Test `all` strategy: monitors every episode
- [x] Test `none` strategy: monitors zero episodes
- [x] Test `firstSeason` strategy: monitors only S01 episodes; handles multi-season with no S01
- [x] Test `lastSeason` strategy: monitors highest-season episodes; handles single-season series
- [x] Test `latestSeason` strategy with air dates: picks season with most recent air date; tie-breaks by highest season number
- [x] Test `latestSeason` strategy without air dates: falls back to highest season number
- [x] Test `latestSeason` strategy with mixed air dates (some null): uses only non-null dates; falls back if all null
- [x] Test `pilotOnly` strategy: monitors only S01E01; handles missing pilot
- [x] Test `monitored` strategy: preserves current monitored state
- [x] Test `existing` strategy: monitors only episodes with fileVariants; handles all-empty and all-present
- [x] Test empty episodes array for all strategies
- **Checkpoint:** Run `CI=true bun run test --run` and confirm all new tests pass

## Phase 2 — `applyMonitoringStrategy` integration tests

- [x] Invalid strategy throws `ValidationError` with valid types in details
- [x] Non-existent series throws `NotFoundError`
- [x] Empty episodes returns `{ updatedEpisodes: 0, totalEpisodes: 0 }`
- [x] Correct updates applied: monitor → unmonitor and unmonitor → monitor
- [x] No-op when all episodes already match strategy (0 updates)
- [x] Transaction wraps all updates (verify prisma.$transaction called with correct payload)
- **Checkpoint:** Run `CI=true bun run test --run` and confirm all new tests pass

## Phase 3 — `getSeriesMonitoringState` tests

- [x] Non-existent series throws `NotFoundError`
- [x] Returns correct season-level aggregation (totalEpisodes, monitoredEpisodes, episodesWithFiles)
- [x] Returns `seriesMonitored` from series record
- [x] Handles series with no seasons (empty seasons array)
- **Checkpoint:** Run `CI=true bun run test --run` and confirm all new tests pass

## Phase 4 — Verify

- [x] Run full test suite: `CI=true bun run test --run 2>&1 | tail -60`
- [x] Run production build: `cd app && npm run build 2>&1 | tail -20`
- [x] Fix any new failures (max 2 attempts)
