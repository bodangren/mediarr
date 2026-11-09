# YouTube backlog ETA from measured throughput (2026-11-09)

The queue showed counts but no answer to "when will the backlog finish?" — and the report's open-items
text guessed "~5 videos/hour".

## Fix
- New `summarizeYoutubeThroughput`/`parseYoutubeDownloadReceipts` (tolerant JSONL parser) compute downloads
  in the last 24 h from `/config/youtube-download-receipts.jsonl`.
- `GET /api/youtube/queue` now returns `throughput: { windowHours, downloaded, runs, perHour, etaHours }`.
- The report's YouTube card renders the measured rate and drain estimate; the open-items text no longer
  claims a made-up ceiling.

## Live (2026-11-09 13:15)
```
available 303 · pending 316 · downloading 1 · retrying 35 · exhausted 0 · quarantined 1
throughput: downloaded 31 in last 24 h (39 runs) = 1.29/h
etaHours: 245  -> report card: "measured 1.3/h → ~11 d to drain"
```
This is the honest CPU-bound picture (no hardware encoder); the number updates every 5 minutes from real
receipts instead of a promise. 3 unit tests (window, no-download, malformed JSONL).
