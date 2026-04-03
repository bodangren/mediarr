# Plan: TorrentManager Lifecycle & importGuard Corner-Case Testing

## Phase 1 — importGuard.ts dedicated unit tests

- [x] Write `importGuard.test.ts` with full branch coverage:
  - [x] Returns `{ incomplete: false }` when prisma is undefined (backward compat)
  - [x] Returns `{ incomplete: false }` when torrent has no episodeId and no movieId
  - [x] Returns `{ incomplete: true }` when episode exists but path is null
  - [x] Returns `{ incomplete: true }` when episode no longer exists in DB
  - [x] Returns `{ incomplete: false }` when episode has a path set
  - [x] Returns `{ incomplete: true }` when movie exists but path is null
  - [x] Returns `{ incomplete: true }` when movie no longer exists in DB
  - [x] Returns `{ incomplete: false }` when movie has a path set
  - [x] Guards both episodeId AND movieId (both must be imported)
  - [x] Handles episode.findUnique rejection (DB error) — should propagate

- Test-run checkpoint: `npx vitest run server/src/services/importGuard.test.ts`

## Phase 2 — removeTorrent corner cases

- [ ] Write tests in a new `TorrentManager.removeTorrent.test.ts` or append to existing file:
  - [ ] Removes from DB even when torrent is not in WebTorrent client (already handled via "not found" catch)
  - [ ] Skips WebTorrent removal for queued torrents (DB-only)
  - [ ] Does NOT delete files when DB record is null (no path/name)
  - [ ] Handles file deletion failure gracefully (logs error, continues with DB delete)
  - [ ] Promotes queued torrent when removing a downloading torrent
  - [ ] Does NOT promote queued torrent when removing a non-downloading torrent
  - [ ] Removes from DB and clears session baseline

- Test-run checkpoint: `npx vitest run server/src/services/TorrentManager.test.ts`

## Phase 3 — syncStats loop corner cases

- [ ] Write tests for syncStats:
  - [ ] Skips torrents with no infoHash in the client
  - [ ] Handles P2025 error by removing unmanaged torrent from client
  - [ ] Does not trigger another sync cycle when statsSyncInFlight is true (backpressure)
  - [ ] Accumulates session uploaded baselines correctly (first encounter snapshots DB value, subsequent add session delta)
  - [ ] Computes ratio correctly when downloaded is 0 (returns 0, not NaN/Infinity)
  - [ ] Normalizes ETA (null for non-finite, clamped to SQLITE_INT_MAX)

- Test-run checkpoint: `npx vitest run server/src/services/TorrentManager.test.ts`

## Phase 4 — addTorrent queued path with torrent file

- [ ] Write tests:
  - [ ] Queued torrent with torrentFile (no magnet) generates placeholder infoHash
  - [ ] Queued torrent with torrentFile preserves the file buffer in DB
  - [ ] Promotion of queued torrent-file torrent: uses torrentFile when no magnetUrl
  - [ ] Promotion failure marks torrent as error

- Test-run checkpoint: `npx vitest run server/src/services/TorrentManager.test.ts`

## Phase 5 — Full suite verification

- [ ] Run full test suite, confirm all pass
- [ ] Run production build, confirm no errors
