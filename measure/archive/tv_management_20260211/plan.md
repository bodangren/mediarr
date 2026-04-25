# Implementation Plan: Track 4 - TV Management Module (Sonarr Layer)

## Phase 1: Data Model & Provider Integration
Establish the database foundation and the connection to external metadata providers.

- [x] Task: Write Tests: Verify `Series`, `Season`, and `Episode` models can be created and queried with correct relations. (9c44836)
- [x] Task: Implement Prisma schema updates for TV entities (Series, Season, Episode, QualityProfile). (9c44836)
- [x] Task: Write Tests: Verify `MetadataProvider` can fetch series and episode data from TMDB/TVDB and map it to internal models. (7f374e5)
- [x] Task: Implement `MetadataProvider` service (abstraction over TMDB/TVDB). (7f374e5)

## Phase 2: Library Scanning & File Organization
Implement the logic to discover existing media and organize new downloads.

- [x] Task: Write Tests: Verify `LibraryScanner` can identify existing episode files on disk and match them to database records. (ab142b3)
- [x] Task: Implement `LibraryScanner` service. (ab142b3)
- [x] Task: Write Tests: Verify `Organizer` can rename and move files based on "Convention over Configuration" patterns. (5c382a2)
- [x] Task: Implement `Organizer` service for file renaming and directory management. (5c382a2)
- [x] Task: Write Tests: Verify `MetadataGenerator` creates valid `.nfo` files and saves artwork correctly. (ee02d25)
- [x] Task: Implement `MetadataGenerator` for local assets. (ee02d25)

## Phase 3: Import & Lifecycle Management
Connect the TV module to the Torrent Engine for automated importing.

- [x] Task: Write Tests: Verify `ImportManager` correctly identifies completed TV torrents and triggers the organization process. (553137f)
- [x] Task: Implement `ImportManager` to bridge `TorrentManager` and `Organizer`. (553137f)
- [x] Task: Write Tests: Verify that updating an episode's status (Monitored/Unmonitored) correctly impacts search behavior. (da3357a)
- [x] Task: Implement internal API endpoints for series and episode management. (da3357a)

## Phase 4: Search & Discovery Engine
Build the automated and manual search capabilities.

- [x] Task: Write Tests: Verify `WantedService` returns a correct list of monitored but missing episodes. (d689ece)
- [x] Task: Implement `WantedService` logic. (d689ece)
- [x] Task: Write Tests: Verify `TvSearchService` can translate an episode request into indexer queries and rank results by quality profile. (36005f2)
- [x] Task: Implement `TvSearchService` (Manual and Interactive search). (36005f2)
- [x] Task: Write Tests: Verify `RssTvMonitor` correctly triggers downloads for new releases that match monitored episodes. (9012e72)
- [x] Task: Implement `RssTvMonitor` to hook into `RssSyncService`. (9012e72)
