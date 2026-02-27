# Spec: Radarr Feature Parity

## Overview

Close all remaining gaps between the Radarr reference application and mediarr's movie management capabilities. The gap analysis (2026-02-17) identified missing features in collections CRUD, movie bulk editing, file organize/rename, interactive search, missing settings pages, and interactive import.

## Functional Requirements

### FR-1: Collections Management (Full CRUD)
- Replace stub operations with real backend calls for collections.
- Edit collection: update monitored status, quality profile, root folder.
- Delete collection (remove from tracking, optionally delete files).
- Search within a collection.
- Progress tracking: show "X of Y movies" per collection.
- Filter and sort collections list.
- Backend: `GET/PUT/DELETE /api/collections/:id`, `POST /api/collections/:id/search`.

### FR-2: Movie Bulk Editor (Mass Editor)
- Dedicated bulk editor UI accessible from movie library.
- Select multiple movies and apply batch changes: quality profile, monitoring, minimum availability, root folder, tags.
- Preview changes before applying.
- Organize files action for selected movies.
- Backend: `PUT /api/movies/bulk` endpoint.

### FR-3: Organize / Rename System
- Preview file organization before applying with before/after display.
- Apply naming conventions (configurable format patterns).
- Organize entire library or selected movies.
- Custom naming pattern editor in settings.
- Backend: `POST /api/movies/organize/preview`, `PUT /api/movies/organize/apply`.

### FR-4: Interactive Search Modal (Full Implementation)
- Wire existing modal shell to real search backend.
- Display release candidates with: name, quality, size, seeders, protocol, age, indexer.
- Filter results by quality, language, indexer.
- Sort by multiple criteria.
- Override match (rename parsing) capability.
- Grab/download directly from modal.
- Backend: relies on Prowlarr parity track for search execution.

### FR-5: Missing Settings Pages
Complete the 6 missing Radarr settings pages:
- **Media Management**: File naming patterns, permissions, root folders, recycling bin config.
- **Quality Definitions**: Quality size limits per quality type.
- **Custom Formats**: Rule-based release format scoring (delegates to cross-cutting track for the engine, this track builds the UI).
- **Import Lists**: External list configuration (delegates to cross-cutting track for the framework, this track builds the movie-specific UI).
- **Metadata**: NFO file generation options, metadata consumers.
- **Tags**: Tag management with detail modal showing tag usage.

### FR-6: Interactive Import
- Import page to scan downloads folder for unmatched movie files.
- Manual matching to movies with search.
- Override quality and language on import.
- Bulk import support.
- Backend: `POST /api/movies/import/scan`, `POST /api/movies/import/apply`.

### FR-7: Movie Detail Enrichment
- Display full cast and crew.
- Show alternate titles.
- Detailed quality/custom format information.
- Audio track and subtitle file details.
- Movie history timeline on detail page.

## Non-Functional Requirements

- All new endpoints must have >80% test coverage.
- Collection operations must handle collections with 20+ movies.
- Bulk operations must handle 200+ movies.
- Responsive mobile layout for all new pages.

## Acceptance Criteria

1. Collections page supports full CRUD with progress tracking and filtering.
2. Movie bulk editor allows batch changes to profile, monitoring, availability, path, tags.
3. Organize preview shows before/after paths; apply renames files on disk.
4. Interactive search shows real results with filtering, sorting, and grab.
5. All 6 missing settings pages are functional (not stubs).
6. Interactive import scans, matches, and imports movie files.
7. Movie detail shows cast, alternate titles, quality info, and history.

## Out of Scope

- Custom formats scoring engine (cross_cutting_parity track).
- Import lists framework (cross_cutting_parity track).
- Discover/recommendations algorithm improvements.
