# Implementation Plan: Radarr Feature Parity

## Phase 1: Collections Management (Full CRUD)

- [ ] Task: Build Collections Backend
    - [ ] Sub-task: Write tests — verify `GET /api/collections` returns collections with movie counts and progress.
    - [ ] Sub-task: Write tests — verify `PUT /api/collections/:id` updates monitored, quality profile, root folder.
    - [ ] Sub-task: Write tests — verify `DELETE /api/collections/:id` removes collection tracking.
    - [ ] Sub-task: Write tests — verify `POST /api/collections/:id/search` triggers search for missing movies in collection.
    - [ ] Sub-task: Implement collection update endpoint (monitored, qualityProfileId, rootFolderPath).
    - [ ] Sub-task: Implement collection delete endpoint.
    - [ ] Sub-task: Implement collection search endpoint (iterate missing movies, trigger release search).
    - [ ] Sub-task: Add movie count and in-library count to collection list response.
- [ ] Task: Build Collections UI (Full CRUD)
    - [ ] Sub-task: Write tests — verify collection page shows progress bar (X/Y movies).
    - [ ] Sub-task: Write tests — verify edit modal saves changes and refreshes list.
    - [ ] Sub-task: Write tests — verify delete with confirmation removes collection.
    - [ ] Sub-task: Replace stubbed edit handler with real API call via React Query mutation.
    - [ ] Sub-task: Replace stubbed delete handler with real API call + confirmation modal.
    - [ ] Sub-task: Wire monitor toggle to `PUT /api/collections/:id { monitored }`.
    - [ ] Sub-task: Add progress bar per collection card (in-library / total movies).
    - [ ] Sub-task: Add search button per collection calling search endpoint.
    - [ ] Sub-task: Add filter and sort controls (name, size, completion %).
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Interactive Search & Movie Detail Enrichment
> **BLOCKED BY**: "Complete Interactive Search Modal" requires `prowlarr_parity Phase 1` (search aggregation backend must return real results from indexers). Movie detail enrichment tasks have no cross-track dependency.
> **SOFT DEPENDENCY**: Custom format score display on releases is additive — wire once `cross_cutting_parity Phase 1` delivers `CustomFormatScoringEngine`.

- [x] Task: Complete Interactive Search Modal
    - [x] Sub-task: Write tests — verify search modal fetches real releases and displays in table.
    - [x] Sub-task: Write tests — verify grab action sends release to download client.
    - [x] Sub-task: Write tests — verify filter controls narrow results by quality, indexer.
    - [x] Sub-task: Wire modal to `POST /api/releases/search` with `movieId` param.
    - [x] Sub-task: Render release rows: name, quality, size, seeders, age, indexer, protocol.
    - [x] Sub-task: Add quality and indexer filter dropdowns within modal.
    - [x] Sub-task: Add sort controls (seeders, size, age, quality).
    - [x] Sub-task: Implement grab button calling `POST /api/releases/grab`.
    - [x] Sub-task: Add override match capability (manual title/year assignment).
- [x] Task: Enrich Movie Detail Page
    - [x] Sub-task: Write tests — verify cast/crew section renders from movie metadata.
    - [x] Sub-task: Write tests — verify alternate titles display.
    - [x] Sub-task: Write tests — verify history timeline renders on detail page.
    - [x] Sub-task: Add cast and crew section with role display (from TMDB metadata).
    - [x] Sub-task: Add alternate titles collapsible section.
    - [x] Sub-task: Add quality/custom format info display for movie file.
    - [x] Sub-task: Add audio track and subtitle file details for movie file.
    - [x] Sub-task: Add history timeline tab showing download/import events for this movie.
    - [x] Sub-task: Backend: `GET /api/movies/:id/history` returning events filtered to movie.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Movie Bulk Editor

- [ ] Task: Build Bulk Edit Backend
    - [ ] Sub-task: Write tests — verify `PUT /api/movies/bulk` updates fields for multiple movies.
    - [ ] Sub-task: Write tests — verify tag add/remove operations in bulk.
    - [ ] Sub-task: Implement `PUT /api/movies/bulk` endpoint: `{ movieIds: number[], changes: { qualityProfileId?, monitored?, minimumAvailability?, rootFolderPath?, addTags?, removeTags? } }`.
    - [ ] Sub-task: Implement in repository with transaction wrapping.
- [ ] Task: Build Bulk Editor UI
    - [ ] Sub-task: Write tests — verify bulk editor renders movie selection and edit controls.
    - [ ] Sub-task: Write tests — verify changes preview before apply.
    - [ ] Sub-task: Add multi-select mode to movie library (checkbox column, select all).
    - [ ] Sub-task: Create bulk edit toolbar/modal: quality profile, monitored, minimum availability, root folder, tags.
    - [ ] Sub-task: Show change preview summary before applying.
    - [ ] Sub-task: Wire apply to `PUT /api/movies/bulk`.
    - [ ] Sub-task: Add "Organize Files" action for selected movies in bulk toolbar.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Organize/Rename & Interactive Import

