# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

---

## Execution Order and Dependencies

**Primary sequence:** `Prowlarr Phase 1 → (Sonarr + Radarr + Bazarr in parallel) → Cross-Cutting`

Prowlarr search execution (Phase 1) is the critical path — Sonarr and Radarr interactive search depend on real indexer queries working. Once Prowlarr Phase 1 is complete, Sonarr, Radarr, and Bazarr tracks can proceed in parallel. The Cross-Cutting track can begin Phase 1 (Custom Formats) and Phase 4 (Resilience) immediately, but Phases 2-3 (Import Lists, Calendar/Dashboard) can run in parallel with the domain tracks.

### Dependency Graph

```
Prowlarr Phase 1 (Search Execution — critical path)
    |
    +-------------------------------------------+
    |                    |                       |
    v                    v                       v
Sonarr Parity      Radarr Parity          Bazarr Parity
(all phases)       (all phases)            (all phases)
    |                    |                       |
    +-------------------------------------------+
    |
    v
Cross-Cutting Phases 2-3 (Import Lists UI, Calendar, Dashboard)
    (Phase 1: Custom Formats — can start immediately)
    (Phase 4: Resilience/Cardigann/Subtitle — can start immediately)

Prowlarr Phases 2-3 (App Profiles, Persistence) — independent, any time
```

### Parallelization Opportunities

- **Prowlarr Phase 1** is the only hard blocker — must complete before interactive search works in Sonarr/Radarr.
- **Cross-Cutting Phase 1** (Custom Formats) has no dependency on Prowlarr — can start immediately.
- **Cross-Cutting Phase 4** (Resilience, Cardigann form, Subtitle download) carries forward archived work — can start immediately.
- **Bazarr** has no dependency on Prowlarr search — can start immediately.
- **Prowlarr Phases 2-3** (App Profiles, Persistence, Filters) are independent — can run any time.
- **Radarr Phase 5** (Settings pages) depends on Cross-Cutting Phase 1 (Custom Formats) and Phase 2 (Import Lists) for the backend APIs those UI pages consume.

### Cross-Cutting Interface Contracts

The cross-cutting track produces shared backend APIs and engines that domain tracks consume. This table maps each cross-cutting output to its consumers so implementers know when a dependency is satisfied.

| Cross-Cutting Phase | Produces (API / Engine) | Consumed By | Consumer Task |
|---------------------|------------------------|-------------|---------------|
| **Phase 1**: Custom Formats | `GET/POST/PUT/DELETE /api/custom-formats` | Radarr Phase 5 | "Build Custom Formats Settings UI" |
| **Phase 1**: Custom Formats | `CustomFormatScoringEngine` | Radarr Phase 2 | "Complete Interactive Search Modal" (score display on releases) |
| **Phase 1**: Custom Formats | `CustomFormatScoringEngine` | Sonarr Phase 1 | "Wire Interactive Search" (score display on releases) |
| **Phase 1**: Custom Formats | Custom format score ↔ quality profile join | Radarr Phase 5 | "Build Quality Definitions Settings Page" |
| **Phase 2**: Import Lists | `GET/POST/PUT/DELETE /api/import-lists` | Radarr Phase 5 | "Build Import Lists Settings UI" |
| **Phase 2**: Import Lists | `GET/POST/DELETE /api/import-lists/exclusions` | Radarr Phase 5 | "Build Import Lists Settings UI" (exclusions tab) |
| **Phase 2**: Import Lists | Import list provider framework | Sonarr (future) | Not yet planned — Sonarr import lists deferred (see Out of Scope) |
| **Phase 3**: Calendar Feeds | `GET /api/calendar/ical`, `GET /api/calendar/rss` | Sonarr Phase 1 / Radarr Phase 2 | Calendar page buttons (iCal, RSS) |
| **Phase 3**: Calendar Feeds | `POST /api/calendar/search-missing` | Sonarr Phase 1 / Radarr Phase 2 | Calendar page "Search Missing" button |
| **Phase 3**: Dashboard Widgets | `GET /api/system/disk-space`, extended `/health` | All domains | Dashboard home page |
| **Phase 4**: Cardigann Form | `GET /api/indexers/schema/:configContract` | Prowlarr Phase 3 | "Build Indexer Info Modal & Capabilities Display" (also indexer add/edit) |
| **Phase 4**: Cardigann Form | DynamicForm conditional field rendering | Prowlarr Phase 2 | Notification provider dynamic forms |
| **Phase 4**: Subtitle Download | `OpenSubtitlesProvider.download()` | Bazarr Phase 2 | "Complete Movie Detail Subtitle Page" (manual search → download) |
| **Phase 4**: Resilience | MetadataProvider retry logic | Sonarr Phase 1, Radarr Phase 2 | Interactive search (metadata lookups) |
| **Phase 4**: Resilience | Indexer error-per-indexer reporting | Prowlarr Phase 1 | Search aggregation error display |

