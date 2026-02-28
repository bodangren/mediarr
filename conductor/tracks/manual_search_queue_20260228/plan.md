# Implementation Plan: Manual Search, Queue Monitoring & Quality Profile Enhancements

---

## Phase 1: Quality Profile Presets & Drag-to-Reorder [checkpoint: 891f7baa]

### Backend — Seed Standard Profiles

- [x] Task: Extend quality profile seed with six standard presets [2939439]
    - [x] Write unit tests for `seedQualityProfiles` covering all six preset names, their quality sets, cutoff IDs, and idempotency (re-seed = no duplicates)
    - [x] Add `seedQualityProfiles()` to `server/src/seeds/qualities.ts` implementing Any, SD, HD-720p, HD-1080p, Ultra-HD, HD-720p/1080p using existing `QUALITY_DEFINITIONS` IDs
    - [x] Wire `seedQualityProfiles()` call into server startup alongside `seedQualityDefinitions()`
    - [x] Verify existing profiles with matching names are upserted, not duplicated

### Frontend — Drag-to-Reorder in Profile Editor

- [x] Task: Add drag-to-reorder quality list to profile editor — reworked [c423b45]
    - [x] Read `SettingsProfilesPage` in `App.tsx` fully, then add an "Edit" button to each profile row
    - [x] "Edit" button opens `AddProfileModal` wired to qualityProfileApi.update
    - [x] Modal uses the real API data model: `items: QualityProfileRule[]` and `cutoff: number` (quality ID)
    - [x] "Add" button retains existing template-copy flow; editing works via Edit button
    - [x] `SettingsProfilesPage.test.tsx` created — 6 tests exercising the full edit flow
    - [x] `AddProfileModal.test.tsx` rewritten with real API type fixtures (11 tests)

- [x] Task: Conductor - User Manual Verification 'Phase 1: Quality Profile Presets & Drag-to-Reorder' (Protocol in workflow.md)

---

## Phase 2: Series Interactive Search Modal [checkpoint: 9e10942]

### Backend — Series Release Search API Validation

- [x] Task: Confirm series release search handles tvdbId + season + episode params [4ef84df]
    - [x] Write tests in `seriesRoutes.search.test.ts` asserting that `POST /api/releases/search` correctly passes `tvdbId`, `season`, and `episode` to `MediaSearchService.searchAllIndexers`
    - [x] Patch any gaps found (ensure `season` and `episode` are forwarded when present)

### Frontend — SeriesInteractiveSearchModal

- [x] Task: Build `SeriesInteractiveSearchModal` component [eb6cba0]
    - [x] Write rendering tests: modal renders with level selector, season/episode selectors appear at correct levels, results table renders, Grab button triggers API call
    - [x] Create `app/src/components/series/SeriesInteractiveSearchModal.tsx` with:
        - Search level selector (Series / Season / Episode)
        - Season number selector (visible at Season + Episode levels)
        - Episode number selector (visible at Episode level)
        - Results table (Source, Title, Quality, Size, Peers, Age, Score, Actions) matching movie modal pattern
        - Quality + indexer filter controls; sort controls
        - One-click Grab → `releaseApi.grabRelease(guid, indexerId)`
        - Approved/rejected visual distinction; inline rejection reasons
        - Auto-search on open
    - [x] Add `seriesApi.searchReleases()` client method if not already present

### Frontend — Series Detail Toolbar Wiring

- [x] Task: Wire series detail toolbar "Search" button and season/episode actions [240e94b]
    - [x] Write tests asserting toolbar Search button renders and opens `SeriesInteractiveSearchModal`
    - [x] Open `SeriesInteractiveSearchModal` from the series detail toolbar Search button at Series level
    - [x] Add "Search Season" action to season header rows → modal at Season level with season pre-filled
    - [x] Add "Search Episode" action to episode rows → modal at Episode level with season + episode pre-filled

- [x] Task: Conductor - User Manual Verification 'Phase 2: Series Interactive Search Modal' (Protocol in workflow.md)

---

## Phase 3: Download Location File Browser

### Backend — Filesystem API

