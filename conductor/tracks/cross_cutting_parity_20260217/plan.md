# Implementation Plan: Cross-Cutting Parity Features

## Phase 1: Custom Formats System
> **NO CROSS-TRACK DEPENDENCIES** — can start immediately.
> **UNBLOCKS**: Radarr Phase 5 ("Build Custom Formats Settings UI", "Build Quality Definitions Settings Page"), Sonarr Phase 1 and Radarr Phase 2 (custom format score display on search releases).

- [x] Task: Build Custom Formats Backend
    - [x] Sub-task: Write tests — verify CRUD for custom format definitions.
    - [x] Sub-task: Write tests — verify scoring engine evaluates release against format conditions.
    - [x] Sub-task: Write tests — verify format scores integrate with quality profile ranking.
    - [x] Sub-task: Add Prisma model: CustomFormat (id, name, includeCustomFormatWhenRenaming, conditions JSON, score).
    - [x] Sub-task: Add CustomFormatScore join table (customFormatId, qualityProfileId, score).
    - [x] Sub-task: Run migration.
    - [x] Sub-task: Implement `GET/POST/PUT/DELETE /api/custom-formats` endpoints.
    - [x] Sub-task: Implement CustomFormatScoringEngine: evaluate release title/properties against conditions (regex match, size range, language, indexer flags).
    - [~] Sub-task: Integrate scoring engine into release evaluation (search results ranking).
    - [ ] Sub-task: Add custom format score display to quality profile edit UI.
- [~] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) - PENDING

## Phase 2: Import Lists Framework - BACKEND COMPLETE
> **NO CROSS-TRACK DEPENDENCIES** — can start immediately.
> **UNBLOCKS**: Radarr Phase 5 ("Build Import Lists Settings UI").

- [x] Task: Build Import Lists Backend
    - [x] Sub-task: Write tests — verify CRUD for import list configurations.
    - [x] Sub-task: Write tests — verify TMDB Popular provider fetches and returns normalized results.
    - [x] Sub-task: Write tests — verify sync creates new media entries respecting exclusions.
    - [x] Sub-task: Write tests — verify exclusion CRUD works.
    - [x] Sub-task: Add Prisma models: ImportList (id, name, providerType, config JSON, rootFolderPath, qualityProfileId, monitorType, enabled, syncInterval), ImportListExclusion (id, tmdbId, imdbId, title).
    - [x] Sub-task: Run migration.
    - [x] Sub-task: Implement `GET/POST/PUT/DELETE /api/import-lists` endpoints.
    - [x] Sub-task: Implement `POST /api/import-lists/:id/sync` — fetch from provider, filter exclusions, add new media.
    - [x] Sub-task: Implement `GET/POST/DELETE /api/import-lists/exclusions` endpoints.
    - [x] Sub-task: Implement TMDBPopularProvider (fetch popular movies/series from TMDB).
    - [x] Sub-task: Implement TMDBListProvider (fetch from specific TMDB list by ID).
    - [x] Sub-task: Register import list sync in scheduler (node-cron) at configurable intervals.
- [ ] Task: Build Import Lists Settings UI
    - [ ] Sub-task: Write tests — verify import lists page renders with CRUD operations.
    - [ ] Sub-task: Write tests — verify exclusion management works.
    - [ ] Sub-task: Create reusable ImportListSettings component (used by both Radarr and Sonarr settings pages).
    - [ ] Sub-task: List configured import lists with name, type, enabled, last sync time.
    - [ ] Sub-task: Create/edit modal: provider type selector, provider-specific config fields, root folder, quality profile, monitoring type, sync interval.
    - [ ] Sub-task: Manual sync button per list.
    - [ ] Sub-task: Exclusions tab: list exclusions, add exclusion (search media + exclude), remove exclusion.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) - PENDING

## Phase 3: Calendar Sync & Dashboard Widgets - PENDING
> **NO CROSS-TRACK DEPENDENCIES** — can start immediately.
> **UNBLOCKS**: Sonarr and Radarr calendar page buttons (iCal, RSS, Search Missing — currently disabled).

- [ ] Task: Build Calendar Feed Backend
    - [ ] Sub-task: Write tests — verify `GET /api/calendar/ical` returns valid iCal file.
    - [ ] Sub-task: Write tests — verify `GET /api/calendar/rss` returns valid RSS XML.
    - [ ] Sub-task: Write tests — verify `POST /api/calendar/search-missing` triggers search for missing items in date range.
    - [ ] Sub-task: Implement iCal feed generator (RFC 5545 compliant): VEVENT per upcoming release with DTSTART, SUMMARY, DESCRIPTION.
    - [ ] Sub-task: Implement RSS feed generator: standard RSS 2.0 XML with upcoming releases.
    - [ ] Sub-task: Implement search-missing endpoint: find unmonitored/missing items in date range, trigger release search for each.
