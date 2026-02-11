# Implementation Plan: Track 5 - Movie Management Module (Radarr Layer)

## Phase 1: Shared Media Refactor [checkpoint: 3726925]
Refactor the existing TV-centric database and services to support a unified media architecture.

- [x] Task: Write Tests: Verify `Media` base model and `MediaType` enum work correctly in Prisma. (5d74d3d)
- [x] Task: Refactor Prisma schema to introduce a shared `Media` structure and migrate existing TV data. (5d74d3d)
- [x] Task: Write Tests: Verify `MetadataProvider` can handle both Movie and TV requests via a unified interface. (5d74d3d)
- [x] Task: Refactor `MetadataProvider` and `BaseMedia` types to support polymorphic metadata fetching. (5d74d3d)
- [x] Task: Conductor - User Manual Verification 'Phase 1: Shared Media Refactor' (Protocol in workflow.md) (3726925)

## Phase 2: Movie Entity & Metadata Integration [checkpoint: 3726925]
Implement movie-specific data handling and availability monitoring.

- [x] Task: Write Tests: Verify `Movie` specialization can be saved and retrieved with movie-specific attributes (e.g., Digital Release date). (5d74d3d)
- [x] Task: Implement Movie-specific extensions to the `Media` model and update repositories. (5d74d3d)
- [x] Task: Write Tests: Verify availability logic correctly identifies "Released" or "Streaming" movies vs "In Cinemas". (5d74d3d)
- [x] Task: Implement availability checking logic in `MetadataProvider` and `SeriesService` (to be renamed to `MediaService`). (5d74d3d)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Movie Entity & Metadata Integration' (Protocol in workflow.md) (3726925)

## Phase 3: Movie Library Scanning & Organization [checkpoint: 3726925]
Adapt the library management system to handle movie folder structures and file colocation.

- [x] Task: Write Tests: Verify `Organizer` creates the `Movie Title (Year)/` structure and colocates metadata files. (5d74d3d)
- [x] Task: Update `Organizer` service to handle movie-specific pathing and colocation rules. (5d74d3d)
- [x] Task: Write Tests: Verify `LibraryScanner` can identify existing movie files and match them to `Media` records. (5d74d3d)
- [x] Task: Update `LibraryScanner` to support movie directory structures. (5d74d3d)
- [x] Task: Conductor - User Manual Verification 'Phase 3: Movie Library Scanning & Organization' (Protocol in workflow.md) (3726925)

## Phase 4: Movie Search & Discovery [checkpoint: 3726925]
Enable automated and manual searching for movies using the shared indexer infrastructure.

- [x] Task: Write Tests: Verify `TvSearchService` (to be `MediaSearchService`) correctly translates movie-specific queries. (5d74d3d)
- [x] Task: Refactor `SearchService` to handle movie searches and ranking based on shared quality profiles. (5d74d3d)
- [x] Task: Write Tests: Verify `RssTvMonitor` (to be `RssMediaMonitor`) identifies and triggers downloads for movie releases. (5d74d3d)
- [x] Task: Update RSS monitoring logic to include movie-specific filters (Quality, Availability). (5d74d3d)
- [x] Task: Conductor - User Manual Verification 'Phase 4: Movie Search & Discovery' (Protocol in workflow.md) (3726925)
