# Plan: Search Release-Date Guard & System UI Consistency Refactor

## Phase 1 — UI Consistency (StatsPage)

- [x] 1.1 Refactor `StatsPage` to use `RouteScaffold` instead of the hand-rolled header/wrapper
- [x] 1.2 Verify the visual layout is equivalent (no regression)

## Phase 2 — Search Release-Date Guard (Backend)

- [x] 2.1 Add private helper `isReleasedYet(date: Date | null): boolean` to `WantedSearchService`
- [x] 2.2 Guard `autoSearchMovie`: check `movie.releaseDate`; skip if not yet released
- [x] 2.3 Guard `autoSearchEpisode`: check `episode.airDateUtc`; skip if not yet aired
- [x] 2.4 Tighten `autoSearchSeries`: filter `missingEpisodes` by `isReleasedYet(ep.airDateUtc)` before individual searches
- [x] 2.5 Tighten `autoSearchAll`: add `OR: [{ releaseDate: null }, { releaseDate: { lte: cutoff } }]` to the Prisma movie query

## Phase 3 — Tests

- [x] 3.1 Add unit tests for `isReleasedYet` edge cases (null, past, exactly +1 day boundary, future)
- [x] 3.2 Add tests for `autoSearchMovie` pre-release skip path
- [x] 3.3 Add tests for `autoSearchEpisode` pre-air skip path
- [x] 3.4 Run full test suite; confirm no regressions

## Phase 4 — Build & Cleanup

- [x] 4.1 Run production build (`cd app && npm run build`)
- [x] 4.2 Update `conductor/tracks.md` — remove planned item, mark track in_progress → completed
- [x] 4.3 Commit changes with model attribution
- [x] 4.4 Push to remote
- [x] 4.5 Archive track folder to `conductor/archive/`
- [x] 4.6 Update `tech-debt.md` and `lessons-learned.md`
