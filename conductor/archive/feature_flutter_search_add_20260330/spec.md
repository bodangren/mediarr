# Spec: Flutter Search & Add Media

## Context

The Flutter client can browse the existing library (movies and series screens) but has
no way to discover or add new media. Users must switch to the React SPA to search for
movies/shows and add them to the wanted list. For a living-room TV experience, this is
a critical gap — the user should be able to search and add from the couch.

The server already has comprehensive search endpoints:
- `GET /api/search?query=...` — returns results from indexers
- `POST /api/movies` — add a movie to the library
- `POST /api/series` — add a series to the library
- `POST /api/search/grab/:releaseId` — grab a specific release

## Requirements

### Search Screen
1. New `SearchScreen` with a search bar at top (auto-focused for D-pad/keyboard).
2. Results displayed as a grid of cards (poster, title, year, type badge).
3. Each result tappable — opens a detail sheet/modal showing metadata, available
   releases, and an "Add to Library" button.

### Media Detail
4. `MovieDetailScreen` and `SeriesDetailScreen` already exist but need a "Search & Grab"
   action — when media is in "wanted" state, show available releases ranked by score.
5. One-tap grab on a release calls `POST /api/search/grab/:releaseId`.

### Add to Library
6. "Add to Library" calls the server add endpoint with default quality profile and
   root folder (from smart defaults). Shows confirmation toast.
7. After adding, the detail screen shows the media's current status (wanted,
   downloading, downloaded).

### Navigation
8. Add "Search" to the bottom navigation bar / sidebar in `LeanbackScaffold`.
9. Search screen accessible from both the main nav and inline search on library screens.

## Acceptance Criteria

- Search screen accepts text input, shows results as poster grid.
- Tapping a result opens detail sheet with metadata and releases.
- "Add to Library" adds media with default profile/folder.
- "Grab" on a release triggers download.
- Status updates reflect in the UI after add/grab.
- Search is accessible from main navigation.
- All new screens have widget tests.
- `cd clients/mediarr-client && flutter test` — all pass.
