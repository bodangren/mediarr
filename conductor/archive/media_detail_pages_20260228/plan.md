# Implementation Plan: Media Detail Pages & Library Enrichment

## Phase 1: Integrated Downloader Settings [checkpoint: f4377e6]
> Goal: Extend TorrentLimitsSettings with the new fields and replace the
> multi-client download routes with a single-instance settings API.

- [x] c7ca3e0 Task: Extend TorrentLimitsSettings and AppSettingsRepository
    - [x] Add fields to TorrentLimitsSettings interface in AppSettingsRepository.ts.
    - [x] Update DEFAULT_APP_SETTINGS with sensible defaults
          (empty strings for paths, 0 for limits, 'pause' for action).
    - [x] Ensure existing AppSettingsRepository.get() and update() handle
          the new fields correctly (JSON merge).
- [x] aea0634 Task: Refactor downloadClientRoutes.ts to integrated downloader settings
    - [x] Replace multi-client CRUD routes with GET /api/download-client and
          PUT /api/download-client backed by AppSettingsRepository.
- [x] Task: Conductor - User Manual Verification 'Phase 1' ✓

## Phase 2: Eager TV Episode Population [checkpoint: 78418fd]
> Goal: When a TV series is added to Wanted, fetch and persist its full
> season/episode data from SkyHook in the background.

- [x] 0951113 Task: Add Season/Episode upsert to MediaRepository
    - [x] Implement upsertSeasonsAndEpisodes in MediaRepository using Prisma
          upsert for Season (unique: seriesId+seasonNumber) and Episode
          (unique: tvdbId).
    - [x] Fixed SkyHook field names: ep.tvdbId??ep.id, ep.airDate??ep.firstAired
- [x] 5bc1a7b Task: Hook episode population into POST /api/wanted
    - [x] In mediaRoutes.ts, after the series is committed, fire an async
          call to MetadataProvider.getSeriesDetails(tvdbId) then
          upsertSeasonsAndEpisodes — does not await before sending the response.
    - [x] Log errors from the background fetch without surfacing them to the client.
- [x] Task: Conductor - User Manual Verification 'Phase 2' ✓

## Phase 3: Frontend — Detail Pages
> Goal: Movie and TV detail pages reachable from library cards.

- [x] Task: Make library cards navigable
    - [x] Wrap movie and TV cards with router Link.
    - [x] Added /library/movies/:id and /library/tv/:id routes to the router.
- [x] Task: Movie detail page (/library/movies/:id)
    - [x] MovieDetailPage: fetch GET /api/movies/:id, render header with
          poster + metadata, monitored toggle, quality profile dropdown,
          remove button with confirmation.
    - [x] Fixed movieSchema: all optional fields use .nullish() not .optional().
- [x] Task: TV series detail page (/library/tv/:id)
    - [x] SeriesDetailPage: GET /api/series/:id with seasons+episodes, header,
          series/season/episode monitored toggles, quality profile dropdown,
          remove button.
    - [x] Fixed season PATCH to also update Season.monitored; return {monitored}.
    - [x] Fixed episode checkbox nullish guard.
- [x] Task: Conductor - User Manual Verification 'Phase 3' ✓

## Phase 4: Frontend — Download Client Settings & Cleanup
> Goal: Repurpose the Download Clients page, remove all legacy multi-client UI.

- [x] 11018de Task: Rewrite Download Client settings page
    - [x] Single-instance settings form with all 8 fields.
    - [x] On save, calls PUT /api/download-client and shows success toast.
- [x] 384299d Task: Rename and clean up Download Clients references
    - [x] Nav label, page title, and route updated to "Download Client".
    - [x] Dead multi-client code removed.
- [x] Task: Conductor - User Manual Verification 'Phase 4' ✓

## Bug Fixes During Verification [e7d1149, 7e6b44a, ecbab40]
- Fixed FK cascade for series delete: Prisma libquery doesn't fire SQLite
  ON DELETE CASCADE reliably; now explicitly deletes episodes/seasons first.
- Removed assertNoActiveTorrents from delete routes (blocked all deletes).
- Added onDelete: Cascade to Season.series and Episode.series in schema.
- Media record cleaned up on series/movie delete.
