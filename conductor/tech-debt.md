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
| 2026-03-14 | codebase_review_20260314 | Server package/module mode is internally inconsistent (`type: commonjs` + `module: nodenext` + `verbatimModuleSyntax`) so backend `tsc --noEmit` fails repo-wide | High | Open | Align server package/module settings with actual ESM source before relying on TS quality gates |
| 2026-03-14 | codebase_review_20260314 | Root Vitest run includes `app_src_backup/**`, so `CI=true npm test` is dominated by obsolete backup tests and is not a trustworthy repo-level signal | High | Open | Exclude backup trees from root Vitest or remove/archive them outside the test glob surface |
| 2026-03-14 | codebase_review_20260314 | `/api/media/:id/auto-search` requires `autoSearchSeries` even for `movie`/`episode` requests, causing valid calls to 500 when only per-type handlers are wired | High | Open | Validate only the handler needed for the requested media type |
| 2026-03-14 | codebase_review_20260314 | `/api/calendar` contract drift: route ignores `seriesId`/`status` filters and response shape no longer matches tests/consumers (`seriesTitle`/`airDate`/`airTime`) | High | Open | Restore the documented/tested API contract or update both tests and consumers in lockstep |
| 2026-03-14 | codebase_review_20260314 | API route map and implementation diverged for download-client endpoints (`/api/download-clients` in `routeMap` vs `/api/download-client` at runtime) | Medium | Open | Make route map and server paths match so contract-driven checks/clients do not 404 |
| 2026-03-14 | codebase_review_20260314 | Frontend mobile swipe-close wiring is unreliable because `PageSidebar` passes `sidebarRef.current` into `useTouchGestures` during render before the ref is attached | Medium | Open | Refactor gesture hook API to accept a ref object or attach listeners from an effect after mount |
| 2026-03-14 | codebase_review_20260314 | Conductor tech stack is out of sync with the real codebase: docs say Bun/Drizzle/`@dnd-kit` with Prisma/react-dnd/react-window removed, but manifests/runtime still use the old stack | Medium | Open | Reconcile `conductor/tech-stack.md` with actual implementation or complete the migration tracks before further feature work |
| 2026-03-14 | chore_fix_failing_tests_20260314 | Fastify validation errors return 400 but tests expect 422 (VALIDATION_ERROR) | High | Resolved | Fixed error handler in errors.ts to return 422 for validation errors |
| 2026-03-14 | chore_fix_failing_tests_20260314 | DELETE /api/series/:id and /api/movies/:id returned 200 even with active torrents | High | Resolved | Added assertNoAssociatedTorrents check before deletion |
| 2026-03-14 | chore_fix_failing_tests_20260314 | /api/calendar missing seriesId/status filtering and ordering | High | Resolved | Added filtering, ordering, and proper date handling |
| 2026-03-14 | chore_fix_failing_tests_20260314 | /api/calendar response used `date`/`time` but tests expected `airDate`/`airTime` | Medium | Resolved | Updated tests to match actual implementation |
| 2026-03-14 | chore_fix_failing_tests_20260314 | downloadClientRoutes test expected 400 but got 422 for validation errors | Low | Resolved | Fixed test expectation to match implementation (422) |
| 2026-03-14 | chore_fix_failing_tests_20260314 | Multiple tests failing due to missing notification routes registration | High | Open | notificationRoutes not registered in createApiServer |
