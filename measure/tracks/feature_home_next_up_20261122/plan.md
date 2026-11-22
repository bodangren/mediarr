# Plan — Home "Next up" (series-level in-progress row)

## Phase 1: Engine
- [x] **P1.1 (Red/Green)** Pure `planNextUp` / `planNextUpList` with tests: skip fully-watched and
      no-progress series, first unwatched episode, partially played episode as next, recency ordering.
      Evidence: `server/src/services/NextUpPlanner.ts` + `NextUpPlanner.test.ts`, **4/4 green** (the one
      red first run was a test-fixture id typo, not the planner).
- [~] **P1.2** `PlaybackRepository.findNextUp(limit)` — episodes with files, per-episode progress,
      series metadata; hand to the planner.
- [ ] **P1.3** `GET /api/playback/next-up?limit=` wired through `PlaybackService`/route; route test.

## Phase 2: SPA Home
- [ ] **P2.1** API client method + zod schema; Home section "Next up" with poster cards, episode label and
      watched/total, click opens the series; section hidden when empty.
- [ ] **P2.2** SPA test for the section; build + verify in the browser.

## Phase 3: TV Home
- [ ] **P3.1** Flutter model + client method; Home row "Next up" (poster, `SxxEyy`, title), Select opens
      the series detail; d-pad focus works; widget test.
- [ ] **P3.2** APK build/publish/install; verify on the TV that the row is present, ordered by recency,
      and opens the right series.

## Phase 4: Close
- [ ] **P4.1** Ledger entry with the measured ordering, `tracks.md` update, archive.
