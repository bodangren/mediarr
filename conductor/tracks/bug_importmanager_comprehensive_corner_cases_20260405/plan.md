# ImportManager Comprehensive Corner-Case Testing — Plan

## Phase 1: Slow Path — Episode Matching Corner Cases (Red/Green/Refactor)

Tests for the slow path where no episodeId/movieId is linked to the torrent.

- [ ] 1.1 Wrong-episode grab: torrent filename parses to S02E05, but DB only has S01E05 for that series → import fails with IMPORT_FAILED, not silently accepted
- [ ] 1.2 Episode exists but belongs to a different series with a similar title → no cross-series contamination
- [ ] 1.3 Multi-episode release (S01E01E02) — only first episode matched, second should also be imported or correctly handled
- [ ] 1.4 Season pack torrent with no episode-specific filename → falls through to movie match or IMPORT_FAILED
- [ ] 1.5 Series title in filename uses alternate naming (dots vs spaces vs underscores) → still matches via cleanTitle
- [ ] 1.6 Series title contains a year that conflicts with episode pattern (e.g. "24 S01E01") → year stripped correctly, episode matched

## Phase 2: Slow Path — Movie Matching Corner Cases

Tests for the movie fallback path when episode matching fails.

- [ ] 2.1 Movie filename with year matches DB movie by title+year → imported successfully
- [ ] 2.2 Movie filename without year but with quality tag (1080p, BluRay) → matches by title alone
- [ ] 2.3 Movie filename matches a different movie with similar title but different year → rejected (no wrong-movie grab)
- [ ] 2.4 Episode-parsed filename but no matching episode in DB → falls through to movie path (episodeImported=false)
- [ ] 2.5 Movie found but no movie root folder configured → IMPORT_FAILED with specific reason

## Phase 3: Fast Path — Linked Episode/Movie Corner Cases

Tests for the fast path where episodeId or movieId is pre-linked on the torrent row.

- [ ] 3.1 Linked episode exists and series has TV root folder → imported successfully
- [ ] 3.2 Linked episode deleted from DB after grab → IMPORT_FAILED with specific "linked episode not found" reason
- [ ] 3.3 Linked episode exists but series has no path and no TV root folder → IMPORT_FAILED
- [ ] 3.4 Linked movie deleted from DB after grab → IMPORT_FAILED with specific "linked movie not found" reason
- [ ] 3.5 Linked movie exists but no movie root folder → IMPORT_FAILED
- [ ] 3.6 Both episodeId and movieId set (shouldn't happen but defensive) → episode path takes priority

## Phase 4: Import/Apply Route — Batch Import Corner Cases

Tests for the manual import/apply endpoint.

- [ ] 4.1 Batch import with 5 files, 2 fail → 3 succeed, 2 fail, no early return from batch
- [ ] 4.2 Single file import where organizer throws → per-file try/catch, IMPORT_FAILED emitted
- [ ] 4.3 Import file that's already been imported (duplicate path) → handled gracefully
- [ ] 4.4 Import with empty file list → handled without error

## Phase 5: Failed-Import Lifecycle & Seed-Limit Guard

Tests for the failed-import lifecycle and seed-limit deletion protection.

- [ ] 5.1 Import fails → IMPORT_FAILED event emitted with correct entityRef, sourcePath, reason
- [ ] 5.2 Torrent with failed import reaches seed ratio → isImportIncomplete returns true, torrent NOT deleted
- [ ] 5.3 Successful import → isImportIncomplete returns false, torrent CAN be deleted at seed ratio
- [ ] 5.4 Retry import by infoHash when torrent row exists → uses stored path
- [ ] 5.5 Retry import by infoHash when torrent row deleted → falls back to activity event sourcePath
- [ ] 5.6 Retry import by activity event when event is not IMPORT_FAILED → throws error
- [ ] 5.7 Retry import when source files no longer exist → IMPORT_FAILED, not crash

## Phase 6: Verify & Archive

- [ ] 6.1 Run full test suite: CI=true bun run test --run
- [ ] 6.2 Run production build: cd app && npm run build
- [ ] 6.3 Update memory files (tech-debt.md, lessons-learned.md)
- [ ] 6.4 Archive track and update tracks.md
