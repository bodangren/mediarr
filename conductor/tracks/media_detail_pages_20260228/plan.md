# Implementation Plan: Media Detail Pages & Library Enrichment

## Phase 1: Integrated Downloader Settings
> Goal: Extend TorrentLimitsSettings with the new fields and replace the
> multi-client download routes with a single-instance settings API.

- [x] c7ca3e0 Task: Extend TorrentLimitsSettings and AppSettingsRepository
    - [ ] Write failing unit tests for the new fields (incompleteDirectory,
          completeDirectory, seedRatioLimit, seedTimeLimit, seedLimitAction)
          and their defaults.
    - [ ] Add fields to TorrentLimitsSettings interface in AppSettingsRepository.ts.
    - [ ] Update DEFAULT_APP_SETTINGS with sensible defaults
          (empty strings for paths, 0 for limits, 'pause' for action).
    - [ ] Ensure existing AppSettingsRepository.get() and update() handle
          the new fields correctly (JSON merge).
    - [ ] Verify tests pass.
- [~] Task: Refactor downloadClientRoutes.ts to integrated downloader settings
    - [ ] Write failing integration tests for GET /api/download-client and
          PUT /api/download-client.
    - [ ] Replace multi-client CRUD routes with GET (reads torrentLimits from
          AppSettingsRepository) and PUT (validates and saves, then applies
          speed limits via torrentManager.setSpeedLimits if available).
    - [ ] Verify tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Eager TV Episode Population
> Goal: When a TV series is added to Wanted, fetch and persist its full
> season/episode data from SkyHook in the background.

- [x] 0951113 Task: Add Season/Episode upsert to MediaRepository
    - [x] Write failing unit tests for upsertSeasonsAndEpisodes(seriesId, details).
    - [x] Implement upsertSeasonsAndEpisodes in MediaRepository using Prisma
          upsert for Season (unique: seriesId+seasonNumber) and Episode
          (unique: tvdbId).
    - [x] Verify tests pass.
- [~] Task: Hook episode population into POST /api/wanted
    - [ ] Write failing integration tests: adding a TV series triggers a
          background SkyHook fetch and seasons/episodes appear in the DB.
    - [ ] In mediaRoutes.ts, after the series is committed, fire an async
          call to MetadataProvider.getSeriesDetails(tvdbId) then
          upsertSeasonsAndEpisodes — must not await before sending the response.
    - [ ] Log errors from the background fetch without surfacing them to the client.
    - [ ] Verify tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Frontend — Detail Pages
> Goal: Movie and TV detail pages reachable from library cards.

- [ ] Task: Make library cards navigable
    - [ ] Write failing UI tests: clicking a movie card navigates to /movies/:id,
          clicking a TV card navigates to /series/:id.
    - [ ] Wrap movie and TV cards in the Movies/TV pages with a router Link.
    - [ ] Add /movies/:id and /series/:id routes to the router.
    - [ ] Verify tests pass.
- [ ] Task: Movie detail page (/movies/:id)
    - [ ] Write failing UI tests for the movie detail page rendering poster,
          title, year, overview, genres, status, quality profile, and monitored
          toggle.
    - [ ] Implement MovieDetailPage: fetch GET /api/movies/:id, render header
          with poster + metadata, monitored toggle (PATCH /api/movies/:id/monitored),
          quality profile dropdown (PUT to update), and remove button with
          confirmation (DELETE /api/movies/:id → redirect to /movies).
    - [ ] Verify tests pass.
- [ ] Task: TV series detail page (/series/:id)
    - [ ] Write failing UI tests for the series detail page rendering header,
          season list, and episode list.
    - [ ] Implement SeriesDetailPage: fetch GET /api/series/:id (includes seasons
          + episodes), render header with poster + metadata, series-level monitored
          toggle and quality profile dropdown, season list with per-season monitored
          toggle, expandable episode list with per-episode monitored toggle, and
          remove button with confirmation.
    - [ ] Wire monitored toggles to existing PATCH endpoints
          (/api/series/:id/monitored, /api/series/:seriesId/seasons/:seasonNumber/monitoring,
          /api/episodes/:id).
    - [ ] Verify tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Frontend — Download Client Settings & Cleanup
> Goal: Repurpose the Download Clients page, remove all legacy multi-client UI.

- [ ] Task: Rewrite Download Client settings page
    - [ ] Write failing UI tests for the settings form fields and save action.
    - [ ] Replace the multi-client CRUD list with a single-instance settings
          form: incomplete directory (text + folder picker), complete directory
          (text + folder picker), max download speed, max upload speed, max active
          downloads, seed ratio limit, seed time limit, seed limit action
          (Pause / Remove).
    - [ ] On save, call PUT /api/download-client and show a success toast.
    - [ ] Verify tests pass.
- [ ] Task: Rename and clean up Download Clients references
    - [ ] Write failing UI tests asserting "Download Clients" label is absent.
    - [ ] Update nav label, page title, and route from "Download Clients" to
          "Download Client".
    - [ ] Remove DownloadClientItem type, downloadClientsApi module, and any
          dead imports.
    - [ ] Verify tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
