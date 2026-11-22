# Plan — Home "Next up" (series-level in-progress row)

## Phase 1: Engine
- [x] **P1.1 (Red/Green)** Pure `planNextUp` / `planNextUpList` with tests: skip fully-watched and
      no-progress series, first unwatched episode, partially played episode as next, recency ordering.
      Evidence: `server/src/services/NextUpPlanner.ts` + `NextUpPlanner.test.ts`, **4/4 green** (the one
      red first run was a test-fixture id typo, not the planner).
- [x] **P1.2** `PlaybackRepository.findNextUp(limit)` — episodes with files, per-episode progress,
      series metadata; hand to the planner. Evidence: live `GET /api/playback/next-up?limit=5` returns
      Firefly 3/14 → S01E04 Shindig, HIMYM 61/208 → S03E18, Archer 45/140 → S01E01, ordered by
      `lastWatchedAt` desc.
- [x] **P1.3** `GET /api/playback/next-up?limit=` wired through `PlaybackService`/route; route test.
      Evidence: `playbackRoutes.test.ts` 15/15 (shape + limit passthrough), tsc clean.

## Phase 2: SPA Home
- [x] **P2.1** API client method + zod schema; Home section "Next up" with poster cards, episode label and
      watched/total, click opens the series; section hidden when empty. Evidence: `NextUpWidget.tsx` +
      `dashboardApi.getNextUp`, rendered above Continue Watching; live SPA check returned headings
      `["Next up","Continue Watching",…]` and cards in recency order (`Next up: Firefly S01E04 · Shindig`
      first).
- [~] **P2.2** SPA test for the section; build + verify in the browser.

## Phase 3: TV Home
- [ ] **P3.1** Flutter model + client method; Home row "Next up" (poster, `SxxEyy`, title), Select opens
      the series detail; d-pad focus works; widget test.
- [ ] **P3.2** APK build/publish/install; verify on the TV that the row is present, ordered by recency,
      and opens the right series.

## Phase 4: Close
- [ ] **P4.1** Ledger entry with the measured ordering, `tracks.md` update, archive.
