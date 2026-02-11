# Implementation Plan: Track 3 - Integrated Torrent Engine (Downloader Layer)

## Phase 1: Core Engine Integration & Persistence [checkpoint: ]
Establish the foundation for WebTorrent and the database state management.

- [x] Task: Update Prisma schema to include `Torrent` and `TorrentPeer` models to track state, progress, and settings. (92b4e31)
- [x] Task: Write Tests: Verify `TorrentRepository` can save and retrieve torrent state including metadata and file paths. (9c247ad)
- [x] Task: Implement `TorrentRepository` for CRUD operations on torrent state. (9d5be0e)
- [x] Task: Write Tests: Verify `TorrentManager` can initialize `webtorrent` and load existing torrents from the database on startup. (58fec58)
- [x] Task: Implement `TorrentManager` singleton to wrap the `webtorrent` client and handle lifecycle events. (1aee30f)


## Phase 2: Transfer & Queue Control [checkpoint: ]
Implement the logic for adding, pausing, and controlling the download process.

- [ ] Task: Write Tests: Verify the engine can add a magnet link or .torrent file and begin downloading to the `incomplete/` directory.
- [ ] Task: Implement `addTorrent` logic with support for custom storage paths.
- [ ] Task: Write Tests: Verify global speed limits (upload/download) are applied and respected by the WebTorrent client.
- [ ] Task: Implement global speed limit configuration and runtime updates.
- [ ] Task: Write Tests: Verify pause/resume/remove functionality correctly updates the database and the active engine state.
- [ ] Task: Implement queue control methods (pause, resume, stop).


## Phase 3: Completion Logic & Seeding Management [checkpoint: ]
Handle the transition from downloading to completed and enforce seeding rules.

- [ ] Task: Write Tests: Verify that files are moved from `incomplete/` to `complete/` exactly when the download reaches 100%.
- [ ] Task: Implement file move logic and event emitter for completion.
- [ ] Task: Write Tests: Verify seeding limits (ratio/time) correctly trigger the stop/removal of a torrent.
- [ ] Task: Implement `SeedingProtector` service to monitor active torrents and enforce ratio/time limits.


## Phase 4: API & Real-time Monitoring [checkpoint: ]
Expose the engine's state to the rest of the application.

- [ ] Task: Write Tests: Verify the internal API returns standardized progress data (speed, peers, ETA, % progress).
- [ ] Task: Implement the Torrent API endpoints for status and management.

