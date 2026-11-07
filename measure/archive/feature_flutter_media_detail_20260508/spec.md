# Flutter Media Detail Page

## Overview

Add dedicated movie and series detail screens to the Flutter living-room client. Users can currently browse the library (`LibraryScreen`) but cannot view rich metadata, manage episodes, or trigger actions (play, search, delete) from a focused detail view. This closes a critical UX gap between the SPA and the Flutter client.

## Problem Statement

The Flutter client supports discovery, library browsing, and playback, but lacks a detail surface equivalent to the SPA's `MovieDetailPage` and `SeriesDetailPage`. This forces users to switch to the web dashboard for:
- Reading synopsis, cast, and release year
- Viewing episode lists per season
- Triggering manual search or quality upgrade
- Deleting media from the library
- Managing monitoring status

## Solution

### Movie Detail Screen
- Full-screen scrollable view with backdrop + poster hero
- Metadata header: title, year, runtime, rating, genres, synopsis
- Action bar: Play, Search Upgrades, Delete, Toggle Monitored
- File info card: quality, size, path, audio/subtitle tracks
- "More Like This" horizontal list (reuse existing library fetch with genre filter)

### Series Detail Screen
- Same hero + metadata header as movie detail
- Season selector (dropdown or horizontal chips)
- Episode list with: episode number, title, air date, has-file indicator, quality badge
- Episode actions: Play, Search, Toggle Monitored (per-episode)
- Series-level action bar: Search All Missing, Toggle Series Monitored, Delete Series

### Shared Components
- `MediaHero`: backdrop image with gradient overlay, poster, title, quick actions
- `MetadataSection`: synopsis, cast chips, genre chips, rating/year row
- `ActionBar`: primary/secondary action buttons with confirmation for destructive actions
- `EpisodeList`: scrollable list with season grouping
- `FileInfoCard`: quality, path, size, audio/subtitle summary

### Backend Integration
- Reuse existing endpoints: `GET /api/movies/:id`, `GET /api/series/:id`, `POST /api/search`, `DELETE /api/movies/:id`, `DELETE /api/series/:id`
- Ensure the typed series response from the parallel API-typing work is consumed here (no `dynamic` casts)

## Acceptance Criteria

- [ ] `MovieDetailScreen` renders all metadata, file info, and actions
- [ ] `SeriesDetailScreen` renders seasons, episodes, and series-level actions
- [ ] Tapping a library item navigates to the correct detail screen
- [ ] Play action routes to the existing video player with correct mediaId
- [ ] Search action triggers manual search and shows progress/snackbar
- [ ] Delete action shows confirmation dialog and refreshes library on success
- [ ] Widget tests cover rendering, navigation, and action callbacks for both screens
- [ ] Flutter test suite green; no new lint warnings

## Out of Scope

- In-app subtitle management (Flutter already has parity; detail screen links to it)
- Editing metadata or renaming files (read-only detail view for this track)
- Cast/crew deep-links to external sources
- User reviews or ratings
