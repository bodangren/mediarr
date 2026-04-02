# Plan: Daily Cleanup — 2026-04-03

## Phase 1 — Commit Stale Changes & Clean Working Tree
- [ ] Commit staged deletions from seed-limit archive
- [ ] Handle stray artifact modification (revert or commit)
- [ ] Verify `git status` is clean

## Phase 2 — Review Yesterday's New Code
- [ ] Review `server/src/services/importGuard.ts` for correctness and edge cases
- [ ] Review `server/src/services/TorrentManager.ts` changes (import guard wiring)
- [ ] Review `server/src/services/SeedingProtector.ts` refactor (shared guard usage)
- [ ] Review `server/src/services/TorrentManager.test.ts` and `server/src/services/SeriesMonitoringService.test.ts` for coverage gaps

## Phase 3 — Verify & Finalize
- [ ] Run full test suite: `CI=true npx vitest run`
- [ ] Run production build: `cd app && npm run build`
- [ ] Archive track
