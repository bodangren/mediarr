# Plan: LibraryScanService Comprehensive Corner-Case Testing

## Phase 1: Scaffold Tests + scanAll() Orchestration

- [x] Create test file with proper mock infrastructure (prisma, fs, walkDir)
- [x] Test `scanAll()` with both roots set and populated
- [x] Test `scanAll()` with one root empty
- [x] Test `scanAll()` with neither root set
- [x] Test `scanAll()` summary aggregation correctness

## Phase 2: scanMovies() — DB-to-Disk Reconciliation

- [x] Test movie with valid path — path exists, no change
- [x] Test movie with valid path — file deleted, path nulled
- [x] Test movie with valid path — transient permission error, path NOT nulled (bug check)
- [x] Test multiple movies with mixed exist/missing states
- [x] Test empty movie DB — no errors, zero summary
- [x] Test movie with no path (null) — skipped, not processed

## Phase 3: scanMovies() — Disk-to-DB Auto-Matching

- [x] Test exact title+year match — file matched and path set
- [x] Test substring false positive — "It" should NOT match "It Chapter Two"
- [x] Test year mismatch — file with different year not matched
- [x] Test multiple candidate movies — each file matched to correct movie
- [x] Test file already pathed — not re-matched
- [x] Test no matching movie — file ignored, no error
- [x] Test duplicate movie matching — both movies matched if distinct files exist

## Phase 4: scanEpisodes() — DB-to-Disk + Orphan Counting

- [x] Test episode with valid path — path exists, no change
- [x] Test episode with valid path — file deleted, path nulled
- [x] Test empty episode DB — no errors, zero summary
- [x] Test orphaned video files counted as "added"
- [x] Test subtitle files NOT counted as "added"
- [x] Test no new files on disk — added count is zero

## Phase 5: walkDir Error Handling + Bug Fixes

- [x] Test nonexistent root folder — silent empty result (document behavior)
- [x] Test permission denied on root — silent empty result (document behavior)
- [x] Test symlink loops — does walkDir handle them?
- [x] Fix any bugs found in Phases 2-4
- [ ] Run full test suite and verify green
