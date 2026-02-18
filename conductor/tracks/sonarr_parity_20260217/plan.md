# Implementation Plan: Sonarr Feature Parity

## Phase 1: Interactive Search Wiring & Series Detail Enrichment
> **BLOCKED BY**: "Wire Interactive Search to Real Backend" requires `prowlarr_parity Phase 1` (search aggregation backend must return real results from indexers). Series detail enrichment tasks have no cross-track dependency and can start immediately.
> **SOFT DEPENDENCY**: Custom format score display on releases is additive — wire once `cross_cutting_parity Phase 1` delivers `CustomFormatScoringEngine`.

- [x] Task: Wire Interactive Search to Real Backend
    - [ ] Sub-task: Write tests — verify InteractiveSearchModal calls `POST /api/releases/search` with series/episode context and renders release candidates.
    - [ ] Sub-task: Write tests — verify grab action calls `POST /api/releases/grab` and shows success/error toast.
    - [x] Sub-task: Update InteractiveSearchModal to call real search API with `tvdbId`, `seasonNumber`, `episodeNumber` params.
    - [x] Sub-task: Render release candidate rows with quality, size, seeders, age, indexer, protocol icon.
    - [x] Sub-task: Implement grab button per release calling grab endpoint with `guid`, `indexerId`.
    - [x] Sub-task: Add season-level search (search all episodes in season).
- [x] Task: Enrich Series Detail Page Metadata
    - [ ] Sub-task: Write tests — verify genres, network, tags, external links render on series detail.
    - [ ] Sub-task: Write tests — verify episode air dates display in episode list.
    - [ ] Sub-task: Display genres as badges on series detail page.
    - [x] Sub-task: Display network name and external links (IMDB, TVDB) as icon buttons.
    - [x] Sub-task: Show tags on series detail (read from series data).
    - [x] Sub-task: Add alternate titles section (collapsible).
    - [x] Sub-task: Display episode air dates in episode table rows.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Season Pass & Advanced Monitoring

- [x] Task: Build Season Pass Backend
    - [ ] Sub-task: Write tests — verify `PUT /api/series/:id/monitoring` accepts monitoring type and updates series + episodes accordingly.
    - [ ] Sub-task: Write tests — verify monitoring types: all, none, firstSeason, lastSeason, latestSeason, pilotOnly correctly toggle episode monitored flags.
    - [x] Sub-task: Add `PUT /api/series/:id/monitoring` endpoint accepting `{ monitoringType: string }`.
    - [x] Sub-task: Implement monitoring strategy logic in service layer (map type to episode monitored flags).
- [x] Task: Build Season Pass UI
    - [ ] Sub-task: Write tests — verify Season Pass page renders series list with per-season checkboxes.
    - [ ] Sub-task: Write tests — verify monitoring strategy dropdown applies changes via API.
    - [x] Sub-task: Create `/library/series/seasonpass` page.
    - [x] Sub-task: Render series list with expandable season rows and checkbox toggles.
    - [x] Sub-task: Add monitoring strategy dropdown per series (All, None, First Season, Last Season, Latest, Pilot).
    - [x] Sub-task: Wire strategy selection to `PUT /api/series/:id/monitoring`.
    - [x] Sub-task: Add bulk series selection with "Apply to Selected" action.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Series Bulk Editor

- [x] Task: Build Bulk Edit Backend
    - [x] Sub-task: Write tests — verify `PUT /api/series/bulk` updates quality profile, monitored, root folder, tags for multiple series.
    - [x] Sub-task: Write tests — verify tag operations (add/remove) work correctly in bulk.
    - [x] Sub-task: Add `PUT /api/series/bulk` endpoint accepting `{ seriesIds: number[], changes: { qualityProfileId?, monitored?, rootFolderPath?, addTags?, removeTags? } }`.
    - [x] Sub-task: Implement bulk update in repository layer with transaction.
