## Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or summarize resolved items when they no longer need to influence near-term planning.
>
> **Severity:** `Critical` | `High` | `Medium` | `Low`
> **Status:** `Open` | `Resolved`

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-01-01 | example_track | Example: Hardcoded timeout value | Low | Resolved | Replaced with config value in v1.2 |
| 2026-03-10 | refactor_search_release_date_ui_cleanup_20260310 | StatsPage used hand-rolled header instead of RouteScaffold | Low | Resolved | Migrated to RouteScaffold for consistency |
| 2026-03-10 | refactor_search_release_date_ui_cleanup_20260310 | autoSearchMovie/Episode searched pre-release content | Medium | Resolved | Added isReleasedYet guard + Prisma date filter in autoSearchAll |
