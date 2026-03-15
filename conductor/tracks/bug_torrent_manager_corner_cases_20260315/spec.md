# Spec: TorrentManager Corner Cases

## Problem Statement

`TorrentManager` is the core component that bridges WebTorrent downloads to the
ImportManager pipeline. It has **zero test coverage** despite containing several
critical code paths:

1. **`addTorrent`** — duplicate detection (DB + client), download queue limit, empty
   path guard, infoHash resolution failure, DB persistence failure cleanup.
2. **`handleTorrentCompletion`** — unconfigured complete path → error (never emits
   `torrent:completed`); file already in complete dir; `fs.rename` failure → error.
3. **`checkSeedLimits`** — per-torrent ratio/time overrides beat global limits; pause
   vs. remove actions; non-seeding torrents ignored.
4. **`promoteNextQueued`** — no queued items (no-op); queued item has no source →
   error status; resolved hash differs from placeholder hash → DB migration.
5. **`loadExistingTorrents`** — excess downloading torrents demoted to queued on restart;
   unwritable path → error status.

## Acceptance Criteria

- Every code path listed above has at least one test that exercises it.
- Tests confirm the precise behavior (status stored in DB, event emitted / not emitted,
  error thrown / not thrown) — not just that no exception is thrown.
- All new tests pass; no pre-existing tests regress.

## Subsystem Scope

`server/src/services/TorrentManager.ts`
`server/src/services/TorrentManager.test.ts` (new)
