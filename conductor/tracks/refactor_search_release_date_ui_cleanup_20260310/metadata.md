# Track Metadata

**ID:** refactor_search_release_date_ui_cleanup_20260310
**Type:** refactor
**Status:** in_progress
**Created:** 2026-03-10
**Priority:** High

## Summary

Refactor/cleanup track for 2026-03-10. Reviews and improves the two previous-day tracks (system-pages-completion and stats-analytics-dashboard) plus implements the planned search release-date guard from the backlog.

## Scope

1. **UI Consistency** — `StatsPage` lacks `RouteScaffold`; make it consistent with the other system pages added yesterday.
2. **Search Release-Date Guard** — `WantedSearchService.autoSearchMovie` and `autoSearchEpisode` do not check whether the content has been released yet. Searching before the release date wastes indexer quota and produces zero results. Fix: skip searches if `releaseDate / airDateUtc + 1 day` is in the future.
3. **TV Search Strategy Improvement** — `autoSearchAll` queries movies individually but TV uses `autoSearchSeries` which already has pack logic; confirm and tighten the episode-level date guard so unreleased episodes are skipped before spawning individual searches.
4. **Tests** — Unit tests for the new release-date guard logic.
