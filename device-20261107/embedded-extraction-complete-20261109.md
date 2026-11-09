# Embedded Chinese subtitle recovery complete (2026-11-09 23:3x)

```
GET /api/subtitles/extraction/status
{ tracks: 346, extracted: 288, failed: 58, queueRemaining: 0, capped: 58 }
```
Every embedded **text** Chinese track with a present video file has been converted to a `.zho.srt` sidecar:
**288 reclaimed**. The 58 attempt-capped rows are entries whose video file is missing/stale or whose
extraction failed three times; they are excluded from the actionable queue and visible as `capped`.

The `subtitle-extract` job keeps running every 10 minutes and will pick up anything new (e.g. future imports)
with no further action.

Sync pass after the influx: 409 tried / 385 ok / 23 gave_up / 1 failed, 1,392 remaining at ~29/h (3 h window).
Realigned sidecars plus reclaimed ones raised the candidate set to 1,801; the pass continues in viewing
priority order (~2 days to drain).
