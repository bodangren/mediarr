# Spec: Daily Cleanup — 2026-04-03

## Problem Statement

Yesterday (2026-04-02) produced 2 tracks with new code (`bug_seed_limit_import_guard_20260402` and `bug_series_monitoring_corner_cases_20260402`). There are uncommitted staged deletions from the seed-limit archive and a stray artifact modification. The daily cleanup must:

1. Commit stale changes from yesterday's archived tracks
2. Review yesterday's new production code for quality issues (importGuard.ts, TorrentManager changes, SeriesMonitoringService test coverage gaps)
3. Verify the full test suite remains green

## Acceptance Criteria

- All stale `git status` artifacts are committed or cleaned
- Yesterday's new code (importGuard.ts, TorrentManager.ts changes, SeedingProtector.ts refactor) reviewed for correctness, naming, and error handling
- Full test suite passes (196+ files, 1200+ tests)
- Track archived by end of session

## Subsystem Scope

- `server/src/services/importGuard.ts` (new file)
- `server/src/services/TorrentManager.ts` (modified)
- `server/src/services/SeedingProtector.ts` (modified)
- `measure/` (cleanup)
