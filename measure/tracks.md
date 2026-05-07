# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

---

## Pending Tracks

- [x] **Track: Custom Format Editor & Live Tester** *Phases: 5 | Link: [./archive/feature_custom_format_editor_20260507/](./archive/feature_custom_format_editor_20260507/)* — 13 backend route tests, FormatLiveTester component, dedicated settings page with search/clone/test panel
- [x] **Track: Release Scoring Breakdown Panel** *Phases: 5 | Link: [./archive/feature_release_scoring_breakdown_20260507/](./archive/feature_release_scoring_breakdown_20260507/)* — Backend breakdown storage, ScoreBreakdownPanel component, SeriesInteractiveSearchModal integration
- [ ] **Track: SPA Subtitle Management Parity** *Phases: 5 | Link: [./tracks/chore_spa_subtitle_management_20260507/](./tracks/chore_spa_subtitle_management_20260507/)* — Subtitle inventory, search, download, and delete in the React SPA (Flutter parity)

---

- [x] **Track: Fix Catalog `isConfigured` Matching for Renamed Indexers** *Phases: 3 | Link: [./archive/bug_catalog_isconfigured_matching_20260507/](./archive/bug_catalog_isconfigured_matching_20260507/)* — 3 regression tests; Cardigann definitionId + Torznab/Newznab baseUrl matching with name fallback

- [x] **Track: Cleanup Uncommitted Work** *Phases: 2 | Link: [./archive/chore_cleanup_uncommitted_work_20260401/](./archive/chore_cleanup_uncommitted_work_20260401/)* — staged deleted track files, updated .gitignore

- [x] **Track: Organize Services Corner-Case Testing** *Phases: 5 | Link: [./archive/bug_organize_services_corner_cases_20260404/](./archive/bug_organize_services_corner_cases_20260404/)* — 67 tests; 1 bug fixed (missing absoluteEpisodeNumber)

- [x] **Track: SeriesMonitoringService Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_series_monitoring_corner_cases_20260402/](./archive/bug_series_monitoring_corner_cases_20260402/)* — 39 tests; no bugs found
- [x] **Track: MediaSearchService Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_mediasearch_corner_cases_20260401/](./archive/bug_mediasearch_corner_cases_20260401/)* — 19 tests; no bugs found

- [x] **Track: Daily Cleanup — Commit Stale Changes, Review Yesterday's Code** *Phases: 3 | Link: [./archive/chore_daily_cleanup_20260403/](./archive/chore_daily_cleanup_20260403/)* — committed stale deletions, fixed SeedingProtector import guard error handling

- [x] **Track: Daily Cleanup — Commit Stale Deletions, Verify Green Suite** *Phases: 2 | Link: [./archive/chore_daily_cleanup_20260404/](./archive/chore_daily_cleanup_20260404/)* — committed stale Apr 3 deletions; 1274 tests green

- [x] **Track: Daily Cleanup — Finish Stale Archives, Verify Green Suite** *Phases: 2 | Link: [./archive/chore_daily_cleanup_20260404b/](./archive/chore_daily_cleanup_20260404b/)* — moved stale track to archive; 1341 tests green; build clean

- [x] **Track: MediaService & MediaRepository Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_media_service_repo_corner_cases_20260404/](./archive/bug_media_service_repo_corner_cases_20260404/)* — 56 tests; no bugs found

- [x] **Track: ImportManager Post-Import Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_import_post_import_corner_cases_20260404/](./archive/bug_import_post_import_corner_cases_20260404/)* — 13 tests; 1 bug fixed (per-file try/catch)

- [x] **Track: SeriesOrganizeService applyRename Transaction Safety** *Phases: 4 | Link: [./archive/bug_organize_rename_transaction_safety_20260404/](./archive/bug_organize_rename_transaction_safety_20260404/)* — 79 tests; reordered DB-before-fs with rollback

- [x] **Track: Connectivity E2E Test Harness (podman compose)** *Phases: 2 | Link: [./archive/feature_connectivity_e2e_compose_20260412/](./archive/feature_connectivity_e2e_compose_20260412/)* — 6/6 assertions green: connect, movie library, series/episode, movie stream 206, episode stream 206, SSE round-trip

---

## Execution Order and Dependencies

### Completed Stack Modernisation (2026-03-14)
`chore_ui_foundation` → `chore_shadcn_setup` → `chore_app_decompose` → `chore_form_standardization` ✅ All archived

### Zero-Config Roadmap (Phases A–D)

**Phase A — Fix What's Broken** *(do first)*
`bug_flutter_mdns_discovery` → `chore_form_standardization_completion` → `feature_playback_resume_sync`