- [ ] Task: Build Organize/Rename Backend
    - [ ] Sub-task: Write tests — verify preview returns old/new path pairs based on naming pattern.
    - [ ] Sub-task: Write tests — verify apply renames files on disk and updates DB.
    - [ ] Sub-task: Implement `POST /api/movies/organize/preview` — apply naming format to movie files, return before/after.
    - [ ] Sub-task: Implement `PUT /api/movies/organize/apply` — rename files, update movie file paths in DB.
    - [ ] Sub-task: Add naming pattern settings (movie folder format, movie file format) to settings schema.
- [ ] Task: Build Organize/Rename UI
    - [ ] Sub-task: Write tests — verify rename preview modal shows before/after paths.
    - [ ] Sub-task: Create organize preview modal with before → after table.
    - [ ] Sub-task: Add "Organize" button to movie detail toolbar and bulk editor.
    - [ ] Sub-task: Wire apply button to organize endpoint with confirmation.
- [ ] Task: Build Interactive Import Backend
    - [ ] Sub-task: Write tests — verify scan returns file list with match attempts.
    - [ ] Sub-task: Write tests — verify import applies movie match, moves files, updates DB.
    - [ ] Sub-task: Implement `POST /api/movies/import/scan` — scan directory, parse filenames, attempt movie matching via metadata search.
    - [ ] Sub-task: Implement `POST /api/movies/import/apply` — import selected files with confirmed matches, quality, language.
- [ ] Task: Build Interactive Import UI
    - [ ] Sub-task: Write tests — verify import page shows scanned files with match status.
    - [ ] Sub-task: Write tests — verify manual match override works.
    - [ ] Sub-task: Wire `/add/import` page to real scan endpoint (currently stub).
    - [ ] Sub-task: Display scanned files: filename, detected movie, match confidence, quality.
    - [ ] Sub-task: Manual match override: movie search dialog to pick correct match.
    - [ ] Sub-task: Quality and language override per file.
    - [ ] Sub-task: Import button to apply all confirmed matches.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)

## Phase 5: Missing Settings Pages
> **BLOCKED BY**: "Build Custom Formats Settings UI" requires `cross_cutting_parity Phase 1` (Custom Formats backend API). "Build Import Lists Settings UI" requires `cross_cutting_parity Phase 2` (Import Lists backend API). Other settings pages in this phase have no cross-track dependencies and can start immediately.

- [ ] Task: Build Media Management Settings Page
    - [ ] Sub-task: Write tests — verify page renders naming pattern editor, permissions, root folders.
    - [ ] Sub-task: Create `/settings/mediamanagement` page.
    - [ ] Sub-task: Naming pattern editor: movie folder format, movie file format with token insertion.
    - [ ] Sub-task: File permissions settings (chmod folder, chmod file).
    - [ ] Sub-task: Root folder management (add/remove/edit).
    - [ ] Sub-task: Recycling bin configuration (path, cleanup days).
    - [ ] Sub-task: Wire all fields to settings API.
- [ ] Task: Build Quality Definitions Settings Page
    - [ ] Sub-task: Write tests — verify quality definition table renders with size limits.
    - [ ] Sub-task: Create `/settings/quality` page.
    - [ ] Sub-task: Table of quality types with min/max size sliders.
    - [ ] Sub-task: Wire to settings API for persisting quality definitions.
- [ ] Task: Build Custom Formats Settings UI
    - [ ] Sub-task: Write tests — verify custom format CRUD UI works.
    - [ ] Sub-task: Create `/settings/customformats` page.
    - [ ] Sub-task: List existing custom formats with edit/delete.
    - [ ] Sub-task: Create/edit modal with name, conditions builder, and scoring.
    - [ ] Sub-task: Wire to `GET/POST/PUT/DELETE /api/custom-formats` (from cross-cutting track).
- [ ] Task: Build Import Lists Settings UI
    - [ ] Sub-task: Write tests — verify import list CRUD UI works.
    - [ ] Sub-task: Create `/settings/importlists` page.
    - [ ] Sub-task: List configured import lists with edit/delete/sync.
    - [ ] Sub-task: Create/edit modal with provider type, URL/config, root folder, quality profile, monitoring.
    - [ ] Sub-task: Wire to `GET/POST/PUT/DELETE /api/import-lists` (from cross-cutting track).
- [ ] Task: Build Metadata Settings Page
    - [ ] Sub-task: Write tests — verify metadata settings page renders.
    - [ ] Sub-task: Create `/settings/metadata` page.
    - [ ] Sub-task: NFO file generation toggle and options.
    - [ ] Sub-task: Metadata consumer configuration.
- [ ] Task: Build Tags Management Page
    - [ ] Sub-task: Write tests — verify tag CRUD and usage display works.
    - [ ] Sub-task: Create `/settings/tags` page.
    - [ ] Sub-task: Tag list with add/edit/delete.
    - [ ] Sub-task: Tag detail modal showing: which series, movies, profiles, etc. use this tag.
    - [ ] Sub-task: Backend: `GET /api/tags/:id/detail` returning tag usage across entities.
- [ ] Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md)
