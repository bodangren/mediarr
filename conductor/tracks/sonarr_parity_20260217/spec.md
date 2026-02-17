# Spec: Sonarr Feature Parity

## Overview

Close all remaining gaps between the Sonarr reference application and mediarr's TV series management capabilities. The gap analysis (2026-02-17) identified missing features in series bulk editing, season-level monitoring, manual file import/organize, interactive search integration, metadata display, and advanced filtering.

## Functional Requirements

### FR-1: Series Bulk Editor (Mass Editor)
- Provide a dedicated bulk editor UI accessible from the series list page.
- Support selecting multiple series and applying batch changes: quality profile, monitoring status, root folder path, tags (add/remove).
- Preview changes before applying.
- Backend: `PUT /api/series/bulk` endpoint accepting array of series IDs and fields to update.

### FR-2: Season Pass / Advanced Monitoring
- Dedicated Season Pass interface accessible from series management.
- Support monitoring strategies: All, None, First Season, Last Season, Latest Season, Pilot Only.
- Per-season monitoring toggles with checkbox UI.
- Bulk series monitoring changes from Season Pass view.
- Backend: `PUT /api/series/:id/monitoring` endpoint accepting monitoring type strategy.

### FR-3: Manual Import & File Organization
- Manual import page to scan a directory for unmatched media files.
- Match files to series/episodes with override capability.
- Organize/rename preview modal showing before/after file paths based on naming conventions.
- Apply rename operations.
- Backend: `POST /api/series/import` (scan), `POST /api/series/organize` (rename preview), `PUT /api/series/organize` (apply).

### FR-4: Interactive Search Wiring
- Wire existing InteractiveSearchModal to actual backend indexer search.
- Display real release candidates with quality, size, seeders, age, indexer source.
- Grab/download action per release.
- Episode-level and season-level search support.
- Backend: Ensure `POST /api/releases/search` actually queries configured indexers (not stubs).

### FR-5: Series Detail Metadata Enrichment
- Display genres, network, external links (IMDB, TVDB, Trakt) on series detail page.
- Show alternate titles.
- Show episode air dates in episode list.
- Display tags on series detail.

### FR-6: Advanced Filtering & List Enhancements
- Custom filter definitions on series list (save/load named filters).
- Filter by: status, quality profile, tags, network, genre.
- Table column customization (show/hide columns).
- Jump bar for alphabetical navigation.

## Non-Functional Requirements

- All new endpoints must have >80% test coverage.
- Bulk operations must handle 100+ series without timeout.
- UI must be responsive on mobile (stacking layouts, touch targets).

## Acceptance Criteria

1. User can select multiple series and batch-edit quality profile, monitoring, root folder, and tags.
2. Season Pass page allows setting monitoring strategies per-series and per-season.
3. User can scan a directory, match files to episodes, preview renames, and apply.
4. Interactive search returns real results from configured indexers and supports grab.
5. Series detail page shows genres, links, alternate titles, air dates, and tags.
6. Series list supports custom saved filters, column customization, and jump bar.

## Out of Scope

- Import lists (covered by cross_cutting_parity track).
- Custom formats (covered by cross_cutting_parity track).
- Parse module / scene name parsing utilities.
- Real-time SignalR-style updates (SSE already covers push needs).
