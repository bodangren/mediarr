# Spec: TorrentManager Lifecycle & importGuard Corner-Case Testing

## Problem Statement

The directive targets comprehensive corner-case testing for the automated media acquisition pipeline. While TorrentManager has 31 existing tests covering addTorrent, handleTorrentCompletion, checkSeedLimits (with import guard), and promoteNextQueued, several critical lifecycle paths remain untested:

1. **`importGuard.ts`** — Has zero dedicated unit tests. It is only tested indirectly through TorrentManager's checkSeedLimits. The guard logic itself (the shared function used by both TorrentManager and SeedingProtector) should have its own test file to prevent regression.

2. **`removeTorrent` bypasses import guard** — When a user manually removes a torrent (via the API), the import guard is NOT checked. The files are deleted from disk regardless of whether ImportManager has processed them. This is a design decision that should be explicitly tested to document the behavior.

3. **`syncStats` → `checkSeedLimits` integration** — The periodic stats sync loop iterates over all WebTorrent client torrents, updates progress, then calls checkSeedLimits on each. Corner cases in this loop (missing infoHash, P2025 errors, session baseline accumulation) need coverage.

4. **`addTorrent` queued torrent with torrent file (no magnet)** — When maxActiveDownloads is hit and the source is a torrent file (no magnet URL), the queued infoHash uses a placeholder. The promotion flow must handle this correctly.

## Acceptance Criteria

- `importGuard.ts` has a dedicated test file with full branch coverage
- `removeTorrent` corner cases are tested (no DB record, queued status, file delete failure, import guard bypass documented)
- `syncStats` loop corner cases are tested (torrent with no infoHash, P2025 handling, backpressure guard)
- `addTorrent` queued path with torrent-file-only source is tested
- All existing 31 TorrentManager tests continue to pass
- No bugs are introduced

## Subsystem Scope

- `server/src/services/importGuard.ts`
- `server/src/services/TorrentManager.ts` (syncStats, removeTorrent, addTorrent queued path)
