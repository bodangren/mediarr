# Spec: Daily Cleanup — 2026-04-04

## Problem
Apr 3 track archiving left stale `git rm` changes uncommitted:
- `measure/tracks/bug_rss_pipeline_corner_cases_20260403/*` (deleted, already in archive)
- `measure/tracks/bug_torrent_lifecycle_corner_cases_20260403/*` (deleted, already in archive)
- `measure/tracks/chore_daily_cleanup_20260403/*` (deleted, already in archive)
- `measure/archive/cardigann_runtime_parity_20260223/artifacts/final-phase5-compatibility-matrix.json` (timestamp-only change)

## Acceptance Criteria
1. All stale deletions committed
2. Full test suite passes (1274+ tests, 0 failures)
3. Working tree clean