**Phase B — External Comms** *(after A)*
`feature_notification_transports` → `feature_auto_update`

**Phase C — Zero-Config Setup** *(after A + B)*
`feature_smart_defaults` → `feature_setup_wizard` → `feature_indexer_discovery`

**Phase D — Flutter Living Room** *(after A)*
`feature_flutter_search_add` → `feature_flutter_activity_queue` → `feature_flutter_continue_watching` + `feature_flutter_subtitle_quality`

**Parallel — Backend Performance** *(independent)*
`chore_drizzle_migration`

### Dependency Graph

```
Phase A:
  bug_flutter_mdns_discovery_20260330       (no deps — fix broken mDNS)
      |
  chore_form_standardization_completion_20260330  (no deps — finish form migration)
      |
  feature_playback_resume_sync_20260330      (needs working client from A1)

Phase B (after A):
  feature_notification_transports_20260330    (needs stable server from A)
      |
  feature_auto_update_20260330                (needs stable server from A + B1 for update notifications)

Phase C (after A + B):
  feature_smart_defaults_20260330             (needs stable server from A)
      |
  feature_setup_wizard_20260330               (needs smart defaults from C3)
      |
  feature_indexer_discovery_20260330          (needs setup wizard from C1)

Phase D (after A):
  feature_flutter_search_add_20260330         (needs working mDNS from A1)
      |
  feature_flutter_activity_queue_20260330     (needs search/nav structure from D1)
      |
  feature_flutter_continue_watching_20260330  (needs playback resume from A3 + nav from D1)
  feature_flutter_subtitle_quality_20260330   (needs search/add from D1)

Parallel:
  chore_drizzle_migration_20260314            (backend-only; independent)
```

---


- [x] **Track: WantedSearchService Comprehensive Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_wantedsearch_comprehensive_corner_cases_20260404c/](./archive/bug_wantedsearch_comprehensive_corner_cases_20260404c/)* — 77 tests; 3 bugs fixed (movie title validation, season completeness grace period, multi-episode regex capture)

- [x] **Track: SearchAggregationService Comprehensive Corner-Case Testing** *Phases: 5 | Link: [./archive/bug_searchaggregation_comprehensive_corner_cases_20260404d/](./archive/bug_searchaggregation_comprehensive_corner_cases_20260404d/)* — 42 tests; 1 bug fixed (AI batch parsing crash)

- [x] **Track: MovieOrganizeService {AudioChannels} Token Bug** *Phases: 4 | Link: [./archive/bug_audio_channels_token_20260404/](./archive/bug_audio_channels_token_20260404/)* — 39 tests; 1 bug fixed (wire audioChannels from variant audioTracks)

- [x] **Track: ImportManager Comprehensive Corner-Case Testing** *Phases: 6 | Link: [./archive/bug_importmanager_comprehensive_corner_cases_20260405/](./archive/bug_importmanager_comprehensive_corner_cases_20260405/)* — 20 tests; 1 bug fixed (movie year mismatch fallback)

- [x] **Track: Pipeline Integration Corner-Case Testing** *Phases: 6 | Link: [./archive/bug_pipeline_integration_corner_cases_20260405/](./archive/bug_pipeline_integration_corner_cases_20260405/)* — 25 tests; no bugs found; all integration handoffs verified

- [x] **Track: CustomFormatScoringEngine Comprehensive Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_customformat_scoring_corner_cases_20260405/](./archive/bug_customformat_scoring_corner_cases_20260405/)* — 72 tests; no bugs found; all condition types, negation, and unified scoring verified

### Phase B: External Comms
- [x] **Track: Real Auto-Update System** *Phases: 4 | Link: [./archive/feature_auto_update_20260330/](./archive/feature_auto_update_20260330/)* — real release-check/download/install flow shipped; daily scheduler wired; full `CI=true npm test` green (224 files / 1664 tests)

### Phase C: Zero-Config Setup
- [x] **Track: Setup Wizard & First-Run** *Phases: 2 | Link: [./archive/feature_setup_wizard_20260330/](./archive/feature_setup_wizard_20260330/)* — setup detection API, 5-step wizard, Just Work zero-config mode, route guard; 1672 tests green; SPA build clean
- [x] **Track: Indexer Auto-Discovery** *Phases: 4 | Link: [./archive/feature_indexer_discovery_20260330/](./archive/feature_indexer_discovery_20260330/)* — curated catalog with one-click add; LAN Prowlarr/Jackett detection with import banner; 9 new SPA tests; app build clean
- [x] **Track: Smart Defaults Engine** *Phases: 3 | Link: [./archive/feature_smart_defaults_20260330/](./archive/feature_smart_defaults_20260330/)* — built-in WebTorrent auto-config, naming patterns (movie + series), scheduler intervals (RSS 15min, wanted search 60min), wanted languages (en); idempotent; 18 E2E tests; full CI green (1723 tests)

