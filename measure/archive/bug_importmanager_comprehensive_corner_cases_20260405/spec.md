# ImportManager Comprehensive Corner-Case Testing

## Problem Statement

The ImportManager is the critical subsystem that moves downloaded media from torrent completion to organized library files. Three confirmed real-world bugs have surfaced in this pipeline:

1. **Wrong episode grabs** — automatic searches can grab S02E05 when the user wanted S01E05, and the import either silently accepts it or fails unpredictably
2. **Completed torrents fail to import** — edge cases in the 4 import paths cause imports to silently fail or partially succeed
3. **Failed imports deleted at seed ratio** — when a torrent's seed ratio is met, the seed-limit checker deletes the torrent (and its files) even if the import never succeeded, destroying user data with no retry

Previous tracks have tested individual ImportManager paths in isolation, but no track has verified the **complete end-to-end lifecycle** across all 4 import paths plus the failed-import deletion guard.

## The 4 Import Paths

1. **Slow path** (`handleTorrentCompleted` → no episodeId/movieId) — parses torrent content filenames, matches against DB episodes/movies
2. **Fast path** (`handleTorrentCompleted` → with episodeId/movieId) — skips filename parsing, goes directly to organize using the known media ID
3. **Import/Apply route** (`POST /api/series/:id/import/apply`) — manual user-triggered import of discovered files; batch operation with per-item error handling
4. **Disk import** (`LibraryScanService` → `ImportManager`) — scans existing library directories and imports pre-existing media files

## Failed-Import Lifecycle

When an import fails:
- The failure must be recorded in the activity/event log
- The torrent must **NOT** be auto-deleted by seed-limit checks until import succeeds
- Failed imports should be eligible for retry (manual or automatic)
- Files must not be left in a partially-organized state

## Acceptance Criteria

- [ ] Tests exist for all 4 import paths with corner-case inputs
- [ ] Failed-import lifecycle is tested: no deletion at seed ratio, retry eligibility, event logging
- [ ] Wrong-episode detection is tested: parsed episode ≠ wanted episode → import rejected
- [ ] All tests pass (CI=true bun run test --run)
- [ ] Any bugs found are fixed with minimal code changes
- [ ] Production build succeeds (npm run build)

## Subsystem Scope

- `server/src/services/import-manager.ts` — primary ImportManager service
- `server/src/services/importGuard.ts` — shared import-incomplete guard
- `server/src/services/torrent-manager.ts` — seed-limit deletion path
- `server/src/services/organizer.ts` — file organization (episode + movie paths)
- `server/src/routes/series.ts` — import/apply endpoint
- `server/src/services/library-scan.ts` — disk import path
