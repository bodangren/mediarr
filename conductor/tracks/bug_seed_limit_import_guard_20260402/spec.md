# Spec: TorrentManager Seed-Limit Import Guard

## Problem Statement

`TorrentManager.checkSeedLimits()` is called on every stats sync tick (every 5–30 seconds). When a torrent reaches its seed ratio or time limit, it immediately calls `removeTorrent()` — which deletes the torrent from the client, its files from disk, and its DB record.

**This bypasses the import guard entirely.** `SeedingProtector.checkLimits()` has an `isImportIncomplete()` guard that checks whether the linked episode/movie has a path set before deleting. But `TorrentManager` fires first (5–30s vs 60s), so the `SeedingProtector` guard is effectively dead code.

**User impact:** A torrent downloads, completes, and starts seeding. The import hasn't run yet (or failed). The seed ratio is reached. `TorrentManager.checkSeedLimits()` deletes the torrent and its files. The import can never run, and the media is lost.

## Acceptance Criteria

1. `TorrentManager.checkSeedLimits()` must NOT remove a torrent whose linked episode has `path: null` (import pending or failed).
2. `TorrentManager.checkSeedLimits()` must NOT remove a torrent whose linked movie has `path: null`.
3. `TorrentManager.checkSeedLimits()` must NOT remove a torrent whose linked episode no longer exists in the DB.
4. `TorrentManager.checkSeedLimits()` must NOT remove a torrent whose linked movie no longer exists in the DB.
5. `TorrentManager.checkSeedLimits()` MUST still remove torrents that have no linked media (episodeId=null, movieId=null).
6. `TorrentManager.checkSeedLimits()` MUST still remove torrents whose linked media has been successfully imported (path is set).
7. All existing `TorrentManager` and `SeedingProtector` tests must continue to pass.

## Subsystem Scope

- `server/src/services/TorrentManager.ts` — `checkSeedLimits()` method
- `server/src/services/TorrentManager.test.ts` — new tests for import guard
- `server/src/services/SeedingProtector.ts` — reference implementation of import guard logic