### Phase D: Flutter Living Room
- [x] **Track: Flutter Search & Add Media** *Phases: 3 | Link: [./archive/feature_flutter_search_add_20260330/](./archive/feature_flutter_search_add_20260330/)* — SearchScreen with poster grid, SearchResultDetailSheet with releases/grab/add-to-library; 165 Flutter tests green; root CI green (230 files / 1738 tests)
- [x] **Track: Flutter Activity & Queue** *Phases: 3 | Link: [./archive/feature_flutter_activity_queue_20260330/](./archive/feature_flutter_activity_queue_20260330/)* — Activity & Queue screens with torrent management; SSE real-time updates; 183 tests green
- [x] **Track: Manual Test Findings and Player-First Client Debugging** *Phases: 4 | Link: [./archive/bug_manual_test_player_client_findings_20260417/](./archive/bug_manual_test_player_client_findings_20260417/)* — movie search empty (not a bug - works), TV add FK failure (fixed with resolveQualityProfileId), Flutter discovery (documented limitation), SSE event-name drift (already aligned), player-first UX decision (approved)
- [x] **Track: Flutter Continue Watching & Calendar** *Phases: 2 | Link: [./archive/feature_flutter_continue_watching_20260330/](./archive/feature_flutter_continue_watching_20260330/)* — HomeScreen with Continue Watching, Recently Added, Upcoming sections; CalendarScreen with monthly grid, dot indicators, day detail sheet; 1746 tests green
- [x] **Track: Flutter Subtitle & Quality Control** *Phases: 2 | Link: [./archive/feature_flutter_subtitle_quality_20260330/](./archive/feature_flutter_subtitle_quality_20260330/)* — subtitle management with search/download, quality upgrade with release grab; Phase D complete

- [x] **Track: Lint Debt Reduction** *Phases: 5 | Link: [./archive/chore_lint_debt_reduction_20260424/](./archive/chore_lint_debt_reduction_20260424/)* — zero lint errors, 14 exhaustivedeps warnings remain; typecheck + build clean; 216 test files green

- [x] **Track: Indexer Catalog Endpoint Caching** *Phases: 3 | Link: [./archive/feature_catalog_endpoint_caching_20260424/](./archive/feature_catalog_endpoint_caching_20260424/)* — CatalogCache with startup load, file watcher, manual reload endpoint

- [x] **Track: Test Quality Strengthening** *Phases: 5 | Link: [./archive/chore_test_quality_strengthening_20260424/](./archive/chore_test_quality_strengthening_20260424/)* — 3/5 suites strengthened (table-memoization render counts, modal backdrop-close with userEvent, FilesystemBrowser async + breadcrumb nav); VirtualTable and FileBrowser deferred (require component refactor)

### Parallel: Backend Performance
- [x] **Track: Drizzle ORM Migration** *Phases: 4 | Link: [./archive/chore_drizzle_migration_20260314/](./archive/chore_drizzle_migration_20260314/)* — Drizzle-backed runtime complete; Bun startup stabilized via `--no-addons`; 116 files / 1158 tests passed

---

## Archived Tracks

- [x] **Track: Real Auto-Update System** *Phases: 4 | Link: [./archive/feature_auto_update_20260330/](./archive/feature_auto_update_20260330/)* — real release-check/download/install flow shipped; daily scheduler wired; full `CI=true npm test` green (224 files / 1664 tests)

- [x] **Track: Notification Transport Layer** *Phases: 4 | Link: [./archive/feature_notification_transports_20260330/](./archive/feature_notification_transports_20260330/)* — webhook/discord/telegram/gotify/email transports implemented with registry + dispatch wiring; full root CI green (223 files / 1653 tests)

- [x] **Track: Playback Resume & Continue Watching** *Phases: 4 | Link: [./archive/feature_playback_resume_sync_20260330/](./archive/feature_playback_resume_sync_20260330/)* — server continue-watching endpoint shipped, Flutter + SPA resume widgets integrated, app build + full Flutter suite + root CI (`npm test`) green

- [x] **Track: Form Standardization Completion** *Phases: 3 | Link: [./archive/chore_form_standardization_completion_20260330/](./archive/chore_form_standardization_completion_20260330/)* — modal form migration finished; dead form-compat removed; legacy Prisma-era suites rewritten for Drizzle; full CI green (216 files / 1625 tests)

