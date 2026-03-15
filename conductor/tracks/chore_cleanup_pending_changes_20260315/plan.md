# Plan: Cleanup Pending Changes from Prior Work

## Phase 1 — Commit Pending Working-Tree Changes

- [ ] Stage deletion of `conductor/tracks/chore_server_module_alignment_20260315/` (3 files)
- [ ] Commit deleted track files (part of archive that was never staged)
- [ ] Stage and commit server mDNS LAN IP changes (main.ts + DiscoveryService.ts)
- [ ] Stage and commit Vite dev server `host: true` change (app/vite.config.ts)
- [ ] Stage and commit Android TV client fixes (build.gradle.kts + NotificationEventSource.kt)

## Phase 2 — Test Suite Checkpoint

- [ ] Run full test suite: `CI=true bun run test --run 2>&1 | tail -40`
- [ ] Confirm zero new failures introduced by committed changes

## Phase 3 — Merge to main and Archive

- [ ] Merge branch to `main`
- [ ] Update metadata.json: status → done, add completed date
- [ ] Move track folder to `conductor/archive/`
- [ ] Update `conductor/tracks.md`: mark done, move to archived section
- [ ] Commit archive
- [ ] Push to remote
