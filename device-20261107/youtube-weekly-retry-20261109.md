# Exhausted YouTube downloads get a weekly retry (2026-11-09, 1.3.60 / code 84)

## Finding
Four FAILED rows had hit `attempts >= 3`; the old selection excluded them forever and the queue called them
"exhausted". Their errors are all YouTube bot-checks (`Sign in to confirm you're not a bot`) — transient
conditions that clear when the owner's browser cookies refresh, not dead content.

## Change
- `retryDelayMs`: 30 min → 6 h → 24 h, then **weekly** retries (`attempts > 3` = 7 days) instead of giving up.
- Download selection no longer excludes `attempts >= 3`; a FAILED row is eligible whenever `retryAt` has
  elapsed.
- UI copy says **"on weekly retry"** instead of "exhausted" on TV, SPA and the report.

## Live
```
queue: 312 available · 316 pending · 23 retrying · 4 on weekly retry · 1 quarantined
TV 1.3.60: "… 4 on weekly retry · downloads run every 20 minutes" (tv-youtube-weekly-retry-20261109.png)
```
The 4 bot-checked videos will be retried on their weekly schedule and can recover automatically once
cookies are refreshed — no owner action needed for correctness, only for faster recovery.