- [x] **Track: AppSettings INT Overflow Bug Fix** *Phases: 4 | Link: [./archive/bug_appsettings_int_overflow_20260409/](./archive/bug_appsettings_int_overflow_20260409/)* — migration created; server starts without P2023; 1158 tests green

- [x] **Track: Corner-Case Testing Directive Complete** *Phases: 1 | Link: [./archive/chore_corner_case_testing_complete_20260406/](./archive/chore_corner_case_testing_complete_20260406/)* — directive formally closed; 1625 tests green; 7 bugs fixed across all priority subsystems

- [x] **Track: LibraryScanService Comprehensive Corner-Case Testing** *Phases: 5 | Link: [./archive/bug_libraryscan_corner_cases_20260405/](./archive/bug_libraryscan_corner_cases_20260405/)* — 34 tests; no bugs found

- [x] **Track: Daily Cleanup — Commit Stale Archives, Verify Green Suite** *Phases: 4 | Link: [./archive/chore_daily_cleanup_20260405/](./archive/chore_daily_cleanup_20260405/)* — 1474 tests green; build clean

- [x] **Track: Fix TorrentManager Seed-Limit Import Guard** *Phases: 4 | Link: [./archive/bug_seed_limit_import_guard_20260402/](./archive/bug_seed_limit_import_guard_20260402/)* — extracted shared importGuard.ts; 10 new tests; TorrentManager + SeedingProtector both guarded
- [x] **Track: TorrentManager Lifecycle & importGuard Corner-Case Testing** *Phases: 5 | Link: [./archive/bug_torrent_lifecycle_corner_cases_20260403/](./archive/bug_torrent_lifecycle_corner_cases_20260403/)* — 12 importGuard tests, 10 removeTorrent tests, 12 syncStats tests, 5 queued-torrent tests; no bugs found
- [x] **Track: RssMediaMonitor + RssSyncService Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_rss_pipeline_corner_cases_20260403/](./archive/bug_rss_pipeline_corner_cases_20260403/)* — 32 tests; no bugs found; RSS pipeline solid
- [x] **Track: Daily Cleanup — Stage Deletions, Verify Green Suite** *Phases: 3 | Link: [./archive/chore_daily_cleanup_20260402/](./archive/chore_daily_cleanup_20260402/)* — excluded redundant legacy test; 195 passed, 0 failures
- [x] **Track: Local LLM Gateway Routing** *Phases: 3 | Link: [./archive/feature_local_llm_gateway_20260401/](./archive/feature_local_llm_gateway_20260401/)* — ReleaseParser now prefers `AI_GATEWAY_BASE_URL` + model envs, falls back to OpenRouter, then regex-only parsing
- [x] **Track: Measure Housekeeping Cleanup** *Phases: 3 | Link: [./archive/chore_measure_housekeeping_20260401/](./archive/chore_measure_housekeeping_20260401/)* — cleaned recent archive-plan residue and trimmed `lessons-learned.md` to 40 lines
- [x] **Track: Fix ImportManager Episode-to-Movie Fallback Bug** *Phases: 3 | Link: [./archive/chore_fix_import_manager_fallback_20260401/](./archive/chore_fix_import_manager_fallback_20260401/)* — fixed `if (!parsed)` → `if (!episodeImported)`; 7 slow-path tests
- [x] **Track: Cleanup Uncommitted Work** *Phases: 3 | Link: [./archive/chore_cleanup_uncommitted_work_20260401/](./archive/chore_cleanup_uncommitted_work_20260401/)* — 3 commits; reverted .env secrets, removed junk, committed form migration + Flutter fixes

