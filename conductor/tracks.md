# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

---

## Execution Order and Dependencies

**Current sequence (Stack Modernisation):**
`chore_ui_foundation` → `chore_shadcn_setup` → `chore_app_decompose` → `chore_form_standardization`

**Parallel track (backend, no frontend dependency):**
`chore_drizzle_migration` — can begin after `chore_ui_foundation` is complete (clean baseline)

### Dependency Graph

```
chore_ui_foundation_20260314  (no deps — first track of day, clean baseline)
    |
    v
chore_shadcn_setup_20260314  (needs cn() and clean build from foundation)
    |
    v
chore_app_decompose_20260314  (needs shadcn primitives available to extracted pages)
    |
    v
chore_form_standardization_20260314  (needs shadcn Form + decomposed pages)

chore_drizzle_migration_20260314  (backend-only; depends on clean baseline from ui_foundation)
```

---

## Active Tracks

*(none)*

## Upcoming / Planned

- [ ] **Track: App.tsx Decomposition** *Phases: 3 | Link: [./tracks/chore_app_decompose_20260314/](./tracks/chore_app_decompose_20260314/)*
- [ ] **Track: Form Standardization** *Phases: 2 | Link: [./tracks/chore_form_standardization_20260314/](./tracks/chore_form_standardization_20260314/)*
- [ ] **Track: Drizzle ORM Migration** *Phases: 4 | Link: [./tracks/chore_drizzle_migration_20260314/](./tracks/chore_drizzle_migration_20260314/)*

---

## Upcoming / Unplanned

- [ ] *Track: Use AI SDK and a cheap model for pattern matching instead of regex during search and import; Choose model and input API key

---
## Archived Tracks

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
- [x] **Track: Monolith Unification Refactor** *Phases: 3 | Link: [../archive/monolith_unification_refactor_20260226/](../archive/monolith_unification_refactor_20260226/)*
- [x] **Track: Sonarr Feature Parity** *Phases: 5 | Link: [./archive/sonarr_parity_20260217/](./archive/sonarr_parity_20260217/)*
- [x] **Track: Foundation** *Link: [../archive/foundation_20260210/](../archive/foundation_20260210/)*
- [x] **Track: Indexer Engine** *Link: [../archive/indexer_engine_20260210/](../archive/indexer_engine_20260210/)*
- [x] **Track: Torrent Engine** *Link: [../archive/torrent_engine_20260211/](../archive/torrent_engine_20260211/)*
- [x] **Track: Movie Management** *Link: [../archive/movie_management_20260211/](../archive/movie_management_20260211/)*
- [x] **Track: TV Management** *Link: [../archive/tv_management_20260211/](../archive/tv_management_20260211/)*
- [x] **Track: Subtitle & Audio Engine** *Link: [../archive/subtitle_audio_engine_20260211/](../archive/subtitle_audio_engine_20260211/)*
- [x] **Track: Docker Volumes** *Link: [../archive/docker_volumes_20260211/](../archive/docker_volumes_20260211/)*
- [x] **Track: UI Platform Prerequisites** *Link: [../archive/ui_platform_prereqs_20260211/](../archive/ui_platform_prereqs_20260211/)*
- [x] **Track: UI Core Operations** *Link: [../archive/ui_core_operations_20260211/](../archive/ui_core_operations_20260211/)*
- [x] **Track: UI API Surface Contracts** *Link: [../archive/ui_api_surface_contracts_20260211/](../archive/ui_api_surface_contracts_20260211/)*
- [x] **Track: Unified UI Dashboard (superseded)** *Link: [../archive/unified_ui_dashboard_20260211_superseded/](../archive/unified_ui_dashboard_20260211_superseded/)*
- [x] **Track: Clone Parity Gap Investigation** *Link: [../archive/clone_parity_gap_investigation_20260212/](../archive/clone_parity_gap_investigation_20260212/)*
- [x] **Track: Sonarr UI Cloning** *Phases: 14 | Link: [../archive/sonarr_ui_cloning_20260214/](../archive/sonarr_ui_cloning_20260214/)*
- [x] **Track: Bazarr UI Cloning** *Phases: 13 | Link: [../archive/bazarr_ui_cloning_20260214/](../archive/bazarr_ui_cloning_20260214/)*
- [x] **Track: Prowlarr UI Cloning** *Phases: 10 | Link: [../archive/prowlarr_ui_cloning_20260214/](../archive/prowlarr_ui_cloning_20260214/)*
- [x] **Track: Prowlarr Feature Parity** *Phases: 3 | Link: [../archive/prowlarr_parity_20260217/](../archive/prowlarr_parity_20260217/)*
- [x] **Track: Cardigann Runtime Parity (Monolith-Native)** *Phases: 5 | Link: [../archive/cardigann_runtime_parity_20260223/](../archive/cardigann_runtime_parity_20260223/)*
- [x] **Track: UI Stub Closure & Deduplication** *Phases: 5 | Link: [../archive/ui_stub_closure_20260217/](../archive/ui_stub_closure_20260217/)*
- [x] **Track: Fix Core Parity Wiring** *Phases: 4 | Link: [../archive/fix_core_parity_wiring_20260212/](../archive/fix_core_parity_wiring_20260212/)*
- [x] **Track: Radarr UI Cloning** *Phases: 11 | Link: [../archive/radarr_ui_cloning_20260214/](../archive/radarr_ui_cloning_20260214/)*
- [~] **Track: Radarr Feature Parity (superseded)** *Phases: 5 | Link: [../archive/radarr_parity_20260217/](../archive/radarr_parity_20260217/)*
- [~] **Track: Bazarr Feature Parity (superseded)** *Phases: 3 | Link: [../archive/bazarr_parity_20260217/](../archive/bazarr_parity_20260217/)*
- [~] **Track: Cross-Cutting Parity Features (superseded)** *Phases: 4 | Link: [../archive/cross_cutting_parity_20260217/](../archive/cross_cutting_parity_20260217/)*
- [~] **Track: UI Operational Hardening (archived)** *Link: [../archive/ui_operational_hardening_20260211/](../archive/ui_operational_hardening_20260211/)*
- [~] **Track: UI Dashboard & Settings (archived)** *Link: [../archive/ui_dashboard_settings_20260211/](../archive/ui_dashboard_settings_20260211/)*
- [~] **Track: UI E2E Hardening (archived)** *Link: [../archive/ui_e2e_hardening_20260211/](../archive/ui_e2e_hardening_20260211/)*

