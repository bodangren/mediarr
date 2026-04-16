# Implementation Plan: Flutter Search & Add Media

## Phase 1 — Search Screen & API Integration

- [x] Task: Add `search(query: String)` method to `ApiClient` — calls `GET /api/search?query=<query>&type=movie,series`; returns list of search results with title, year, type, posterUrl, tmdbId/tvdbId
- [x] Task: Add `grabRelease(releaseId: String)` method to `ApiClient` — calls `POST /api/search/grab/:releaseId`
- [x] Task: Add `addMovie(tmdbId, qualityProfileId, rootFolderPath)` and `addSeries(tvdbId, qualityProfileId, rootFolderPath)` methods to `ApiClient`
- [x] Task: Create `SearchScreen` — search bar (TextField with auto-focus), results grid (GridView.builder with poster cards), loading/empty/error states
- [x] Task: Add `SearchScreen` to router at `/search` and to `LeanbackScaffold` bottom nav
- [x] Task: Write tests for `SearchScreen` — renders search bar, shows results, handles empty query, handles API error
- [x] Task: Conductor - Checkpoint Phase 1

## Phase 2 — Result Detail & Grab

- [x] Task: Create `SearchResultDetailSheet` — bottom sheet showing metadata (poster, overview, year, rating), list of available releases (title, quality, size, seeders, score), and "Grab" button per release
- [x] Task: Wire "Grab" button to `ApiClient.grabRelease()` — show loading spinner, success toast, navigate back
- [x] Task: Write tests for `SearchResultDetailSheet` — renders metadata, renders release list, grab button calls API
- [x] Task: Conductor - Checkpoint Phase 2

## Phase 3 — Add to Library & Status

- [x] Task: Add "Add to Library" button to `SearchResultDetailSheet` — calls `ApiClient.addMovie()` or `ApiClient.addSeries()` based on result type; uses default quality profile and root folder from server defaults
- [x] Task: After adding, update the detail sheet to show "Added — Status: Wanted" and a link to the media detail screen
- [x] Task: Write tests for add-to-library flow — button renders, calls correct API, shows success state
- [x] Task: Run `cd clients/mediarr-client && flutter test` — all pass (165 tests green)
- [x] Task: Conductor - Checkpoint Phase 3