- [x] **Track: Corner-Case Testing — WantedSearch + ImportManager** *Phases: 4 | Link: [./archive/bug_corner_case_testing_wantedsearch_import_20260331/](./archive/bug_corner_case_testing_wantedsearch_import_20260331/)* — 19 tests; 1 bug found (ImportManager episode-to-movie fallback)
- [x] **Track: Flutter mDNS Discovery Fix** *Phases: 2 | Link: [./archive/bug_flutter_mdns_discovery_20260330/](./archive/bug_flutter_mdns_discovery_20260330/)* — mDNS resolve(), provider defaults, playback tests all fixed
- [x] **Track: Form Standardization (superseded)** *Phases: 2 | Link: [./archive/chore_form_standardization_20260314/](./archive/chore_form_standardization_20260314/)* — Phase 1 complete; Phase 2 superseded by `chore_form_standardization_completion_20260330`
- [x] **Track: OpenRouter AI Provider Migration** *Phases: 4 | Link: [./archive/chore_openrouter_migration_20260329/](./archive/chore_openrouter_migration_20260329/)*
- [x] **Track: Flutter Cross-Platform Client** *Phases: 5 | Link: [./archive/feature_flutter_client_20260328/](./archive/feature_flutter_client_20260328/)*
- [x] **Track: AI Release Parser — Batch Search Scoring & Import Matching** *Phases: 4 | Link: [./archive/feature_ai_release_parser_20260316/](./archive/feature_ai_release_parser_20260316/)*
- [x] **Track: AI-Powered Filename Parsing** *Phases: 4 | Link: [./archive/feature_ai_parsing_20260316/](./archive/feature_ai_parsing_20260316/)*
- [x] **Track: App.tsx Decomposition** *Phases: 3 | Link: [./archive/chore_app_decompose_20260314/](./archive/chore_app_decompose_20260314/)*
- [x] **Track: seriesRoutes import/apply & rescan corner cases** *Phases: 3 | Link: [./archive/bug_series_routes_import_rescan_20260316/](./archive/bug_series_routes_import_rescan_20260316/)*
- [x] **Track: WantedSearchService.autoSearchAll Concurrent-Execution Guard** *Phases: 4 | Link: [./archive/bug_autosearch_all_corner_cases_20260316/](./archive/bug_autosearch_all_corner_cases_20260316/)*
- [x] **Track: Organizer Test Coverage** *Phases: 4 | Link: [./archive/chore_organizer_coverage_20260316/](./archive/chore_organizer_coverage_20260316/)*
- [x] **Track: TorrentManager Corner Cases** *Phases: 4 | Link: [./archive/bug_torrent_manager_corner_cases_20260315/](./archive/bug_torrent_manager_corner_cases_20260315/)*
- [x] **Track: Cleanup Pending Changes from Prior Work** *Phases: 3 | Link: [./archive/chore_cleanup_pending_changes_20260315/](./archive/chore_cleanup_pending_changes_20260315/)*
- [x] **Track: Server Package/Module Alignment** *Phases: 4 | Link: [./archive/chore_server_module_alignment_20260315/](./archive/chore_server_module_alignment_20260315/)*
- [x] **Track: shadcn/ui Installation & Primitive Migration** *Phases: 4 | Link: [./archive/chore_shadcn_setup_20260314/](./archive/chore_shadcn_setup_20260314/)*
- [x] **Track: UI Foundation Cleanup** *Phases: 3 | Link: [./archive/chore_ui_foundation_20260314/](./archive/chore_ui_foundation_20260314/)*
- [x] **Track: Fix Failing Tests** *Phases: 2 | Link: [./archive/chore_fix_failing_tests_20260314/](./archive/chore_fix_failing_tests_20260314/)*
- [x] **Track: WantedSearchService — wrong-series episode grab + autoSearchMovie coverage** *Phases: 4 | Link: [./archive/bug_autosearch_wrong_series_episode_20260313/](./archive/bug_autosearch_wrong_series_episode_20260313/)*
- [x] **Track: RssMediaMonitor corner cases — missing episodeId/movieId in addTorrent & coverage** *Phases: 4 | Link: [./archive/bug_rss_media_monitor_corner_cases_20260313/](./archive/bug_rss_media_monitor_corner_cases_20260313/)*
- [x] **Track: MediaSearchService Corner Cases — Grab Error Propagation, grabReleaseByGuid, Indexer Resilience** *Phases: 4 | Link: [./archive/bug_search_aggregation_corner_cases_20260313/](./archive/bug_search_aggregation_corner_cases_20260313/)*
- [x] **Track: ImportManager corner cases — empty-directory + no-root-folder IMPORT_FAILED** *Phases: 4 | Link: [./archive/bug_import_manager_corner_cases_20260313/](./archive/bug_import_manager_corner_cases_20260313/)*
- [x] **Track: WantedSearchService autoSearchSeries Corner Cases** *Phases: 2 | Link: [./archive/bug_wanted_series_pack_corner_cases_20260313/](./archive/bug_wanted_series_pack_corner_cases_20260313/)*
- [x] **Track: Wire SeedingProtector into main.ts runtime** *Phases: 1 | Link: [./archive/chore_seeding_protector_wiring_20260313/](./archive/chore_seeding_protector_wiring_20260313/)*
- [x] **Track: SeedingProtector & grabRelease Corner Cases** *Phases: 2 | Link: [./archive/bug_seeding_protector_grab_corner_cases_20260312/](./archive/bug_seeding_protector_grab_corner_cases_20260312/)*
- [x] **Track: ImportManager Cleanup — Linked-Movie-Null Fix & Code Quality** *Phases: 3 | Link: [./archive/chore_import_cleanup_20260312/](./archive/chore_import_cleanup_20260312/)*
- [x] **Track: Episode Matching Corner Cases — Wrong Grab & Pack Detection** *Phases: 4 | Link: [./archive/bug_episode_matching_corner_cases_20260311/](./archive/bug_episode_matching_corner_cases_20260311/)*
- [x] **Track: System Events Log UI** *Phases: 2 | Link: [./archive/feature_system_events_ui_20260311/](./archive/feature_system_events_ui_20260311/)*
- [x] **Track: System Routes Test Coverage & Dynamic Disk Space from AppSettings** *Phases: 2 | Link: [./archive/feature_system_routes_coverage_20260311/](./archive/feature_system_routes_coverage_20260311/)*
- [x] **Track: Security Hardening & Code Quality Refactor** *Phases: 3 | Link: [./archive/refactor_security_code_quality_20260311/](./archive/refactor_security_code_quality_20260311/)*
- [x] **Track: Server-to-Android Push Notification System** *Phases: 3 | Link: [./archive/feature_android_push_notifications_20260310/](./archive/feature_android_push_notifications_20260310/)*
- [x] **Track: Real System Health & Disk Space Monitoring** *Phases: 3 | Link: [./archive/feature_system_health_20260310/](./archive/feature_system_health_20260310/)*
- [x] **Track: Notification Event Dispatch Service** *Phases: 3 | Link: [./archive/feature_notification_dispatch_20260310/](./archive/feature_notification_dispatch_20260310/)*
- [x] **Track: Search Release-Date Guard & System UI Consistency Refactor** *Phases: 4 | Link: [./archive/refactor_search_release_date_ui_cleanup_20260310/](./archive/refactor_search_release_date_ui_cleanup_20260310/)*
- [x] **Track: System Pages Completion** *Phases: 3 | Link: [./archive/system-pages-completion_20260309/](./archive/system-pages-completion_20260309/)*
- [x] **Track: Library Scan & Import Fix** *Phases: 3 | Link: [./archive/library_scan_import_fix_20260308/](./archive/library_scan_import_fix_20260308/)*
- [x] **Track: Subtitle UI Reporting & Targeted Search** *Phases: 3 | Link: [./archive/subtitle_ui_reporting_20260308/](./archive/subtitle_ui_reporting_20260308/)*
- [x] **Track: Subtitle Code Deduplication & Performance Refactor** *Phases: 3 | Link: [./archive/refactor_subtitle_dedup_20260309/](./archive/refactor_subtitle_dedup_20260309/)*
- [x] **Track: Library Statistics & Analytics Dashboard** *Phases: 3 | Link: [./archive/stats-analytics-dashboard_20260309/](./archive/stats-analytics-dashboard_20260309/)*
- [x] **Track: System Administration Pages** *Phases: 3 | Link: [./archive/system_admin_pages_20260308/](./archive/system_admin_pages_20260308/)*
- [x] **Track: Automated Search and Download** *Phases: 4 | Link: [./archive/automated_search_download_20260303/](./archive/automated_search_download_20260303/)*
- [x] **Track: Backend Deduplication & Security Hardening** *Phases: 3 | Link: [./archive/refactor_dedup_security_20260308/](./archive/refactor_dedup_security_20260308/)*
- [x] **Track: Android TV Client** *Phases: 7 | Link: [./archive/android_tv_client_20260304/](./archive/android_tv_client_20260304/)*
- [x] **Track: Subtitle Inventory Disk Import Recovery** *Phases: 2 | Link: [./archive/subtitle_inventory_disk_import_recovery_20260307/](./archive/subtitle_inventory_disk_import_recovery_20260307/)*
- [x] **Track: Streaming Settings Panel & DB-backed Configuration** *Phases: 3 | Link: [./archive/streaming_settings_panel_20260305/](./archive/streaming_settings_panel_20260305/)*
- [x] **Track: Streaming Server & Discovery** *Phases: 3 | Link: [./archive/streaming_server_20260304/](./archive/streaming_server_20260304/)*
- [x] **Track: Subtitle Management** *Phases: 5 | Link: [./archive/subtitle_management_20260303/](./archive/subtitle_management_20260303/)*
- [x] **Track: Queue Mass Actions + Action Tooltips** *Phases: 1 | Link: [./archive/queue_mass_actions_tooltips_20260304/](./archive/queue_mass_actions_tooltips_20260304/)*
- [x] **Track: Existing Library Import** *Phases: 4 | Link: [./archive/existing_library_import_20260301/](./archive/existing_library_import_20260301/)*
- [x] **Track: Collections** *Phases: 4 | Link: [./archive/collections_20260301/](./archive/collections_20260301/)*
- [x] **Track: Manual Search, Queue Monitoring & Quality Profile Enhancements** *Phases: 5 | Link: [./archive/manual_search_queue_20260228/](./archive/manual_search_queue_20260228/)*
- [x] **Track: Vite Frontend Parity Recovery** *Phases: 5 | Link: [./archive/vite_parity_recovery_20260226/](./archive/vite_parity_recovery_20260226/)*
- [x] **Track: Library Visibility & Dashboard** *Phases: 3 | Link: [./archive/library_visibility_20260301/](./archive/library_visibility_20260301/)*
- [x] **Track: Import Pipeline & Root Folder Settings** *Phases: 4 | Link: [./archive/import_pipeline_20260228/](./archive/import_pipeline_20260228/)*
- [x] **Track: Media Detail Pages & Library Enrichment** *Phases: 4 | Link: [./archive/media_detail_pages_20260228/](./archive/media_detail_pages_20260228/)*
- [x] **Track: Search and Add to Wanted** *Phases: 3 | Link: [./archive/search_add_wanted_20260227/](./archive/search_add_wanted_20260227/)*
- [x] **Track: Monolith Unification Refactor** *Phases: 3 | Link: [./archive/monolith_unification_refactor_20260226/](./archive/monolith_unification_refactor_20260226/)*
- [x] **Track: Sonarr Feature Parity** *Phases: 5 | Link: [./archive/sonarr_parity_20260217/](./archive/sonarr_parity_20260217/)*
- [x] **Track: Foundation** *Link: [./archive/foundation_20260210/](./archive/foundation_20260210/)*
- [x] **Track: Indexer Engine** *Link: [./archive/indexer_engine_20260210/](./archive/indexer_engine_20260210/)*
- [x] **Track: Torrent Engine** *Link: [./archive/torrent_engine_20260211/](./archive/torrent_engine_20260211/)*
- [x] **Track: Movie Management** *Link: [./archive/movie_management_20260211/](./archive/movie_management_20260211/)*
- [x] **Track: TV Management** *Link: [./archive/tv_management_20260211/](./archive/tv_management_20260211/)*
- [x] **Track: Subtitle & Audio Engine** *Link: [./archive/subtitle_audio_engine_20260211/](./archive/subtitle_audio_engine_20260211/)*
- [x] **Track: Docker Volumes** *Link: [./archive/docker_volumes_20260211/](./archive/docker_volumes_20260211/)*
- [x] **Track: UI Platform Prerequisites** *Link: [./archive/ui_platform_prereqs_20260211/](./archive/ui_platform_prereqs_20260211/)*
- [x] **Track: UI Core Operations** *Link: [./archive/ui_core_operations_20260211/](./archive/ui_core_operations_20260211/)*
- [x] **Track: UI API Surface Contracts** *Link: [./archive/ui_api_surface_contracts_20260211/](./archive/ui_api_surface_contracts_20260211/)*
- [x] **Track: Unified UI Dashboard (superseded)** *Link: [./archive/unified_ui_dashboard_20260211_superseded/](./archive/unified_ui_dashboard_20260211_superseded/)*
- [x] **Track: Clone Parity Gap Investigation** *Link: [./archive/clone_parity_gap_investigation_20260212/](./archive/clone_parity_gap_investigation_20260212/)*
- [x] **Track: Sonarr UI Cloning** *Phases: 14 | Link: [./archive/sonarr_ui_cloning_20260214/](./archive/sonarr_ui_cloning_20260214/)*
- [x] **Track: Bazarr UI Cloning** *Phases: 13 | Link: [./archive/bazarr_ui_cloning_20260214/](./archive/bazarr_ui_cloning_20260214/)*
- [x] **Track: Prowlarr UI Cloning** *Phases: 10 | Link: [./archive/prowlarr_ui_cloning_20260214/](./archive/prowlarr_ui_cloning_20260214/)*
- [x] **Track: Prowlarr Feature Parity** *Phases: 3 | Link: [./archive/prowlarr_parity_20260217/](./archive/prowlarr_parity_20260217/)*
- [x] **Track: Cardigann Runtime Parity (Monolith-Native)** *Phases: 5 | Link: [./archive/cardigann_runtime_parity_20260223/](./archive/cardigann_runtime_parity_20260223/)*
- [x] **Track: UI Stub Closure & Deduplication** *Phases: 5 | Link: [./archive/ui_stub_closure_20260217/](./archive/ui_stub_closure_20260217/)*
- [x] **Track: Fix Core Parity Wiring** *Phases: 4 | Link: [./archive/fix_core_parity_wiring_20260212/](./archive/fix_core_parity_wiring_20260212/)*
- [x] **Track: Radarr UI Cloning** *Phases: 11 | Link: [./archive/radarr_ui_cloning_20260214/](./archive/radarr_ui_cloning_20260214/)*

