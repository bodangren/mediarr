# Track: Manual Search, Queue Monitoring & Quality Profile Enhancements

## Overview
Advance the core user workflow across five areas:
1. **Quality Profile Expansion** — six standard presets + drag-to-reorder priority in the profile editor.
2. **Series Interactive Search** — series-aware search modal (series / season / episode levels) wired to the series detail toolbar.
3. **Download Location File Browser** — directory browser + manual entry + permission-aware validation.
4. **Activity Queue Page** — live download monitoring dashboard backed by `/api/torrents`.
5. **Activity History Page** — paginated log of completed/failed download events from `/api/activity`.

## Functional Requirements

### FR1 — Quality Profile Presets
- Seed six named profiles on first run (idempotent upsert, no duplicates):
  - **Any** — all quality definitions; cutoff SDTV
  - **SD** — SDTV, WEBRip-480p, WEBDL-480p, DVD; cutoff SDTV
  - **HD-720p** — HDTV-720p, WEBRip-720p, WEBDL-720p, Bluray-720p; cutoff HDTV-720p
  - **HD-1080p** — HDTV-1080p, WEBRip-1080p, WEBDL-1080p, Bluray-1080p; cutoff HDTV-1080p
  - **Ultra-HD** — HDTV-2160p, WEBRip-2160p, WEBDL-2160p, Bluray-2160p; cutoff HDTV-2160p
  - **HD - 720p/1080p** — all 720p + 1080p qualities; cutoff HDTV-720p
- Existing profiles with matching names must be updated in place, not duplicated.

### FR2 — Quality Profile Editor: Drag-to-Reorder
- The quality list in the Add/Edit Profile modal supports drag-to-reorder (mouse + keyboard: arrow keys).
- Order determines download preference priority (top = highest priority).
- The cutoff selector stays in sync when its quality is moved.
- Saved order is persisted to the backend.

### FR3 — Series Interactive Search Modal
- New `SeriesInteractiveSearchModal` with a **search level selector**: Series / Season / Episode.
  - **Series** — `tvsearch` + tvdbId
  - **Season** — `tvsearch` + tvdbId + season; season selector shown
  - **Episode** — `tvsearch` + tvdbId + season + episode; season + episode selectors shown
- Results table: Source, Title, Quality, Size, Peers, Age, Score, Actions (same pattern as movie modal).
- Filter controls: quality, indexer, sort (seeders / size / age / quality + direction).
- One-click **Grab** → internal WebTorrent engine (no client picker).
- Approved vs. rejected releases visually distinguished; rejections shown inline.
- Auto-searches on open.

### FR4 — Series Detail Toolbar Wiring
- "Search" toolbar button on series detail page opens `SeriesInteractiveSearchModal` at Series level.
- Season headers have a "Search Season" action → modal pre-set to Season level.
- Episode rows have a "Search Episode" action → modal pre-set to Episode level.

### FR5 — Download Location File Browser
- Server endpoint `GET /api/filesystem?path=<dir>` returns child directories + read/write permission
  flags for the requested path. Root fallback when no path is given. No symlink traversal outside root.
- Client-side path input in Download Client settings becomes:
  - Text field (manual entry)
  - Folder icon → opens **Path Browser Modal** (navigable directory tree)
  - **Validate** button → calls filesystem API on current value; displays ✓ Writable / ⚠ Read-only / ✗ Not found

### FR6 — Activity Queue Page (`/activity/queue`)
- Replaces the `StaticPage` stub with a live torrent queue view.
- Polls `GET /api/torrents` on an interval (5 s) to keep data fresh.
- Columns: Title, Status (badge), Progress (bar + %), Size, ↓ Speed, ↑ Speed, ETA, Seeders, Actions.
- Per-row actions: **Pause** / **Resume** (toggle), **Remove** (opens existing `QueueRemoveModal`).
- Global controls: speed limit inputs (↓ / ↑) wired to `PATCH /api/torrents/speed-limits`.
- Empty state when no active downloads.
- Status badges: Downloading, Seeding, Paused, Error, Queued.

### FR7 — Activity History Page (`/activity/history`)
- Replaces the `StaticPage` stub with a paginated activity log view.
- Backed by `GET /api/activity` (existing endpoint).
- Columns: Date, Event Type (badge), Media Title, Quality, Indexer, Details, Actions.
- Filters: event type dropdown, date range, success/failure toggle.
- Per-row actions: **Mark Failed** (existing `PATCH /api/activity/:id/mark-failed`).
- Pagination controls. Empty state when no history.

## Non-Functional Requirements
- Filesystem API must not traverse symlinks outside the requested root (path traversal prevention).
- Drag-to-reorder must be keyboard accessible (arrow keys to move items, announced to screen readers).
- Queue page must not hammer the server — poll interval ≥ 5 s; pause polling when tab is hidden.
- All new server routes must have unit tests; all new UI components must have rendering tests.

## Acceptance Criteria
- [ ] Six quality profile presets exist after fresh seed; re-seeding produces no duplicates.
- [ ] Profile editor allows drag reorder; saved order reflected in API response.
- [ ] Series detail "Search" button opens modal and returns torrent results.
- [ ] Season and episode searches pass correct tvdbId + season/episode params.
- [ ] Grabbing from series modal sends request to internal torrent engine.
- [ ] Download location path browser navigates filesystem; Validate reports correct permission status.
- [ ] Queue page shows live progress for active torrents; pause/resume/remove work.
- [ ] History page shows paginated activity log; filters and pagination work.

## Out of Scope
- Automatic/RSS-triggered search.
- External download client selection (internal WebTorrent only).
- Wanted page / missing episode list (not in nav yet).
- Post-processing / import / file organization (next track).
- Subtitle search.
