# Plan: TorrentManager Seed-Limit Import Guard

## Phase 1 — Red: Write failing tests for the import guard

- [x] 1.1 Test: `checkSeedLimits` removes an unlinked torrent when ratio limit is reached (baseline — should already pass, confirms setup)
- [x] 1.2 Test: `checkSeedLimits` does NOT remove a torrent whose linked episode has `path: null` (import pending)
- [x] 1.3 Test: `checkSeedLimits` does NOT remove a torrent whose linked episode no longer exists in DB
- [x] 1.4 Test: `checkSeedLimits` removes a torrent whose linked episode HAS been imported (path is set)
- [x] 1.5 Test: `checkSeedLimits` does NOT remove a torrent whose linked movie has `path: null`
- [x] 1.6 Test: `checkSeedLimits` does NOT remove a torrent whose linked movie no longer exists in DB
- [x] 1.7 Test: `checkSeedLimits` removes a torrent whose linked movie HAS been imported (path is set)
- [x] 1.8 Test: `checkSeedLimits` import guard also applies when `seedLimitAction` is `'pause'` — should NOT pause an unimported torrent

**Checkpoint:** Run `CI=true bun run test --run`. Tests 1.2–1.3 and 1.5–1.6 should FAIL (import guard doesn't exist yet).

## Phase 2 — Green: Add import guard to TorrentManager

- [x] 2.1 Add a `prisma` dependency to `TorrentManager` (constructor injection, optional — same pattern as `SeedingProtector`)
- [x] 2.2 Extract shared `isImportIncomplete()` logic into a standalone function (used by both `TorrentManager` and `SeedingProtector`) to avoid duplication
- [x] 2.3 Wire the import guard into `checkSeedLimits()` before the pause/remove action
- [x] 2.4 Update `main.ts` to pass `prisma` to `TorrentManager` (via constructor or setter)
- [x] 2.5 Run full test suite — all Phase 1 tests must pass

**Checkpoint:** Run `CI=true bun run test --run`. All tests pass.

## Phase 3 — Refactor & expand coverage

- [ ] 3.1 Update `SeedingProtector` to use the shared `isImportIncomplete()` function instead of its private method
- [ ] 3.2 Test: `checkSeedLimits` handles DB errors gracefully (episode.findUnique throws) — continues to next torrent without deleting
- [ ] 3.3 Test: `checkSeedLimits` skips guard when `prisma` is not provided (backward compat) — removes normally
- [ ] 3.4 Test: `checkSeedLimits` with both episodeId and movieId set — guards both

**Checkpoint:** Run `CI=true bun run test --run`. All tests pass.

## Phase 4 — Verify & finalize

- [ ] 4.1 Run full test suite: `CI=true bun run test --run`
- [ ] 4.2 Run production build: `cd app && npm run build`
- [ ] 4.3 Update memory files (tech-debt.md, lessons-learned.md)
- [ ] 4.4 Archive track
