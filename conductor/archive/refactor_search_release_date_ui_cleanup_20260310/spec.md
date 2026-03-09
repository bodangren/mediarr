# Spec: Search Release-Date Guard & System UI Consistency Refactor

## Problem Statement

Two issues identified during code review of 2026-03-09 tracks:

### 1. StatsPage UI Inconsistency

`StatsPage` renders a hand-rolled `<header>` + `<div className="space-y-4">` wrapper instead of the `<RouteScaffold>` primitive used by every other system page (`SystemTasksPage`, `SystemLogsPage`, `SystemBackupPage`). This creates visual inconsistency and maintenance burden.

**Fix:** Migrate `StatsPage` to use `RouteScaffold` with `title="Statistics"` and the existing description.

### 2. Search Before Release Date

`WantedSearchService.autoSearchMovie` fetches the movie record from the DB but **never checks** whether the movie has been released yet. Searching for an unreleased movie always returns zero results and wastes indexer capacity.

Similarly, `autoSearchEpisode` and `autoSearchSeries` do not guard against episodes that haven't aired yet. The only release-date logic is `isSeasonComplete()` (used to decide whether to attempt a season pack), which is unrelated to skipping pre-release episodes in individual searches.

**Fix:**
- In `autoSearchMovie`: if `movie.releaseDate` is set and `releaseDate + 1 day > now`, skip search with reason `'Movie has not been released yet'`.
- In `autoSearchEpisode`: if `episode.airDateUtc` is set and `airDateUtc + 1 day > now`, skip search with reason `'Episode has not aired yet'`.
- In `autoSearchSeries`: filter out pre-air episodes before spawning `autoSearchEpisode` calls (avoid unnecessary DB hits).
- In `autoSearchAll`: filter wanted movies by `releaseDate <= now - 1 day` in the initial Prisma query to avoid spinning up searches at all.

## Acceptance Criteria

- `StatsPage` renders identically but uses `RouteScaffold`
- `autoSearchMovie` skips and logs when `releaseDate + 1 day > now`
- `autoSearchEpisode` skips and logs when `airDateUtc + 1 day > now`
- `autoSearchSeries` episode loop filters pre-air episodes before calling `autoSearchEpisode`
- `autoSearchAll` Prisma movie query filters by release date
- Unit tests cover all four guard conditions
- All existing tests continue to pass
- Production build succeeds

## API / Data Notes

- `Movie` model has `releaseDate: DateTime?` field (nullable)
- `Episode` model has `airDateUtc: DateTime?` field (nullable)
- Guard is only applied when the date field is **non-null**; unknown release dates are treated as released (don't block search)
