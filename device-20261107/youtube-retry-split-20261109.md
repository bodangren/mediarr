# YouTube queue now separates retrying from exhausted (2026-11-09)

`failed` was reported as one number ("40 retrying"), but the worker only retries FAILED rows with
`attempts < 3`; rows beyond that stay FAILED forever and need an owner decision. The queue is now honest.

- `summarizeYoutubeQueue` takes `attempts` per status group and returns
  `failed` (total) + `retrying` (attempts < 3) + `exhausted` (attempts >= 3).
- `/api/youtube/queue` groups by `status, attempts`.
- SPA strip shows `N retrying` (amber) and `N exhausted` (red, only when non-zero); the TV header line
  and the report card do the same.

## Live
```
{"available":299,"pending":316,"downloading":0,"failed":40,"retrying":40,"exhausted":0,"quarantined":1,"total":656}
```
DB check by attempts: FAILED 0 attempts = 30, 1 = 4, 2 = 6 → all 40 are still retryable, exhausted 0.

## Tests
- `youtubeQueueSummary.test.ts` now asserts the split (34 retrying / 9 exhausted in the fixture; unknown
  statuses still count only in the total).
- SPA page test and TV widget test updated; app tsc, SPA build and the TV test are green.

## Device verification (1.3.57 / code 81)
TV YouTube header still reads
**299 available · 316 pending · 40 retrying · 1 quarantined · downloads run every 20 minutes**
(`exhausted 0` is correctly hidden). Evidence: `tv-youtube-queue-157-20261109.png`.
