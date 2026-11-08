# YouTube download retries with backoff (2026-11-09)

Before this change a failed YouTube download stayed FAILED forever — including transient yt-dlp
bot-checks and network hiccups — so the queue silently shrank. `YoutubeVideo` now tracks
`attempts` + `retryAt` (migration 0017) and `downloadPending` selects:

```
status = PENDING
OR (status = FAILED AND attempts < 3 AND (retryAt IS NULL OR retryAt <= now))
```

- `markFailed` increments attempts and sets `retryAt = now + retryDelayMs(attempts)`.
- Backoff: **30 min → 6 h → 24 h**, then it stays FAILED with the owner-visible error (unit-tested).
- Legacy bot failures without the cookie flag are still requeued once by the earlier rule.

## Live check (after restart + migration)
A failing row in the running batch got `attempts=1`, `retryAt=2026-11-08 21:52:12Z` (30 min later), while
other failures in the same batch still show `attempts=0` — the bookkeeping is per-row and real.

## Why it matters
YouTube bot-checks are intermittent (some videos succeed minutes later); a three-attempt policy
recovers those without hammering the API, and anything that repeatedly fails is still FAILED with its
exact error instead of being silently dropped.

## Live verification (2026-11-09 06:00 +08:00)
After the 30-minute backoff elapsed:
- row **id 3** (FAILED, attempts=1, retryAt 21:52Z) was selected by the next batch and is now
  **DOWNLOADING** — the policy retried it instead of leaving it dead;
- its batch-mates with attempts=0 were also eligible; new failures recorded attempts=1 with a fresh
  retryAt, so the cap and backoff apply per row.
Also observed in the same batch window: the 05:45 `youtube-retention` job moved one watched+7d video to
quarantine (`/config/youtube-retention-receipts.jsonl`, QUARANTINED=1) — retention is executing on
schedule, not just in tests.
