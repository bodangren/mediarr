# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

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


- [ ] **Track: Form Standardization Completion** *Phases: 3 | Link: [./tracks/chore_form_standardization_completion_20260330/](./tracks/chore_form_standardization_completion_20260330/)*
- [ ] **Track: Playback Resume & Continue Watching** *Phases: 4 | Link: [./tracks/feature_playback_resume_sync_20260330/](./tracks/feature_playback_resume_sync_20260330/)*

### Phase B: External Comms
- [ ] **Track: Notification Transport Layer** *Phases: 4 | Link: [./tracks/feature_notification_transports_20260330/](./tracks/feature_notification_transports_20260330/)*
- [ ] **Track: Real Auto-Update System** *Phases: 4 | Link: [./tracks/feature_auto_update_20260330/](./tracks/feature_auto_update_20260330/)*

### Phase C: Zero-Config Setup
- [ ] **Track: Setup Wizard & First-Run** *Phases: 2 | Link: [./tracks/feature_setup_wizard_20260330/](./tracks/feature_setup_wizard_20260330/)*
- [ ] **Track: Indexer Auto-Discovery** *Phases: 4 | Link: [./tracks/feature_indexer_discovery_20260330/](./tracks/feature_indexer_discovery_20260330/)*
- [ ] **Track: Smart Defaults Engine** *Phases: 3 | Link: [./tracks/feature_smart_defaults_20260330/](./tracks/feature_smart_defaults_20260330/)*

### Phase D: Flutter Living Room
- [ ] **Track: Flutter Search & Add Media** *Phases: 3 | Link: [./tracks/feature_flutter_search_add_20260330/](./tracks/feature_flutter_search_add_20260330/)*
- [ ] **Track: Flutter Activity & Queue** *Phases: 3 | Link: [./tracks/feature_flutter_activity_queue_20260330/](./tracks/feature_flutter_activity_queue_20260330/)*
- [ ] **Track: Flutter Continue Watching & Calendar** *Phases: 2 | Link: [./tracks/feature_flutter_continue_watching_20260330/](./tracks/feature_flutter_continue_watching_20260330/)*
- [ ] **Track: Flutter Subtitle & Quality Control** *Phases: 2 | Link: [./tracks/feature_flutter_subtitle_quality_20260330/](./tracks/feature_flutter_subtitle_quality_20260330/)*

### Parallel: Backend Performance
- [!] **Track: Drizzle ORM Migration** *Phases: 4 | PAUSED — broke 121 tests, reverted to green* | Link: [./tracks/chore_drizzle_migration_20260314/](./tracks/chore_drizzle_migration_20260314/)*

---

## Archived Tracks

- [x] **Track: Local LLM Gateway Routing** *Phases: 3 | Link: [./archive/feature_local_llm_gateway_20260401/](./archive/feature_local_llm_gateway_20260401/)* — ReleaseParser now prefers `AI_GATEWAY_BASE_URL` + model envs, falls back to OpenRouter, then regex-only parsing
- [x] **Track: Conductor Housekeeping Cleanup** *Phases: 3 | Link: [./archive/chore_conductor_housekeeping_20260401/](./archive/chore_conductor_housekeeping_20260401/)* — cleaned recent archive-plan residue and trimmed `lessons-learned.md` to 40 lines
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
