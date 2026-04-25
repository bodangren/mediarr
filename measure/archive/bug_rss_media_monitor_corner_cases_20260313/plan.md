# Plan: RssMediaMonitor corner cases

## Phase 1 — TV grab must pass episodeId to addTorrent

### Tasks

- [x] 1.1 Write failing test: `handleTvRelease` passes `episodeId` to `addTorrent`
  - Create `server/src/services/RssMediaMonitor.test.ts`
  - Test fires `release:stored` with a matched TV release
  - Assert `addTorrent` was called with `episodeId: episode.id`
  - Run: confirm test FAILS (Red)
- [x] 1.2 Fix `handleTvRelease`: add `episodeId: episode.id` to the `addTorrent` call
  - Run: confirm test PASSES (Green)

**Checkpoint:** `CI=true bun run test --run server/src/services/RssMediaMonitor.test.ts 2>&1 | tail -20`

---

## Phase 2 — Movie grab must pass movieId to addTorrent

### Tasks

- [x] 2.1 Write failing test: `handleMovieRelease` passes `movieId` to `addTorrent`
  - Add test to `RssMediaMonitor.test.ts`
  - Assert `addTorrent` was called with `movieId: movie.id`
  - Run: confirm test FAILS (Red)
- [x] 2.2 Fix `handleMovieRelease`: add `movieId: movie.id` to the `addTorrent` call
  - Run: confirm test PASSES (Green)

**Checkpoint:** `CI=true bun run test --run server/src/services/RssMediaMonitor.test.ts 2>&1 | tail -20`

---

## Phase 3 — Corner-case coverage

### Tasks

- [x] 3.1 Test: release with no `magnetUrl` is ignored (no `addTorrent` call)
- [x] 3.2 Test: episode that already has a path (`path != null`) is not grabbed
- [x] 3.3 Test: movie whose score is below `AUTO_GRAB_THRESHOLD` (50) is not grabbed
- [x] 3.4 Test: series that is not monitored does not result in a grab

**Checkpoint:** `CI=true bun run test --run 2>&1 | tail -40`

---

## Phase 4 — Final verification

- [x] 4.1 Run full test suite: `CI=true bun run test --run 2>&1 | tail -60`
- [x] 4.2 Run production build: `cd app && npm run build 2>&1 | tail -20`
- [x] 4.3 Archive track
