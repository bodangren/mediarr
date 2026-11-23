# Pull YouTube subscriptions inside the retention window — Plan

Spec: `spec.md`.

## Phase 1 — Dated, windowed polling [checkpoint: ab625e1]

- [x] Task: Write the failing poller tests — a dated listing queues only entries published inside
      the window; a listing whose entries are all older than the window queues nothing; an undated
      listing falls back to the newest slice so a second poll with nothing new queues nothing; the
      result exposes `windowEntries`/`outsideVideoIds`/`windowComplete`, and the yt-dlp arguments
      include `youtubetab:approximate_date`. Red confirmed: 3 window tests failed. — ab625e1
- [x] Task: Implement the window in `YoutubeFeedPoller.poll` (`--extractor-args
      youtubetab:approximate_date`, `windowDays` on the subscription with a 7-day default, dated
      candidate filter, newest-slice fallback) and extend `PollResult`. — ab625e1
- [x] Task: Measure — User Manual Verification 'Phase 1': run the poller suite and re-time the live
      extraction with dates against the SMR and RCP channels; record the elapsed time and in-window
      counts. Evidence: RCP extraction 18.55 s; SMR 134 listed entries → 8 inside 7 days; RCP 125
      entries → 7 inside 7 days; poller suite 12/12. — ab625e1

## Phase 2 — Retire out-of-window rows and unstick the download head [checkpoint: ab625e1]

- [x] Task: Write the failing tests — `planQueueTrim` retires rows proved outside the window;
      `downloadPending` attempts fresh PENDING rows newest-first before due retries and retires
      orphaned queue rows; `DELETE /api/youtube/subscriptions/:id` retires that source's queued
      rows; the manual poll route passes the 7-day window. Red confirmed: 4 route/download tests
      failed. — ab625e1
- [x] Task: Implement `pullWindowDays`/`planQueueTrim` in `YoutubeAutomation`, the trim after each
      poll, orphan retirement plus the new selection order in `downloadPending`, and the delete
      route's cleanup. — ab625e1
- [x] Task: Measure — User Manual Verification 'Phase 2': run the touched suites and server tsc.
      Evidence: eight YouTube suites 50/50; `npx tsc -p server/tsconfig.json --noEmit` 0
      diagnostics. — ab625e1

## Phase 3 — Live proof and close

- [x] Task: Gate: run the two suites and `npx tsc -p server/tsconfig.json --noEmit`; reload the
      engine while idle, let the hourly poll and the download job run, and record the queue before
      and after (pending count, trimmed count, order of attempted rows). Evidence: eight YouTube
      suites + the new pollAll test 51/51, tsc 0 diagnostics; engine reloaded (health 200); the poll
      retired **65** rows (RCP 4 + SMR 61) and the queue went **PENDING 58 → 1**, FAILED 77 → 9; the
      06:00 download job retired 59 orphaned rows and attempted the newest two episodes first
      (1029 downloaded, 1030 in flight). — e10c446
- [x] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md`, and archive the track. Two ledger entries written (back-catalogue pull
      fixed; frozen head fixed structurally, tunnel named), registry entry archived with the live
      numbers, folder moved to `measure/archive/fix_youtube_pull_window_20261124/`. — 7394857
