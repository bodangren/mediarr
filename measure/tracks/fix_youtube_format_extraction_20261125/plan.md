# Reset YouTube format failures after the extractor broke — Plan

Spec: `spec.md`.

## Phase 1 — One failure-backoff policy [checkpoint: c8e008e]

- [x] Task: Write the failing tests — `downloadFailureRetryAt` gives 30 minutes for a
      `Requested format is not available` error regardless of attempt count and the ladder
      otherwise; `PUT /api/youtube/videos/:id/download` stores the short retry for a format failure
      and the ladder for any other failure. Red confirmed: 3 failures (helper missing ×2, the route
      stored a 6-hour retry for the format flake). — c8e008e
- [x] Task: Implement `downloadFailureRetryAt` in `YoutubeAutomation.ts` and use it from both
      `downloadPending` and the manual download route. — c8e008e
- [x] Task: Measure — User Manual Verification 'Phase 1': run the touched suites and server tsc.
      Evidence: `youtubeRoutes.manage.test.ts` 14/14, `YoutubeAutomation.retryPolicy.test.ts` 2/2;
      `npx tsc -p server/tsconfig.json --noEmit` clean. — c8e008e

## Phase 2 — Self-heal format rows parked by the old policy [checkpoint: c8e008e]

- [x] Task: Write the failing test — `downloadPending` requeues a FAILED row that carries a
      format-flake error and a `retryAt` more than an hour ahead, and leaves a parked non-format
      failure untouched. Red confirmed. — c8e008e
- [x] Task: Implement the requeue pass in `downloadPending`. — c8e008e
- [x] Task: Measure — User Manual Verification 'Phase 2': run the touched suites and server tsc.
      Evidence: 24 YouTube suites / 133 tests green (was 20 failing-capable tests before); tsc
      clean; the drive-by `pollAll.test.ts` `status` typing error on HEAD is fixed. — c8e008e

## Phase 3 — Live proof and close

- [ ] Task: Gate: upgrade `yt-dlp` (2026.10.26 → 2026.11.23), reload the engine while the TV is
      idle, let the download job run, and record the receipt plus the queue before/after.
- [ ] Task: Record the incident, the yt-dlp-version lesson and the fix in
      `device-20261107/friction-ledger.jsonl` and `measure/lessons-learned.md`, update
      `measure/tracks.md`, and archive the track.
