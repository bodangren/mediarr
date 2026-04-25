# Track: Import Pipeline & Root Folder Settings

## Overview

The download lifecycle currently stops at "file in incomplete folder." This track wires the complete post-processing pipeline:

1. **Settings > Clients** — expose complete directory and seed limit controls that already exist in the backend schema but are not yet surfaced in the UI.
2. **Settings > Media** — add movie and TV root folder path inputs so newly added media has a default destination.
3. **Import Pipeline Hardening** — verify and harden the `ImportManager` → `Organizer` end-to-end flow that moves and renames files into the media root on torrent completion.
4. **Seed Ratio Enforcement** — implement the ratio/time watcher that removes torrents and cleans the complete folder when seeding goals are met.

### Download Lifecycle (after this track)

```
Download → incomplete folder (WebTorrent active)
  ↓ torrent 'done' event
Move to complete folder → WebTorrent re-seeds from complete path
  ↓ simultaneously
Copy/hardlink + rename → media root folder → DB updated → activity logged
  ↓ seed ratio / seed time met
Remove from WebTorrent → delete from complete folder → activity logged
```

## Functional Requirements

### FR1 — Settings > Clients: Complete Directory & Seed Controls

The download client settings page must expose:
- **Complete Directory** — path browser (FilesystemBrowser + Validate button, same pattern as incomplete directory). Stored as `completeDirectory` in TorrentLimitsSettings.
- **Seed Ratio Limit** — numeric input (e.g. `1.0`). `0` = seed forever. Stored as `seedRatioLimit`.
- **Seed Time Limit** — numeric input in minutes. `0` = no time limit. Stored as `seedTimeLimitMinutes`.
- **Seed Limit Action** — select: `pause` or `remove`. Stored as `seedLimitAction`.

Backend fields already exist in the DB and API — only UI wiring is required.

### FR2 — Settings > Media: Movie & TV Root Folders

The media management settings page must expose:
- **Movie Root Folder** — path browser (FilesystemBrowser + Validate). Stored in MediaManagementSettings.
- **TV Root Folder** — path browser (FilesystemBrowser + Validate). Stored in MediaManagementSettings.

When a new movie or series is added to the library (via "Add to Wanted"), if the media does not already have a `path`, default it to `<root folder>/<formatted title>`.

Backend: extend `MediaManagementSettings` and its GET/PUT API to include `movieRootFolder` and `tvRootFolder` string fields.

### FR3 — Import Pipeline Hardening

Verify and harden the `ImportManager` → `Organizer` pipeline:
- `ImportManager` must be instantiated and listening to `torrent:completed` at server startup.
- On receiving the event: scan complete folder, parse filenames, fuzzy-match to movie/series in DB, call `Organizer.organizeFile()` / `organizeMovieFile()`.
- On success: update `Movie.path` / `Episode.path` / `MediaFileVariant` in DB; log `MOVIE_IMPORTED` or `SERIES_IMPORTED` activity event with quality, indexer, size details.
- On failure: log `IMPORT_FAILED` activity event with error message and source file path; do not crash the process.
- Unit tests must cover: success path for movie, success path for episode, no match found, organizer throws.

### FR4 — Seed Ratio Enforcement

Within the existing `TorrentManager` stats sync loop:
- After updating stats, check each seeding torrent against its `stopAtRatio` (from `seedRatioLimit` setting) and `stopAtTime` (from `seedTimeLimitMinutes` setting + `completedAt`).
- If either limit is met and `seedLimitAction = 'pause'`: pause the torrent, update DB status to `paused`.
- If either limit is met and `seedLimitAction = 'remove'`: remove from WebTorrent, delete files from complete folder, delete DB row, log activity event.
- Enforcement only applies to torrents with `status = 'seeding'` and `completedAt` set.
- Unit tests must cover: ratio trigger, time trigger, pause action, remove action, no-op when limits are zero.

## Non-Functional Requirements

- Complete and incomplete directories must be validated to be readable/writable before saving (same validation as the existing path inputs).
- Import failures must not crash the server or prevent other torrents from being processed.
- Seed enforcement must not run on torrents that have not yet been imported (prevent premature deletion before the file is safely in the media root).
- All new server routes/service changes must have unit tests. All new UI components/forms must have rendering tests.

## Acceptance Criteria

- [ ] Settings > Clients shows complete directory browser + seed ratio/time/action controls; values persist and are applied to TorrentManager.
- [ ] Settings > Media shows movie root folder + TV root folder path browsers; values persist.
- [ ] Adding a new movie/series with no explicit path defaults to the configured root folder.
- [ ] When a monitored torrent completes, the file is moved to the complete folder, then hard-linked/copied to the correct media root with proper naming.
- [ ] A `MOVIE_IMPORTED` or `SERIES_IMPORTED` activity event is logged on successful import.
- [ ] A `IMPORT_FAILED` activity event is logged on failure; the server continues processing other torrents.
- [ ] When seed ratio or time limit is met, the torrent is paused or removed per the configured action; the complete folder copy is deleted on remove.

## Out of Scope

- Subtitle post-processing (separate track).
- External download client integration (WebTorrent only).
- Custom per-indexer root folders.
- Manual import UI (drag-and-drop / interactive import modal).
- RSS-triggered automated search.