- [ ] Task: Enable Calendar UI Buttons
    - [ ] Sub-task: Write tests — verify iCal, RSS, Search Missing buttons are enabled and functional.
    - [ ] Sub-task: Enable iCal button — on click, open/download iCal feed URL.
    - [ ] Sub-task: Enable RSS button — on click, copy RSS feed URL to clipboard.
    - [ ] Sub-task: Enable Search Missing button — on click, call search-missing for current view date range.
- [ ] Task: Build Dashboard Widgets
    - [ ] Sub-task: Write tests — verify dashboard renders all widget cards with data.
    - [ ] Sub-task: Implement `GET /api/system/disk-space` endpoint: return volume paths with total/used/free bytes.
    - [ ] Sub-task: Extend `GET /api/system/health` with aggregated health check summary.
    - [ ] Sub-task: Build CalendarWidget: shows next 7 days of upcoming releases in compact list.
    - [ ] Sub-task: Build DiskSpaceWidget: volume bars with usage percentages.
    - [ ] Sub-task: Build ActivityFeedWidget: last 10 events with type icons.
    - [ ] Sub-task: Build LibraryStatsWidget: total movies, series, episodes, subtitle coverage %.
    - [ ] Sub-task: Build HealthWidget: green/yellow/red status indicators per check.
    - [ ] Sub-task: Add widgets to main dashboard/home page in responsive grid layout.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) - PENDING

## Phase 4: Activity Filtering & Resilience - PENDING
> **NO CROSS-TRACK DEPENDENCIES** — carries forward work from archived `fix_core_parity_wiring` Phase 4. Can start immediately.
> **UNBLOCKS**: Bazarr Phase 2 (subtitle download flow), Prowlarr Phase 1 (per-indexer error reporting), Prowlarr Phase 2 (DynamicForm conditional fields for notification forms).

- [ ] Task: Build Activity Filtering
    - [ ] Sub-task: Write tests — verify filter controls narrow activity/history results.
    - [ ] Sub-task: Write tests — verify backend accepts filter query params.
    - [ ] Sub-task: Add filter query params to activity/history API: type, dateFrom, dateTo, status, mediaType (movie/series/episode).
    - [ ] Sub-task: Build filter controls on activity page: type dropdown, date range picker, status dropdown, media type dropdown.
    - [ ] Sub-task: Wire filter changes to API query refetch.
    - [ ] Sub-task: Persist filter preferences to localStorage.
- [ ] Task: Build Resilience Improvements
    - [ ] Sub-task: Write tests — verify MetadataProvider retries on failure with backoff.
    - [ ] Sub-task: Write tests — verify WebTorrent failure appears in health endpoint.
    - [ ] Sub-task: Write tests — verify indexer search failures are reported gracefully (not thrown).
    - [ ] Sub-task: Implement retry logic in MetadataProvider: 3 attempts with exponential backoff (1s, 3s, 9s).
    - [ ] Sub-task: Surface WebTorrent status in health endpoint (connected/disconnected/error).
    - [ ] Sub-task: Ensure indexer search errors are caught per-indexer and reported in search response (not blocking other indexers).
    - [ ] Sub-task: Add user-facing error toasts with actionable messages (e.g., "Indexer X timed out — check indexer settings").
- [ ] Task: Complete Cardigann Indexer Form
    - [ ] Sub-task: Write tests — verify implementation selector in create flow syncs configContract/implementation/protocol.
    - [ ] Sub-task: Write tests — verify edit flow loads Cardigann fields from definition schema.
    - [ ] Sub-task: Write tests — verify conditional fields show/hide based on watched values.
    - [ ] Sub-task: Add implementation type selector to indexer create form (Torznab, Cardigann, Newznab).
    - [ ] Sub-task: Replace `JSON.parse(configContract)` fallback with definition-lookup from backend.
    - [ ] Sub-task: Add `GET /api/indexers/schema/:configContract` endpoint returning field definitions.
    - [ ] Sub-task: Extend DynamicForm FieldDefinition with `condition: { field, value }`.
    - [ ] Sub-task: Implement watch-based conditional rendering in DynamicForm (useWatch show/hide, strip hidden values on submit).
- [ ] Task: Complete Subtitle Download
    - [ ] Sub-task: Write tests — verify OpenSubtitlesProvider.download() fetches file content.
    - [ ] Sub-task: Write tests — verify manualDownload() writes subtitle file to disk.
    - [ ] Sub-task: Implement OpenSubtitlesProvider.download(): call download API, return file content.
    - [ ] Sub-task: Update SubtitleInventoryApiService.manualDownload(): write file to storedPath on disk, persist DB metadata.
    - [ ] Sub-task: Replace alert() in subtitle manual search with toast notification.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md) - PENDING