- [x] Task: Implement `GET /api/filesystem` route [ed4aae3]
    - [x] Write unit tests for filesystem route covering: list root, list subdirectory, read/write permission flags, path traversal attempt rejected, non-existent path returns 404
    - [x] Create `server/src/api/routes/filesystemRoutes.ts` with `GET /api/filesystem?path=<dir>`:
        - Returns `{ path, entries: [{ name, path, isDirectory, readable, writable }] }`
        - Resolves real path with `fs.realpath`; rejects if resolved path escapes a configured safe root
        - Returns root listing (`/` on Linux) when no `path` param given
    - [x] Register route in `createApiServer.ts`
    - [x] Add route to `routeMap.ts`

### Frontend — Path Browser Modal & Validated Input

- [x] Task: Build `FilesystemBrowser` modal component [1c67890]
    - [x] Write rendering tests: renders directory list, breadcrumb navigation, selection updates parent
    - [x] Create `app/src/components/primitives/FilesystemBrowser.tsx` — navigable directory tree modal with breadcrumb trail and folder selection
    - [x] Add `filesystemApi.ts` client with `list(path?: string)` method

- [~] Task: Wire file browser into Download Client settings path input
    - [ ] Write tests asserting folder icon opens browser, Validate button calls API and shows correct status icons
    - [ ] Replace plain path text input in download client settings with composite: text field + folder icon button (opens `FilesystemBrowser`) + Validate button
    - [ ] Validate button calls `filesystemApi.list(currentPath)` and renders: ✓ Writable / ⚠ Read-only / ✗ Not found

- [ ] Task: Conductor - User Manual Verification 'Phase 3: Download Location File Browser' (Protocol in workflow.md)

---

## Phase 4: Activity Queue Page

### Frontend — Queue API Client

- [ ] Task: Add torrent queue API client
    - [ ] Write unit tests for `torrentApi` covering list, pause, resume, remove, setSpeedLimits
    - [ ] Create `app/src/lib/api/torrentApi.ts` with typed methods wrapping existing `/api/torrents` endpoints
    - [ ] Add torrent API to `getApiClients()`

### Frontend — Queue Page Component

- [ ] Task: Build `ActivityQueuePage` component
    - [ ] Write rendering tests: renders torrent rows with progress bars, status badges, action buttons; empty state; speed limit inputs
    - [ ] Create `app/src/components/activity/ActivityQueuePage.tsx`:
        - Polls `torrentApi.list()` every 5 s; pauses polling on `document.visibilityState === 'hidden'`
        - Columns: Title, Status badge (Downloading / Seeding / Paused / Error / Queued), Progress bar + %, Size, ↓ Speed, ↑ Speed, ETA, Seeders, Actions
        - Pause/Resume toggle per row
        - Remove row → opens `QueueRemoveModal`; on confirm calls `torrentApi.remove(infoHash)`
        - Global speed limit inputs wired to `torrentApi.setSpeedLimits()`
        - Empty state panel when no torrents
    - [ ] Replace `StaticPage` stub for `/activity/queue` in `App.tsx` with `ActivityQueuePage`

- [ ] Task: Conductor - User Manual Verification 'Phase 4: Activity Queue Page' (Protocol in workflow.md)

---

## Phase 5: Activity History Page

### Frontend — History Page Component

- [ ] Task: Build `ActivityHistoryPage` component
    - [ ] Write rendering tests: renders history rows, event type badges, filters, pagination, empty state, Mark Failed action
    - [ ] Create `app/src/components/activity/ActivityHistoryPage.tsx`:
        - Fetches `activityApi.list()` with pagination
        - Columns: Date, Event Type badge, Media Title, Quality, Indexer, Details, Actions
        - Filters: event type dropdown, date range (from/to), success/failure toggle
        - Per-row **Mark Failed** action → `activityApi.markFailed(id)`
        - Pagination controls (page size + page navigation)
        - Empty state panel when no history
    - [ ] Replace `StaticPage` stub for `/activity/history` in `App.tsx` with `ActivityHistoryPage`

- [ ] Task: Conductor - User Manual Verification 'Phase 5: Activity History Page' (Protocol in workflow.md)
