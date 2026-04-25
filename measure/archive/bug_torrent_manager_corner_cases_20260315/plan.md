# Plan: TorrentManager Corner Cases

## Phase 1 — addTorrent edge cases

- [x] 1.1 Red: no source (no magnet, no torrent file) → throws
- [x] 1.2 Red: empty/blank incomplete download path → throws
- [x] 1.3 Red: duplicate infoHash already in DB → returns existing record (no upsert)
- [x] 1.4 Red: duplicate infoHash already in WebTorrent client → returns from client
- [x] 1.5 Red: at download limit → stores as 'queued', returns queued info
- [x] 1.6 Red: infoHash resolution timeout → throws 'Unable to resolve torrent infoHash'
- [x] 1.7 Red: DB upsert failure → removes torrent from client, re-throws
- [x] 1.x Green: all Phase 1 tests pass (no production fixes needed — behaviour already correct)
- [x] 1.x Checkpoint: all 21 TorrentManager tests pass (ea113be)

## Phase 2 — handleTorrentCompletion edge cases

- [x] 2.1 Red: completeDownloadPath is empty → status set to 'error', no `torrent:completed` event
- [x] 2.2 Red: torrent path already starts with completeDownloadPath → status 'seeding', `torrent:completed` NOT emitted
- [x] 2.3 Red: fs.rename succeeds → status 'seeding', `torrent:completed` emitted with targetDir
- [x] 2.4 Red: fs.rename fails → status 'error', no `torrent:completed` event
- [x] 2.x Green: all Phase 2 tests pass (no production fixes needed — behaviour already correct)
- [x] 2.x Checkpoint: all 21 TorrentManager tests pass (ea113be)

## Phase 3 — checkSeedLimits, promoteNextQueued, loadExistingTorrents

- [x] 3.1 Red: checkSeedLimits — non-seeding torrent → no action
- [x] 3.2 Red: checkSeedLimits — ratio limit reached → action taken (pause or remove)
- [x] 3.3 Red: checkSeedLimits — per-torrent stopAtRatio overrides global seedRatioLimit
- [x] 3.4 Red: checkSeedLimits — time limit reached → action taken
- [x] 3.5 Red: promoteNextQueued — no queued torrents → noop
- [x] 3.6 Red: promoteNextQueued — queued torrent has no source → repository.updateStatus('error')
- [x] 3.7 Red: loadExistingTorrents — excess downloading torrents demoted to 'queued'
- [x] 3.8 Red: loadExistingTorrents — unwritable path marks torrent as 'error'
- [x] 3.x Green: all Phase 3 tests pass (no production fixes needed — behaviour already correct)
- [x] 3.x Checkpoint: all 21 TorrentManager tests pass (ea113be)

## Phase 4 — Verify & Archive

- [x] 4.1 Full test suite passes — 1051 tests pass, 11 skipped (b81192c)
- [x] 4.2 Production build passes (`cd app && npm run build`) — chunk size warning is pre-existing (b81192c)
- [x] 4.3 Archive track and push
