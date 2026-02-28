# Spec: Media Detail Pages & Library Enrichment

## Overview
Provide a full-detail view for every item in the library (movies and TV shows),
populate TV season/episode data eagerly when a series is added to Wanted, and
repurpose the "Download Clients" settings page into a unified "Download Client"
configuration panel for the integrated torrent engine.

## Functional Requirements

### 1. Eager Season/Episode Population (TV)
- When a TV series is successfully added via POST /api/wanted, immediately fetch
  full season and episode data from SkyHook for that series.
- Persist Season and Episode records to the existing DB models.
- If a season or episode already exists (re-add scenario), upsert rather than error.
- Failed episode fetch must not roll back the series creation — log the error and
  continue; the detail page will surface incomplete data gracefully.

### 2. Movie Detail Page (`/movies/:id`)
- Route is reachable by clicking any movie card in the library.
- Displays: poster, title, year, overview, genres, status badge.
- Displays: quality profile (read), monitored toggle.
- Actions: toggle monitored, change quality profile (dropdown), remove from library
  (with confirmation dialog).

### 3. TV Series Detail Page (`/series/:id`)
- Route is reachable by clicking any TV card in the library.
- Header: poster, title, year, overview, network, status badge.
- Header: quality profile (read), monitored toggle (series level).
- Season list: each season shows season number, episode count, air date range,
  and a monitored toggle for the whole season.
- Episode list: expanding a season reveals its episodes, each showing episode
  number, title, air date, and an individual monitored toggle.
- Actions (series level): toggle monitored, change quality profile, remove from
  library (with confirmation).
- Actions (season level): toggle monitored for all episodes in that season.
- Actions (episode level): toggle monitored for individual episode.

### 4. Download Client Settings Page
- Rename nav entry and page title from "Download Clients" to "Download Client".
- Replace the multi-client CRUD list with a single-instance settings form.
- Settings exposed:

  **Locations**
  - Incomplete directory (path string + file/folder selector, required)
  - Complete directory (path string + file/folder selector, required)
  Torrents download to the incomplete directory; the engine moves them to the
  complete directory on finish. The importer will poll the complete directory.

  **Bandwidth**
  - Max download speed (KB/s, 0 = unlimited)
  - Max upload speed (KB/s, 0 = unlimited)

  **Queue**
  - Max active downloads (integer, 0 = unlimited)

  **Seeding**
  - Seed ratio limit (float, 0 = unlimited)
  - Seed time limit (minutes, 0 = unlimited)
  - When limit reached: Pause torrent / Remove torrent (exclusive choice)

- Settings are persisted to the database via AppSettingsRepository (torrentLimits
  JSON column — no schema migration required).
- On save, apply speed limits immediately via the existing
  PATCH /api/torrents/speed-limits endpoint.
- Incomplete and complete directories are used by the torrent engine and importer
  in subsequent tracks.

## Non-Functional Requirements
- Detail pages must handle missing/partial data gracefully (e.g. no poster, no
  overview, episodes still fetching).
- Episode population runs server-side after the wanted item is committed; it
  must not block the POST /api/wanted response.
- All new API endpoints follow the existing contract pattern (sendSuccess /
  sendPaginatedSuccess).

## Acceptance Criteria
- [ ] Clicking a movie card navigates to /movies/:id and shows full detail.
- [ ] Clicking a TV card navigates to /series/:id and shows full detail with
      seasons and episodes.
- [ ] Adding a TV series via POST /api/wanted triggers background episode fetch;
      seasons and episodes are present in the DB afterwards.
- [ ] Monitored can be toggled at series, season, and episode level.
- [ ] Quality profile can be changed from the detail page.
- [ ] Remove from library works with confirmation and redirects to library.
- [ ] Download Client settings page saves and persists all eight settings.
- [ ] Speed limits are applied immediately on save.
- [ ] Torrents added without an explicit path default to the incomplete directory.
- [ ] "Download Clients" label is gone everywhere in the UI.

## Out of Scope
- Automatic RSS-driven wanted list updates
- Triggering a torrent search from the detail page (next track)
- File/episode import and renaming
- Cast/crew information
- Trailer or external link embedding
- Connection/protocol settings (DHT, PEX, encryption, port)
