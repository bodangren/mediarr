## Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or summarize resolved items when they no longer need to influence near-term planning.
>
> **Severity:** `Critical` | `High` | `Medium` | `Low`
> **Status:** `Open` | `Resolved`

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-01-01 | example_track | Example: Hardcoded timeout value | Low | Resolved | Replaced with config value in v1.2 |
| 2026-03-10 | refactor_search_release_date_ui_cleanup_20260310 | autoSearchMovie/Episode searched pre-release content | Medium | Resolved | Added isReleasedYet guard + Prisma date filter in autoSearchAll |
| 2026-03-10 | feature_system_health_20260310 | /api/system/status disk space paths are hardcoded to /data and /data/downloads | Low | Resolved | Reads movieRootFolder/tvRootFolder/torrent directories from settingsService; falls back to empty array |
| 2026-03-10 | feature_android_push_notifications_20260310 | Android POST_NOTIFICATIONS is declared but not runtime-requested | Low | Open | Add runtime permission request flow for Android 13+ (API 33+) devices |
| 2026-03-11 | refactor_security_code_quality_20260311 | SQL value interpolation in repairMalformedJsonColumns | High | Resolved | Parameterized via positional arg to $executeRawUnsafe |
| 2026-03-11 | refactor_security_code_quality_20260311 | Unsafe new Date() from query params in systemRoutes | Medium | Resolved | Replaced with parseDate() from routeUtils |
| 2026-03-11 | feature_system_events_ui_20260311 | /system/events page lacks date-range picker and SSE real-time feed | Low | Open | Deferred to future tracks; filter by level/type sufficient for MVP |
| 2026-03-11 | bug_episode_matching_corner_cases_20260311 | autoSearchEpisode grabbed wrong episode (no candidate validation) | High | Resolved | Filter candidates via Parser.parse() season+episode match before grab |
| 2026-03-11 | bug_episode_matching_corner_cases_20260311 | isSingleSeasonPack false positive for S01-S05 range packs | Medium | Resolved | Pre-check range pattern; also fixed dot-sep Season.N detection |
| 2026-03-11 | bug_episode_matching_corner_cases_20260311 | ImportManager: linked episode deleted after grab → silent fall-through | High | Resolved | Explicit IMPORT_FAILED + continue when episode.findUnique returns null |
| 2026-03-12 | chore_import_cleanup_20260312 | ImportManager: linked movie deleted after grab → silent fall-through | High | Resolved | Analogous fix: IMPORT_FAILED + continue when movie.findUnique returns null |
| 2026-03-12 | bug_seeding_protector_grab_corner_cases_20260312 | SeedingProtector removed torrents when linked media not yet imported | High | Resolved | Inject Prisma; skip removal when episode/movie.path is null |
| 2026-03-12 | bug_seeding_protector_grab_corner_cases_20260312 | grabRelease passed early URL guard with non-magnet magnetUrl + no downloadUrl | Medium | Resolved | Post-normalisation guard throws TorrentRejectedError before addTorrent |
| 2026-03-13 | chore_seeding_protector_wiring_20260313 | SeedingProtector never instantiated in main.ts — import-guard was dead code | High | Resolved | Wired with prisma + torrentRepository; start/stop added to lifecycle |
| 2026-03-13 | bug_wanted_series_pack_corner_cases_20260313 | autoSearchSeries early return skipped specials search for ended series with pack | High | Resolved | Replaced `if (grabbed) return` with packGrabbed flag; specials block always runs |
| 2026-03-13 | bug_import_manager_corner_cases_20260313 | ImportManager silently succeeded when torrent directory contained no video files | High | Resolved | Added files.length === 0 early-exit that emits IMPORT_FAILED before the for-loop |
| 2026-03-13 | bug_search_aggregation_corner_cases_20260313 | grabRelease post-normalisation guard inside try block — error re-wrapped as "Torrent handoff failed: ..." + spurious failure event | High | Resolved | Moved guard before try block so original TorrentRejectedError message is preserved |
| 2026-03-13 | bug_search_aggregation_corner_cases_20260313 | searchAllIndexers timeout detection matched 'timeout' but searchWithTimeout throws 'timed out' — all timeouts silently tagged as 'error' | High | Resolved | Added `includes('timed out')` to the isTimeout predicate |
| 2026-03-13 | bug_rss_media_monitor_corner_cases_20260313 | RssMediaMonitor called addTorrent without episodeId/movieId — ImportManager fast-path broken for all RSS grabs | High | Resolved | Added episodeId/movieId to addTorrent calls in handleTvRelease and handleMovieRelease |
| 2026-03-13 | bug_autosearch_wrong_series_episode_20260313 | autoSearchEpisode validated season+episode but NOT series title — wrong-show episode could be grabbed | High | Resolved | Added titlesMatch(r.title, series.title) to validCandidates filter |