- [x] **Track: Visual Refresh — Define Unique Identity** *Phases: 2 | Link: [./archive/visual_refresh_20260425/](./archive/visual_refresh_20260425/)* — Near-Zero Tesla theme; DESIGN.md lint passed; 232 test files green

- [x] **Track: Legacy Test Audit** *Phases: 3 | Link: [./archive/legacy_test_audit_20260426/](./archive/legacy_test_audit_20260426/)* — Deleted 340 obsolete backup tests; 1800 tests green; no regressions

- [x] **Track: TypeScript Strictness Re-enablement** *Phases: 3 | Link: [./archive/typescript_strictness_20260426/](./archive/typescript_strictness_20260426/)* — Re-enabled exactOptionalPropertyTypes and noUncheckedIndexedAccess; fixed 853 server errors + 381 app errors; 1800 tests green; 0 tsc errors

- [x] **Track: WebTorrent Download Management UI** *Phases: 3 | Link: [./archive/webtorrent_download_management_20260503/](./archive/webtorrent_download_management_20260503/)* — Backend torrent routes (25 tests), enhanced ActivityQueuePage with sort/filter/search/SSE/priority, app build clean, 1800 tests green

- [x] **Track: Dashboard Statistics & Analytics** *Phases: 3 | Link: [./archive/dashboard_statistics_20260503/](./archive/dashboard_statistics_20260503/)* — statistics dashboard with library composition charts, download metrics, system health monitoring; 17 tests green (15 backend + 2 integration)