- [x] Task: Build Bulk Editor UI
    - [x] Sub-task: Write tests — verify bulk editor page renders series selection and edit form.
    - [x] Sub-task: Write tests — verify preview shows pending changes before apply.
    - [x] Sub-task: Create `/library/series/editor` page or modal accessible from series list toolbar.
    - [x] Sub-task: Add multi-select mode to series list (checkbox column).
    - [x] Sub-task: Build edit form: quality profile dropdown, monitored toggle, root folder selector, tag editor.
    - [x] Sub-task: Show preview of changes before applying.
    - [x] Sub-task: Wire apply button to `PUT /api/series/bulk`.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Manual Import & Organize/Rename

- [x] Task: Build Import/Organize Backend
    - [ ] Sub-task: Write tests — verify `POST /api/series/import/scan` scans directory and returns matched/unmatched files.
    - [ ] Sub-task: Write tests — verify `POST /api/series/organize/preview` returns before/after paths.
    - [ ] Sub-task: Write tests — verify `PUT /api/series/organize/apply` renames files on disk.
    - [x] Sub-task: Implement directory scan service: list media files, attempt series/episode matching via filename parsing.
    - [x] Sub-task: Implement organize preview service: apply naming pattern to matched files, return old/new path pairs.
    - [x] Sub-task: Implement organize apply service: rename files on disk, update database paths.
    - [x] Sub-task: Add naming pattern configuration to settings (series folder format, episode file format).
- [x] Task: Build Manual Import UI
    - [ ] Sub-task: Write tests — verify import page shows scanned files with match status.
    - [ ] Sub-task: Write tests — verify user can override match and trigger import.
    - [x] Sub-task: Create manual import page or modal (path input, scan button).
    - [x] Sub-task: Display scanned files with: filename, detected series/episode, match confidence, status.
    - [x] Sub-task: Allow manual match override (search series, select episode).
    - [x] Sub-task: Quality and language override dropdowns per file.
    - [x] Sub-task: Import button to move/copy files and update database.
- [x] Task: Build Organize/Rename Preview UI
    - [ ] Sub-task: Write tests — verify rename preview modal shows before/after paths.
    - [x] Sub-task: Create organize preview modal showing before → after file paths.
    - [x] Sub-task: Add "Organize" button to series detail toolbar and bulk editor.
    - [x] Sub-task: Wire apply button to organize endpoint.
- [x] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)

## Phase 5: Advanced Filtering & List Enhancements

- [ ] Task: Implement Custom Filters
    - [ ] Sub-task: Write tests — verify filter builder creates, saves, loads, and deletes named filters.
    - [ ] Sub-task: Write tests — verify filters correctly narrow series list results.
    - [ ] Sub-task: Backend: `GET/POST/PUT/DELETE /api/filters` for persisting named filters (Prisma model: CustomFilter with JSON conditions field).
    - [ ] Sub-task: Build FilterBuilder component: condition rows (field, operator, value), add/remove rows.
    - [ ] Sub-task: Add filter dropdown to series list toolbar (saved filters + "Custom" option opening builder).
    - [ ] Sub-task: Apply filters to series list query (client-side or backend query params).
- [ ] Task: Add Table Column Customization
    - [ ] Sub-task: Write tests — verify column visibility toggles persist and apply to table.
    - [ ] Sub-task: Add column picker dropdown to series table toolbar.
    - [ ] Sub-task: Persist column preferences to localStorage.
    - [ ] Sub-task: Show/hide columns dynamically based on preferences.
- [ ] Task: Add Jump Bar Navigation
    - [ ] Sub-task: Write tests — verify jump bar renders A-Z links and scrolls/filters to letter.
    - [ ] Sub-task: Build JumpBar component (A-Z + # for numeric + All).
    - [ ] Sub-task: Wire jump bar selection to filter series list by first letter.
    - [ ] Sub-task: Add to series list page (above table, below toolbar).
- [ ] Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md)
