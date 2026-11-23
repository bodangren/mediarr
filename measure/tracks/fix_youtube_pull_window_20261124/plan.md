# Pull YouTube subscriptions inside the retention window — Plan

Spec: `spec.md`.

## Phase 1 — Dated, windowed polling

- [~] Task: Write the failing poller tests — a dated listing queues only entries published inside
      the window; a listing whose entries are all older than the window queues nothing; an undated
      listing falls back to the newest slice so a second poll with nothing new queues nothing; the
      result exposes `windowEntries`/`outsideVideoIds`/`windowComplete`, and the yt-dlp arguments
      include `youtubetab:approximate_date`.
- [ ] Task: Implement the window in `YoutubeFeedPoller.poll` (`--extractor-args
      youtubetab:approximate_date`, `windowDays` on the subscription with a 7-day default, dated
      candidate filter, newest-slice fallback) and extend `PollResult`.
- [ ] Task: Measure — User Manual Verification 'Phase 1': run the poller suite and re-time the live
      extraction with dates against the SMR and RCP channels; record the elapsed time and in-window
      counts.

## Phase 2 — Retire out-of-window rows and unstick the download head

- [ ] Task: Write the failing tests — `planQueueTrim` retires rows proved outside the window;
      `downloadPending` attempts fresh PENDING rows newest-first before due retries and retires
      orphaned queue rows; `DELETE /api/youtube/subscriptions/:id` retires that source's queued
      rows; the manual poll route passes the 7-day window.
- [ ] Task: Implement `pullWindowDays`/`planQueueTrim` in `YoutubeAutomation`, the trim after each
      poll, orphan retirement plus the new selection order in `downloadPending`, and the delete
      route's cleanup.
- [ ] Task: Measure — User Manual Verification 'Phase 2': run the touched suites and server tsc.

## Phase 3 — Live proof and close

- [ ] Task: Gate: run the two suites and `npx tsc -p server/tsconfig.json --noEmit`; reload the
      engine while idle, let the hourly poll and the download job run, and record the queue before
      and after (pending count, trimmed count, order of attempted rows).
- [ ] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md`, and archive the track.