- [x] **Track: Flutter Home & Library Browsing Screen** *Phases: 5 | Link: [./archive/feature_flutter_home_screen_20260502/](./archive/feature_flutter_home_screen_20260502/)* — LibraryScreen with Movies/TV tabs, sort controls, getLibrary integration; 9 server tests green; app typecheck clean

- [x] **Track: Catalog Indexer API Key Validation Guard** *Phases: 4 | Link: [./archive/chore_catalog_apikey_validation_20260502/](./archive/chore_catalog_apikey_validation_20260502/)* — server validation guard with 422 response; frontend inline inputs already handle UX; 11 catalog route tests pass

- [x] **Track: WebTorrent Native Addon Resolution** *Phases: 3 | Link: [./archive/webtorrent_addon_resolution_20260426/](./archive/webtorrent_addon_resolution_20260426/)* — patched `node-datachannel` to handle `ERR_DLOPEN_DISABLED`; WebTorrent now operates in TCP-only mode without falling back to stub manager; 224 test files passed

- [x] **Track: Flutter Player-First Navigation & Shell Default Route** *Phases: 2 | Link: [./archive/flutter_player_first_navigation_20260506/](./archive/flutter_player_first_navigation_20260506/)* — Library added to nav before Activity; default route already /home; compilation fixes for library_screen + quality_upgrade_sheet; viewport fixes for widget tests

