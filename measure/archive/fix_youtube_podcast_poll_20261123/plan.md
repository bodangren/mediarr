# Fix the YouTube podcast subscription poll — Plan

Spec: `spec.md`.

## Phase 1 — Bound the listing extraction [checkpoint: 7038755]

- [x] Task: Write the failing poller tests — the yt-dlp arguments contain `--playlist-end` and the bound
      is at least the effective queue cap (40 for `queueCap: 3`/`5`, ≥ 75 for the default 25) while the
      produced listing still queues the expected entries. Red confirmed: 2 poller bound tests fail, 4 new
      tests (with the route pair) fail before implementation. — 7038755
- [x] Task: Implement the bound in `YoutubeFeedPoller.poll` (`max(40, cap * 3)`) and keep the existing
      flatten/filter/queue behaviour unchanged. — 7038755
- [x] Task: Measure — User Manual Verification 'Phase 1': run the poller suite, then the real bounded
      command against the RCP channel and record its elapsed time and entry counts. Evidence: live
      `--playlist-end 40` extraction took **15.2 s** (exit 0, tabs 40 / 5 / 40 entries) versus the
      unbounded run that took ~100–120 s and hit the 120 s timeout; poller suite 9/9. — 7038755

## Phase 2 — Give the manual poll route the podcast cap [checkpoint: 7038755]

- [x] Task: Write the failing route test — `POST /api/youtube/subscriptions/:id/poll` passes
      `queueCap: 5` for `{ podcast: true, keepLatest: 3 }` and `queueCap: null` for a plain channel,
      and still records the poll outcome on the row. Red confirmed: both cap tests failed before the
      helper existed. — 7038755
- [x] Task: Extract the shared `podcastQueueCap(options)` helper from `pollAllSubscriptions`, use it in
      the route, and keep the scheduled path byte-identical output. — 7038755
- [x] Task: Measure — User Manual Verification 'Phase 2': run the two touched suites plus server tsc.
      Evidence: `YoutubeFeedPoller` 9/9, `youtubeRoutes.poll` 3/3, `youtubeRoutes.manage` 11/11,
      `youtubeRoutes.latest` 2/2, `YoutubeAutomation.requeue` 3/3 (28/28); tsc 0 diagnostics. — 7038755

## Phase 3 — Live re-poll and close

- [x] Task: Gate: `CI=true npx vitest run server/src/services/YoutubeFeedPoller.test.ts server/src/api/routes/youtubeRoutes.poll.test.ts`, `npx tsc -p server/tsconfig.json --noEmit`; then reload the engine when no playback is active, poll subscriptions 3 and 4, and record `lastPolledAt`/`lastError`/queued counts as evidence. Evidence: engine reloaded 21:09 (health 200), scheduled poll **21:20:32** logged `YouTube poll: 2 subscriptions, queued 30, failures 0`; subscription 3 `lastPolledAt=1795440016`, `lastError` cleared, `PENDING` rows sub 3 = 5 (keepLatest 3 + 2) and sub 4 = 25. — 7038755
- [x] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md`, and archive the track. Two ledger entries written (poll incident fixed,
      download starvation blocked); registry entry archived with the open download blocker named;
      folder moved to `measure/archive/fix_youtube_podcast_poll_20261123/`. — d4ddaf5