#### Gating Rules

1. **Hard gate**: Radarr Phase 5 tasks "Build Custom Formats Settings UI" and "Build Import Lists Settings UI" **MUST NOT start** until Cross-Cutting Phase 1 and Phase 2 (respectively) are complete — the UI pages have no backend to wire to otherwise.
2. **Soft gate**: Sonarr Phase 1 and Radarr Phase 2 interactive search can proceed without custom format scores — scores are additive display-only. Add format score columns once Cross-Cutting Phase 1 is done.
3. **Soft gate**: Calendar page buttons (iCal, RSS, Search Missing) can remain disabled until Cross-Cutting Phase 3 delivers the endpoints. The calendar view itself has no dependency.
4. **No gate**: Cross-Cutting Phase 4 (Resilience) improves robustness but nothing fails without it — domain tracks can proceed and benefit retroactively.

---

## Active Tracks

- [ ] **Track: Sonarr Feature Parity**
  *Description: Close all Sonarr gaps — series bulk editor, season pass UI, manual import/organize, interactive search wiring, advanced filtering, and missing metadata display.*
  *Phases: 5 | Link: [./tracks/sonarr_parity_20260217/](./tracks/sonarr_parity_20260217/)*

- [ ] **Track: Radarr Feature Parity**
  *Description: Close all Radarr gaps — collections CRUD, movie bulk editor, organize/rename, interactive search modal, missing settings pages, and import system.*
  *Phases: 5 | Link: [./tracks/radarr_parity_20260217/](./tracks/radarr_parity_20260217/)*

- [ ] **Track: Bazarr Feature Parity**
  *Description: Close Bazarr gaps — movie mass edit backend, subtitle upload workflow, episode-level detail operations, and advanced subtitle settings.*
  *Phases: 3 | Link: [./tracks/bazarr_parity_20260217/](./tracks/bazarr_parity_20260217/)*

- [~] **Track: Cross-Cutting Parity Features**
  *Description: Shared features across all apps — custom formats system, import lists framework, iCal/RSS calendar sync, dashboard widgets, activity filtering, resilience improvements, and carried-forward Cardigann/subtitle fixes.*
  *Phases: 4 | Link: [./tracks/cross_cutting_parity_20260217/](./tracks/cross_cutting_parity_20260217/)*

- [~] **Track: Cardigann Runtime Parity (Monolith-Native)**
  *Description: Reimplement Cardigann execution features required by imported indexer definitions, with a test-first compatibility harness and definition-driven parity milestones for Mediarr's native indexer engine.*
  *Phases: 5 | Link: [./tracks/cardigann_runtime_parity_20260223/](./tracks/cardigann_runtime_parity_20260223/)*

---

## Archived Tracks

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
- [x] **Track: UI Stub Closure & Deduplication** *Phases: 5 | Link: [../archive/ui_stub_closure_20260217/](../archive/ui_stub_closure_20260217/)*
- [x] **Track: Fix Core Parity Wiring** *Phases: 4 (3 complete, Phase 4 carried forward to cross-cutting) | Link: [../archive/fix_core_parity_wiring_20260212/](../archive/fix_core_parity_wiring_20260212/)*
- [x] **Track: Radarr UI Cloning** *Phases: 11 (settings pages carried forward to radarr_parity) | Link: [../archive/radarr_ui_cloning_20260214/](../archive/radarr_ui_cloning_20260214/)*
- [~] **Track: UI Operational Hardening (archived — superseded by domain parity tracks)** *Link: [../archive/ui_operational_hardening_20260211/](../archive/ui_operational_hardening_20260211/)*
- [~] **Track: UI Dashboard & Settings (archived — superseded by cross-cutting parity track)** *Link: [../archive/ui_dashboard_settings_20260211/](../archive/ui_dashboard_settings_20260211/)*
- [~] **Track: UI E2E Hardening (archived — deferred until parity complete)** *Link: [../archive/ui_e2e_hardening_20260211/](../archive/ui_e2e_hardening_20260211/)*
