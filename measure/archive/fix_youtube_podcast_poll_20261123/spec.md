# Spec — Fix the YouTube podcast subscription poll

## Incident

The owner added the RealClear Politics channel as a **podcast** subscription (`keepLatest: 3`) in the
SPA on 2026-11-23 20:40. The first poll failed at 20:43:14 with the raw engine error:

```
Command failed: yt-dlp --cookies-from-browser chrome+gnomekeyring --js-runtimes node \
  --flat-playlist --dump-single-json --no-warnings --ignore-errors \
  https://www.youtube.com/@RealClearPoliticsYT
```

`YoutubeSubscription` row 3 stores that text in `lastError`; the journal at the same minute shows
`[event-loop] stalled … (jobs 'youtube-download', …)`.

## Root cause

1. **Unbounded extraction.** `YoutubeFeedPoller.poll` asks yt-dlp for the *whole* channel listing
   (`--flat-playlist --dump-single-json`) with a 120 s `execFile` timeout. A channel URL expands to
   three tabs (`Videos`, `Live`, `Shorts`) and yt-dlp paginates every tab before emitting the single
   JSON document. Measured 2026-11-23: the unbounded RCP extraction takes ~100–120 s and hit the
   timeout; adding `--playlist-end 40` takes **15.2 s** and returns 40 / 5 / 40 entries. The poller
   needs only the newest few videos anyway (`selectNewEntries` then caps the accepted set).
2. **The manual poll route drops the podcast cap.** `POST /api/youtube/subscriptions/:id/poll`
   (the SPA "poll now" path) constructs the subscription without `queueCap`, while the scheduled
   `pollAllSubscriptions` passes `keepLatest + 2` (clamped 10). Pressing poll on a podcast therefore
   queues up to `perPollCap` (25) instead of the newest few.

## Requirements

1. `YoutubeFeedPoller.poll` bounds the listing extraction: yt-dlp receives `--playlist-end <bound>`
   derived from the effective queue cap with enough headroom for duplicates and shorts
   (`max(40, cap * 3)`), so extraction stays far below the 120 s timeout on large channels.
2. The manual poll route applies the same podcast queue cap as the scheduled poller through one
   shared helper, so both paths queue identically for a `podcast: true` subscription.
3. No behavioural change for playlist subscriptions, non-podcast channels, receipt/error recording,
   or the scheduled poll path.

## Acceptance

- New tests fail before the change and pass after:
  - poller: the yt-dlp argument list contains `--playlist-end` with a bound ≥ the effective cap
    (40 for `queueCap: 3` and 5, ≥ `perPollCap * 3` for the default 25);
  - route: `POST /api/youtube/subscriptions/:id/poll` passes `queueCap: 5` for a
    `{ podcast: true, keepLatest: 3 }` subscription and `queueCap: null` for a plain channel.
- `npx vitest run server/src/services/YoutubeFeedPoller.test.ts server/src/api/routes/youtubeRoutes.poll.test.ts`
  green; `npx tsc -p server/tsconfig.json --noEmit` clean.
- Live proof: after the engine reload, polling subscription 3 (RCP) and 4 (SMR) returns no error,
  records `lastPolledAt`, and queues at most `keepLatest + 2` videos for the podcast.
