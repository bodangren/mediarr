# Spec — Pull YouTube subscriptions inside the retention window, and unstick the queue

## Incident (owner report, 2026-11-24 05:27)

> *"Youtube podcasts are not working correctly. 1. I set up seven days' retention, then added a new
> subscription. Now 58 videos are in the queue. we should only be pulling within the retention
> window. 2. queue is stuck on the same video for days."*

Measured on the live engine the same hour: 2 subscriptions, **PENDING 58** (RCP podcast 5, SMR 53),
FAILED 77 (mostly rows from subscriptions that no longer exist), one DOWNLOADING.

## Root causes

1. **The poller walks the channel's back catalogue.** `selectNewEntries` accepts the first
   `perPollCap` entries that are *not already queued*. When the 25 newest uploads are queued, the
   next poll skips them and accepts entries 26–50, the third poll 51–75, and so on — so an active
   channel adds 25 queue rows every hour, from further and further back in its history (SMR rows
   already include 2022 videos). There is no publication-date bound: yt-dlp's flat listing returned
   `timestamp: null` for every channel entry, so the poller had no dates to filter on (the reason
   the podcast retention was count-based).
2. **The queue head is a stale failure.** `downloadPending` selects the oldest `added` rows first,
   including FAILED rows whose retry is due. With 77 failed rows — many of them belonging to deleted
   subscriptions (`subscriptionId NULL`) on a weekly retry ladder — every slot re-attempts the same
   ancient rows before the fresh episodes, and a download that fails on the slow tunnel keeps the
   visible head unchanged for days.

## Requirement

A subscription poll must only queue **episodes published inside the retention window** (default
**7 days**) and must never reach into the catalogue beyond it. Rows already queued outside the
window are retired, the download worker spends its slots on the newest work first, and queue rows
whose source no longer exists are retired instead of retried forever.

## Design

- `yt-dlp` is invoked with `--extractor-args youtubetab:approximate_date`, which makes flat channel
  listings carry approximate publication dates (verified live 2026-11-24: SMR's 134 listed entries
  gained dates; 8 fall inside 7 days, RCP 7 of 125).
- `YoutubeFeedPoller.poll` filters the flattened entries to `publishedAt >= now - windowDays`
  before dedupe/cap, exposes the window (`windowVideoIds`, `outsideVideoIds`, `windowComplete`,
  `windowEntries`, `windowDays`) in its result, and falls back to the newest listing slice when the
  listing has no dates at all (playlists) — so an undated source can never drain its catalogue
  either.
- `pollAllSubscriptions` passes a per-subscription window (`options.retentionDays`, default 7) and
  retires PENDING rows for that subscription that the poll proved outside the window.
- `downloadPending` retires orphaned queue rows (`source='SUBSCRIPTION'`, `subscriptionId NULL`,
  PENDING/FAILED) and orders fresh PENDING rows newest-first ahead of due retries.
- Deleting a subscription retires its queued rows at the same time.

## Acceptance

- New tests fail before the change and pass after: window filtering, no back-catalogue drain, the
  undated fallback, `planQueueTrim`, download ordering and orphan retirement, and the delete route's
  queue cleanup.
- `npx vitest run` on the touched suites green; `npx tsc -p server/tsconfig.json --noEmit` clean.
- Live: after the engine reload, the next poll logs a trimmed queue; PENDING drops from 58 to the
  in-window count (RCP 5 + SMR's 7-day episodes) and does not grow on the following poll.
