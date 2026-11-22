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
- [x] **P2.2** SPA test for the section; build + verify in the browser. Evidence: `NextUpWidget.test.tsx`
      2/2 (order/href/labels + empty DOM when nothing in progress), dashboard suite 27/27, `tsc -b`
      clean, SPA built (`vite build` 13.09 s) and verified live through the browser bridge.

## Phase 3: TV Home
- [x] **P3.1** Flutter model + client method; Home row "Next up" (poster, `SxxEyy`, title), Select opens
      the series detail; d-pad focus works; widget test. Evidence: `NextUpItem` + `getNextUp` in
      `api_client.dart`, `next_up_section.dart` (portrait poster, `SxxEyy`, title, watched/total),
      wired into `home_screen.dart` above Continue Watching; `next_up_section_test.dart` 2/2 and the
      full client suite **619/619** with `flutter analyze` clean.
- [x] **P3.2** APK build/publish/install; verify on the TV that the row is present, ordered by recency,
      and opens the right series. Evidence: **APK 153 / 1.4.29** installed; the Home shows the row
      Firefly `S01E04` 3/14, HIMYM `S03E18` 61/208, Archer `S01E01` 45/140, American Dad! `S01E07` 6/399,
      Rick and Morty `S01E01` 17/91, Murderbot `S01E08` 9/10 (recency order), and Select on Firefly opens
      the series with **Play S01E04** focused (`/tmp/nextup-tv.png`, `/tmp/nextup-open.png`).

## Phase 4: Close
- [x] **P4.1** Ledger entry with the measured ordering, `tracks.md` update, archive.
