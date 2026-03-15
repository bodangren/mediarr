# Plan: Cleanup Pending Changes from Prior Work

## Phase 1 — Commit Pending Working-Tree Changes

- [x] Stage deletion of `conductor/tracks/chore_server_module_alignment_20260315/` (3 files) — 3a88ef4
- [x] Commit deleted track files (part of archive that was never staged) — 3a88ef4
- [x] Stage and commit server mDNS LAN IP changes (main.ts + DiscoveryService.ts) — c094b33
- [x] Stage and commit Vite dev server `host: true` change (app/vite.config.ts) — 288c52b
- [x] Stage and commit Android TV client fixes (build.gradle.kts + NotificationEventSource.kt) — 2e8ae6d

## Phase 2 — Test Suite Checkpoint

- [x] Run full test suite: `CI=true npx vitest run 2>&1 | tail -40` — 1030 passed, 11 skipped
- [x] Confirm zero new failures introduced by committed changes

## Phase 3 — Merge to main and Archive

- [ ] Merge branch to `main`
- [ ] Update metadata.json: status → done, add completed date
- [ ] Move track folder to `conductor/archive/`
- [ ] Update `conductor/tracks.md`: mark done, move to archived section
- [ ] Commit archive
- [ ] Push to remote
