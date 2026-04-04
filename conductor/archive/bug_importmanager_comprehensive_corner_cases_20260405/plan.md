# ImportManager Comprehensive Corner-Case Testing — Plan

## Phase 1: Slow Path — Episode Matching Corner Cases

- [x] 1.1 Wrong-episode grab: torrent filename parses to S02E05, but DB only has S01E05 → IMPORT_FAILED (437b2ab)
- [x] 1.2 Episode exists but belongs to a different series with a similar title → no cross-series contamination (437b2ab)
- [ ] 1.3 Multi-episode release (S01E01E02) — deferred; existing Organizer tests cover this path
- [x] 1.4 Season pack torrent with no episode-specific filename → IMPORT_FAILED (437b2ab)
- [x] 1.5 Series title in filename uses alternate naming (dots vs spaces) → still matches via cleanTitle (437b2ab)
- [ ] 1.6 Series title contains a year that conflicts with episode pattern — deferred; ReleaseParser handles year stripping

## Phase 2: Slow Path — Movie Matching Corner Cases

- [x] 2.1 Movie filename with year matches DB movie → imported successfully (437b2ab)
- [x] 2.2 Movie filename without year but with quality tag → matches by title (437b2ab)
- [x] 2.3 Movie filename matches different movie with similar title but different year → rejected (437b2ab) — **BUG FIXED**: findMovieMatch now returns null when year present but no match
- [x] 2.4 Episode-parsed filename but no matching episode → falls through to movie path (437b2ab)
- [x] 2.5 Movie found but no movie root folder → IMPORT_FAILED (437b2ab)

## Phase 3: Fast Path — Linked Episode/Movie Corner Cases

- [x] 3.1 Linked episode exists and series has TV root folder → imported (437b2ab)
- [x] 3.2 Linked episode deleted from DB after grab → IMPORT_FAILED (437b2ab)
- [x] 3.3 Linked episode exists but series has no path and no TV root folder → IMPORT_FAILED (437b2ab)
- [x] 3.4 Linked movie deleted from DB after grab → IMPORT_FAILED (437b2ab)
- [x] 3.5 Linked movie exists but no movie root folder → IMPORT_FAILED (437b2ab)
- [x] 3.6 Both episodeId and movieId set → episode path takes priority (437b2ab)

## Phase 4: Import/Apply Route — Batch Import Corner Cases

Already covered by `seriesRoutes.importRescan.test.ts` (previous track bug_series_routes_import_rescan_20260316). Per-item try/catch, batch processing, and error handling all tested.

- [x] 4.1-4.4 Covered by existing seriesRoutes.importRescan.test.ts

## Phase 5: Failed-Import Lifecycle & Seed-Limit Guard

- [x] 5.1 Import fails → IMPORT_FAILED event emitted with correct entityRef, sourcePath, reason (437b2ab)
- [ ] 5.2 Torrent with failed import reaches seed ratio → isImportIncomplete returns true — covered by bug_seed_limit_import_guard_20260402
- [ ] 5.3 Successful import → isImportIncomplete returns false — covered by bug_seed_limit_import_guard_20260402
- [x] 5.4 Retry import by infoHash when torrent row exists → uses stored path (437b2ab)
- [x] 5.5 Retry import by activity event when torrent row deleted → falls back to sourcePath (437b2ab)
- [x] 5.6 Retry import by activity event when event is not IMPORT_FAILED → throws error (437b2ab)
- [x] 5.7 Retry import when source files no longer exist → IMPORT_FAILED (437b2ab)

## Phase 6: Verify & Archive

- [x] 6.1 Run full test suite: 210 test files, 1528 passed, 0 failures
- [ ] 6.2 Run production build: cd app && npm run build
- [ ] 6.3 Update memory files (tech-debt.md, lessons-learned.md)
- [ ] 6.4 Archive track and update tracks.md
