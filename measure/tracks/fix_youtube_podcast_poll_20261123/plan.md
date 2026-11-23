# Fix the YouTube podcast subscription poll — Plan

Spec: `spec.md`.

## Phase 1 — Bound the listing extraction

- [x] Task: Write the failing poller tests — the yt-dlp arguments contain `--playlist-end` and the bound
      is at least the effective queue cap (40 for `queueCap: 3`/`5`, ≥ 75 for the default 25) while the
      produced listing still queues the expected entries. Red confirmed: 2 poller bound tests fail, 4 new
      tests (with the route pair) fail before implementation.
- [~] Task: Implement the bound in `YoutubeFeedPoller.poll` (`max(40, cap * 3)`) and keep the existing
      flatten/filter/queue behaviour unchanged.
- [ ] Task: Measure — User Manual Verification 'Phase 1': run the poller suite, then the real bounded
      command against the RCP channel and record its elapsed time and entry counts.

## Phase 2 — Give the manual poll route the podcast cap

- [ ] Task: Write the failing route test — `POST /api/youtube/subscriptions/:id/poll` passes
      `queueCap: 5` for `{ podcast: true, keepLatest: 3 }` and `queueCap: null` for a plain channel,
      and still records the poll outcome on the row.
- [ ] Task: Extract the shared `podcastQueueCap(options)` helper from `pollAllSubscriptions`, use it in
      the route, and keep the scheduled path byte-identical output.
- [ ] Task: Measure — User Manual Verification 'Phase 2': run the two touched suites plus server tsc.

## Phase 3 — Live re-poll and close

- [ ] Task: Gate: `CI=true npx vitest run server/src/services/YoutubeFeedPoller.test.ts server/src/api/routes/youtubeRoutes.poll.test.ts`, `npx tsc -p server/tsconfig.json --noEmit`; then reload the engine when no playback is active, poll subscriptions 3 and 4, and record `lastPolledAt`/`lastError`/queued counts as evidence.
- [ ] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md`, and archive the track.
