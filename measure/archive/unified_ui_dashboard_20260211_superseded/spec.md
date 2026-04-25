> **Status:** Superseded on 2026-02-11 by tracks `ui_platform_prereqs_20260211` (7A), `ui_api_surface_contracts_20260211` (7B), `ui_core_operations_20260211` (7C), and `ui_operational_hardening_20260211` (7D).

# Specification: Track 7 - Unified UI & Dashboard

## Overview
Build the production Mediarr web application UI that unifies all completed backend modules into a single operational interface. This track is the final essential piece before optional DLNA work (Track 8): users must be able to add media, monitor state, initiate/observe downloads, process files, and manage subtitles from one coherent dashboard.

The UI must combine the strongest operator workflows from Prowlarr, Sonarr, Radarr, Bazarr, and torrent clients while keeping a single information architecture and consistent interaction model.

## Functional Requirements

### FR-1: Application Shell and Navigation
- Provide a persistent app shell with sidebar/top navigation for:
  - Dashboard
  - Library (TV + Movies)
  - Wanted
  - Activity / Queue
  - Indexers
  - Subtitles
  - Settings
- Include global search/quick actions and a consistent breadcrumb/title system.
- Support deep-linkable routes for all primary entities (series, movie, torrent, indexer, subtitle variant).

### FR-2: Unified Dashboard (Operational Overview)
- Present real-time summary cards for:
  - Monitored media counts (TV/Movie)
  - Wanted items
  - Active torrent downloads/seeding
  - Subtitle wanted/backlog state
  - Recent RSS/import activity
- Provide a consolidated “health/events” feed with actionable errors and warnings.
- Each dashboard card must deep-link to the underlying filtered view.

### FR-3: Add Media and Discovery Flows
- Implement movie and series search/add workflows (Radarr/Sonarr style):
  - Search by title, TMDB/TVDB ID where applicable.
  - Preview metadata before adding.
  - Select quality profile and monitoring defaults.
  - Optional immediate search trigger after add.
- Add flows must clearly surface conflicts/duplicates and resolution options.

### FR-4: Library Management (TV + Movies)
- Create list/detail views for movies and series with:
  - Monitoring status toggles.
  - File presence/quality indicators.
  - Availability/status indicators (released/in cinemas/airing).
- Provide actionable “wanted” operations from list/detail contexts.
- Ensure TV and Movie views share reusable components and interaction patterns.

### FR-5: Wanted and Search Operations
- Build a centralized Wanted screen combining missing episodes and movies.
- Allow manual and automatic search actions per item.
- **Requirement:** The backend must support a "search-only" mode (returning candidates without downloading) to populate the results list.
- Display candidate results with ranking cues (quality/profile fit/seeders/size).
- Enable release selection and handoff to torrent engine.

### FR-6: Torrent Queue and Transfer Monitoring
- Build a queue view with torrent-client parity for:
  - Status, progress, ETA, download/upload rate, ratio, peers, save path.
  - Pause, resume, remove, and inspect actions.
- Show transitions across incomplete/complete/imported lifecycle.
- **Requirement:** Backend must persist active transfer stats (speed, progress) to the database to ensure the API returns live data even if the frontend polls the DB.
- Support polling or push updates that keep UI state current during active transfers.

### FR-7: Indexer Management (Prowlarr Layer UI)
- Provide indexer CRUD interfaces and detail panels for implementation/protocol/settings.
- Support “Test indexer” action and clear diagnostics for failures.
- Show enabled/disabled state, priority, capabilities (RSS/Search), and last sync hints.

### FR-8: Subtitle and Audio Operations (Bazarr Layer UI)
- Expose variant-aware subtitle inventory views:
  - File variants
  - Audio tracks
  - Existing subtitle tracks
  - Missing subtitle state
- **Requirement:** Backend service must dynamically resolve the configured subtitle provider (e.g., OpenSubtitles) via a factory pattern to enable manual search API calls.
- Manual search/download must require explicit variant selection when multiple variants exist.
- Display subtitle history and wanted subtitle job state.

### FR-9: Activity, Logs, and Error UX
- Provide user-visible operation history for key workflows (add/search/download/import/subtitle).
- Normalize empty/error/loading states with technical detail suitable for power users.
- Surface recovery actions directly from error states whenever possible.

### FR-10: API Integration and Client Contracts
- Implement typed client contracts between Next.js UI and server capabilities used in prior tracks.
- **Requirement:** Implement a global serialization strategy for `BigInt` to safely transport 64-bit integers (file sizes) over JSON without runtime errors.
- Ensure contract mapping handles BigInt/string normalization and enum transformations.
- Preserve backward-compatible payload handling where existing service contracts require it.

### FR-11: Settings and Defaults
- Add a settings surface for core operational controls already supported by backend modules:
  - Download paths/behavior visibility
  - Torrent speed/ratio controls (where exposed)
  - Indexer defaults and sync intervals visibility
- Keep advanced options available by default (power-user-first behavior).

### FR-12: End-to-End User Journeys
The UI must support full journeys without terminal-only workflows:
1. Add series/movie.
2. See item in monitored library.
3. Trigger/manual or auto search.
4. Observe torrent queue progress.
5. Confirm import/organization outcome.
6. Inspect and manage subtitle state when applicable.

## Non-Functional Requirements
- **UX Consistency:** One design language and interaction model across all modules.
- **Performance:** Primary list views and dashboard should remain responsive under high data density.
- **Mobile Support:** Core operational workflows must be usable on mobile breakpoints.
- **Observability:** Expose actionable technical details in UI for troubleshooting.
- **Type Safety:** No untyped API integration paths in feature code.
- **Accessibility:** Keyboard navigation and semantic structure for primary controls.

## Acceptance Criteria
- [ ] A user can complete add→monitor→download→organize from the web UI for both TV and Movies.
- [ ] Dashboard shows live operational state and links correctly to detailed views.
- [ ] Wanted screen allows manual release selection and queue handoff.
- [ ] Queue view reflects torrent lifecycle and supports pause/resume/remove actions.
- [ ] Indexer CRUD/Test workflows are fully operable in UI.
- [ ] Subtitle variant inventory and manual variant-targeted search/download workflows are operable.
- [ ] Error/loading/empty states are informative and actionable across primary screens.
- [ ] Core workflows remain usable on mobile layouts.

## Out of Scope
- DLNA server and local streaming playback (Track 8).
- External notification systems (Discord/Push/Webhook).
- User accounts/roles and multi-tenant permissions.
- Theme packs beyond the baseline Modern Dark direction.
