# Specification: Track 4 - TV Management Module (Sonarr Layer)

## Overview
This track implements the TV management logic for Mediarr, mimicking Sonarr's core functionality. It focuses on the lifecycle of series tracking, from metadata acquisition and library organization to discovery and automated downloading via the unified indexer and torrent engines.

## Functional Requirements
### 1. Series & Episode Management
- **Metadata Integration:** Fetch series, season, and episode data from external providers (TMDB/TVDB).
- **Data Model:** Implement `Series`, `Season`, and `Episode` models with status tracking (Monitored/Unmonitored).
- **Quality Profiles:** Support for TV-specific quality profiles (resolution, source, codec preferences).

### 2. Library & File Organization
- **Local Scanning:** Scan the root media folder to identify existing episodes and match them to the database.
- **Import Logic:** Automatically move/rename files from the torrent engine's "complete" directory to the organized library structure.
- **Renaming Engine:** Support for "Convention over Configuration" renaming patterns (e.g., `Series Title/Season XX/Series Title - SXXEXX - Episode Title.ext`).
- **Metadata Generation:** Create local `.nfo` files and download posters/banners/fanart.

### 3. Search & Discovery
- **Wanted Dashboard:** A centralized view of monitored but missing episodes.
- **Manual/Interactive Search:** Trigger API searches across configured indexers for specific episodes or series, with a manual release selection UI.
- **Auto-Search on Add:** Option to trigger a search for all monitored episodes immediately upon adding a series.
- **RSS Integration:** Hook into the `RssSyncService` to automatically trigger downloads for newly released monitored episodes.

## Non-Functional Requirements
- **Performance:** Efficient background scanning for large libraries without blocking the UI.
- **Consistency:** Ensure database state reflects the actual file system state.
- **Security:** Sanitize file paths and handle permissions for library directories.

## Acceptance Criteria
- Users can add a series via search and have metadata/episodes populated.
- Mediarr correctly identifies which episodes are already on disk.
- Adding a "Wanted" series triggers a search through indexers and sends the best match to the Torrent Engine.
- Files are automatically moved and renamed upon download completion.
- The "Wanted" list accurately updates as files are added or removed.

## Out of Scope
- Advanced series calendar view (postponed to Track 7: Unified UI).
- Mass series editor/importer (bulk update functionality).
- Series-specific notification settings (Webhooks/Discord).
