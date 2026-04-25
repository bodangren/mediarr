# Spec: SeedingProtector & grabRelease Corner Cases

## Problem Statement

Two confirmed bugs in the automated acquisition pipeline:

### Bug 1 — SeedingProtector deletes unimported torrents
`SeedingProtector.checkLimits()` calls `manager.removeTorrent()` whenever the
ratio or time limit is reached, **regardless of whether the linked media was
successfully imported**.
If the import failed (e.g. no library match, missing root folder), the torrent
transitions to `seeding` status and `SeedingProtector` eventually removes it,
destroying the only copy of the downloaded files.  The user loses the ability to
retry the import.

### Bug 2 — grabRelease passes URL guard with no usable URL
`grabRelease` only throws `TorrentRejectedError` when **both** `magnetUrl` and
`downloadUrl` are falsy.  But the URL normalisation step may produce a `magnetUrl`
that is actually an HTTPS URL (not a `magnet:` URI), in which case the code sets
neither `addOptions.magnetUrl` nor `addOptions.downloadUrl` and calls
`torrentManager.addTorrent` with no URL.  The torrent manager may silently fail
or throw an unhelpful error.

## Acceptance Criteria

### SeedingProtector
- [ ] `checkLimits()` removes a seeding torrent with no linked media when ratio/time is hit.
- [ ] `checkLimits()` removes a seeding torrent whose linked episode **has a path** (imported).
- [ ] `checkLimits()` removes a seeding torrent whose linked movie **has a path** (imported).
- [ ] `checkLimits()` **does NOT remove** a seeding torrent whose linked episode has `path = null`.
- [ ] `checkLimits()` **does NOT remove** a seeding torrent whose linked movie has `path = null`.
- [ ] When skipping removal, an activity event is emitted explaining the skip.

### grabRelease
- [ ] Throws `TorrentRejectedError` immediately when `magnetUrl` is a non-magnet URL and `downloadUrl` is null/undefined — before calling `torrentManager.addTorrent`.

## Subsystem Scope

- `server/src/services/SeedingProtector.ts`
- `server/src/services/MediaSearchService.ts`
- New test files for both
