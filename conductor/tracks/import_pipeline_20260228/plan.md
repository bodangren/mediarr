# Implementation Plan: Import Pipeline & Root Folder Settings

---

## Phase 1: Settings > Clients — Complete Directory & Seed Controls [checkpoint: 75404df3]

### Backend — Verify API Coverage

- [x] Task: Confirm GET/PUT `/api/download-client` exposes complete directory and seed fields (84247b3d)
    - [x] Read `downloadClientRoutes.ts` and confirm `completeDirectory`, `seedRatioLimit`, `seedTimeLimitMinutes`, `seedLimitAction` are in the response/body schema
    - [x] If any fields are missing from the API schema, add them and write tests for the gap
    - [x] Confirm `TorrentManager.setDownloadPaths()` is called with the updated complete directory on PUT

### Frontend — Settings > Clients Seed & Complete Path UI

- [x] Task: Wire complete directory browser and seed controls into Settings > Clients (84247b3d)
    - [x] Write rendering tests: complete directory field renders with folder icon + Validate, seed ratio/time inputs render, seed action select renders, values persist after save
    - [x] Read current SettingsClientsPage (or equivalent in App.tsx) to understand the existing form structure
    - [x] Add **Complete Directory** path input with FilesystemBrowser + Validate button (same pattern as incomplete directory)
    - [x] Add **Seed Ratio Limit** numeric input (label: "Ratio Limit", hint: "0 = unlimited")
    - [x] Add **Seed Time Limit** numeric input (label: "Time Limit (minutes)", hint: "0 = unlimited")
    - [x] Add **Seed Limit Action** select (`pause` | `remove`)
    - [x] Wire all four fields into the existing save flow (GET on mount, PUT on save)

- [x] Task: Conductor - User Manual Verification 'Phase 1: Complete Directory & Seed Controls' (Protocol in workflow.md)

---

## Phase 2: Settings > Media — Movie & TV Root Folders

### Backend — Extend MediaManagementSettings

- [x] Task: Add `movieRootFolder` and `tvRootFolder` to MediaManagementSettings API (2e2bc2d1)
    - [x] Write unit tests: GET returns `movieRootFolder` and `tvRootFolder`; PUT saves them; fields default to empty string when not set
    - [x] Extend `MediaManagementSettings` interface and storage to include both fields
    - [x] Extend GET `/api/settings/media` response and PUT body schema to include both fields

- [x] Task: Default movie/series path to root folder on add (5211d0b9)
    - [x] Write unit tests: adding a movie with no explicit path sets `movie.path` to `{movieRootFolder}/{formatted title}`; adding series sets `series.path` similarly; if no root folder configured, path remains null
    - [x] In movie add handler: if `path` not provided and `movieRootFolder` is set, compute and set `movie.path`
    - [x] In series add handler: same logic for `tvRootFolder`

### Frontend — Settings > Media Root Folder UI

- [x] Task: Wire movie and TV root folder path browsers into Settings > Media (99b44fb3)
    - [x] Write rendering tests: movie root folder input with folder icon + Validate renders; TV root folder renders; values persist after save
    - [x] Add **Movie Root Folder** path input with FilesystemBrowser + Validate in Settings > Media
    - [x] Add **TV Root Folder** path input with FilesystemBrowser + Validate in Settings > Media
    - [x] Wire both into the existing GET/PUT settings/media save flow

- [x] Task: Conductor - User Manual Verification 'Phase 2: Movie & TV Root Folders' (Protocol in workflow.md)

---

## Phase 3: Import Pipeline Hardening

### Backend — ImportManager Verification & Tests

- [x] Task: Verify ImportManager is wired at startup and write unit tests
    - [x] Confirm `ImportManager` is instantiated and `initialize()` (or equivalent) is called during server startup in `createApiServer.ts` or `index.ts`
    - [x] Write unit tests covering:
        - Movie import success: `torrent:completed` event → file scanned → matched to movie → `organizeMovieFile()` called → `MediaFileVariant` created → `MOVIE_IMPORTED` activity event logged
        - Episode import success: matched to series/episode → `organizeFile()` called → `Episode.path` updated → `SERIES_IMPORTED` activity logged
        - No match found: `IMPORT_FAILED` activity event logged with "no match" reason; process does not throw
        - Organizer throws: error caught → `IMPORT_FAILED` logged; other torrent processing unaffected
    - [x] Fix any gaps found during verification

### Backend — IMPORT_FAILED Activity Event

- [x] Task: Ensure IMPORT_FAILED events are logged with sufficient detail
    - [x] Confirm activity logger accepts `IMPORT_FAILED` event type with `details: { sourcePath, reason, torrentName }`
    - [x] Add `IMPORT_FAILED` to `ActivityEventBadge` config in the frontend (error color)
    - [x] Write test for badge rendering

- [x] Task: Add import retry and root-folder fallback hardening (f9e6274d)
    - [x] Write unit tests for fallback path resolution when `series.path` / `movie.path` is null during import
    - [x] In `ImportManager`, resolve missing series/movie paths from `/settings/media` root folders and persist resolved paths
    - [x] Add retry APIs:
      - `POST /api/activity/:id/retry-import` (retry from failed history entry)
      - `POST /api/torrents/:infoHash/retry-import` (retry from queue/completed torrent)
    - [x] Add frontend actions:
      - History: show `Retry Import` button for failed import events
      - Queue: show `Retry Import` button per torrent row
    - [x] Add route/component tests for retry actions

- [ ] Task: Conductor - User Manual Verification 'Phase 3: Import Pipeline Hardening' (Protocol in workflow.md)

---

## Phase 4: Seed Ratio Enforcement

### Backend — Ratio & Time Watcher

- [ ] Task: Implement seed limit enforcement in TorrentManager stats sync loop
    - [ ] Write unit tests covering:
        - Ratio trigger: torrent with `ratio >= seedRatioLimit` and action `pause` → `pauseTorrent()` called
        - Ratio trigger: action `remove` → `removeTorrent()` called, complete folder file deleted, activity logged
        - Time trigger: `completedAt` + `seedTimeLimitMinutes` elapsed → same pause/remove logic
        - No-op: `seedRatioLimit = 0` and `seedTimeLimitMinutes = 0` → no action taken
        - No-op: torrent not yet imported (`status != 'seeding'` or `completedAt` null) → no action taken
    - [ ] Add `checkSeedLimits(torrent)` method to `TorrentManager`
    - [ ] Call `checkSeedLimits()` for each seeding torrent in the stats sync loop after updating stats
    - [ ] On remove action: delete files from complete folder path, remove DB row, log `SEEDING_COMPLETE` activity event
    - [ ] Read effective limits from `TorrentLimitsSettings` (already stored in DB); fall back to `stopAtRatio`/`stopAtTime` on the torrent row if set

- [ ] Task: Conductor - User Manual Verification 'Phase 4: Seed Ratio Enforcement' (Protocol in workflow.md)