- [x] **Track: Backend Drizzle Migration Cleanup & Type Safety** *Phases: 3 | Link: [./archive/drizzle_cleanup_type_safety_20260506/](./archive/drizzle_cleanup_type_safety_20260506/)* — prismaClient.ts → drizzleClient.ts + DatabaseClient rename; removed $executeRawUnsafe/$queryRaw shims; fixed seedSmartDefaults JSON round-trip; removed as any casts from AddIndexerModal/EditIndexerModal/AddProfileModal; 1802 tests green; app typecheck clean

- [x] **Track: Legacy Code & Test Infrastructure Cleanup** *Phases: 3 | Link: [./archive/legacy_test_cleanup_20260506/](./archive/legacy_test_cleanup_20260506/)* — Deleted app_src_backup/ + import-manager.test.js; strengthened core-primitives.test.tsx variant class assertions; documented VirtualTable mock acceptance; 1802 tests green

- [x] **Track: Wanted List Dashboard (SPA)** *Phases: 5 | Link: [./archive/feature_wanted_list_spa_20260507/](./archive/feature_wanted_list_spa_20260507/)* — Backend `GET /api/movies/missing` + `GET /api/episodes/missing` with pagination; WantedPage with Movies/Episodes tabs, search, monitored toggle, pagination; 15 component tests green; app build clean
