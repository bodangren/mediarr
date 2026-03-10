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
| 2026-03-10 | feature_notification_dispatch_20260310 | Email/Discord/Slack external providers removed | Low | Resolved | Replaced by SSE push to Android TV in feature_android_push_notifications_20260310 |
| 2026-03-10 | feature_system_health_20260310 | /api/system/status disk space paths are hardcoded to /data and /data/downloads | Low | Open | Should read root folder paths from AppSettings rather than fixed paths |
| 2026-03-10 | feature_android_push_notifications_20260310 | Android POST_NOTIFICATIONS is declared but not runtime-requested | Low | Open | Add runtime permission request flow for Android 13+ (API 33+) devices |
