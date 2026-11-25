# Spec — Reset YouTube format failures after the extractor broke

## Incident (owner report, 2026-11-25 20:14)

> `Command failed: nice -n 19 ionice -c 3 yt-dlp … --extractor-args youtube:player_client=web_embedded`
> `ERROR: [youtube] BpN3v2b_gXU: Requested format is not available. Use --list-formats for a list of available formats`

That message is the **last** of six download strategies in `YoutubeDownloadService.downloadOne`
(`server/src/services/YoutubeDownloadService.ts:264-292`), so every profile had already failed.

## Measured

- The installed `yt-dlp` was **2026.10.26**; `yt-dlp -U` reported **2026.11.23** available.
- Before the upgrade, `-F` on `BpN3v2b_gXU` (RealClearPolitics, public, 15:32) returned **storyboards
  only** — no audio or video formats at all: format extraction itself was broken, so every selector
  (`bv*[height<=1080][vcodec^=avc1]+ba`, `bv*+ba/b`, the `formats=missing_pot` profile, and every
  `player_client`) failed for the same reason. The same was true for `nYTidaldGbg`, a video that had
  downloaded successfully earlier, proving it was not video-specific.
- After `yt-dlp -U` → 2026.11.23, the same probe listed real formats (137+251, 1080p avc1 + opus),
  and a full server-args download to `/tmp` completed in **2:53** (1080p mkv, two googlevideo read
  timeouts absorbed by yt-dlp's own retry).
- Two rows sat FAILED with `attempts` 27 and 13 and `retryAt` **2026-12-02** (the 7-day ladder).
  The scheduled downloader sets a **30-minute** retry for `Requested format is not available`
  (`YoutubeAutomation.ts:401-402`), but the SPA/manual download route
  (`youtubeRoutes.ts:772-778`) uses the plain ladder, so those rows were parked for a week by an
  owner-triggered retry.

## Root causes

1. **External:** YouTube changed format availability for the installed yt-dlp release; the old
   binary can no longer extract media formats at all. Fixed by upgrading to 2026.11.23.
2. **Internal:** the download-failure backoff policy is duplicated — the scheduled path treats
   "Requested format is not available" as transient (30 min) and the route path does not (7-day
   ladder after 3 attempts), so a manual retry can park an episode for a week.
3. **Internal:** nothing recovers rows already parked on the long ladder when the underlying cause
   (a broken extractor) is fixed; the queue waits out the backoff.

## Requirement

One failure-backoff policy for both download paths, and a bounded self-healing pass that returns
format-flake rows parked by the old policy to the queue after the extractor is fixed — without
retrying rows that fail for other reasons.

## Design

- Export `downloadFailureRetryAt(error, attempts)` from `YoutubeAutomation.ts`: 30 minutes for
  `Requested format is not available` (transient), otherwise `retryDelayMs(attempts)`.
- Both `downloadPending`'s store and `PUT /api/youtube/videos/:id/download` use it.
- `downloadPending` requeues FAILED rows that carry a format-flake error **and** a `retryAt` more
  than one hour ahead (the old policy's fingerprint), clearing `attempts`/`retryAt`, then selects.
  Rows failing for any other reason stay parked on their ladder.
- Operator record: the yt-dlp version is the first thing to check when every download fails with
  `Requested format is not available`; recorded in the friction ledger and `lessons-learned.md`.

## Acceptance

- Red before green: a new route test proves a format-error failure returns a ~30-minute `retryAt`
  while a non-format failure still uses the ladder; a new `downloadPending` test proves an
  already-parked format row is requeued while a parked non-format row is not.
- `npx vitest run` on the touched suites green; `npx tsc -p server/tsconfig.json --noEmit` clean.
- Live: engine reloaded while the TV is idle; the two parked rows re-enter the queue and download
  with yt-dlp 2026.11.23; receipt shows `downloaded` > 0.
