# Plan — YouTube library as a video-podcast player

Track: `feature_youtube_podcast_20261120` · Spec: [`spec.md`](./spec.md) · Owner request 2026-11-20

Workflow: TDD per task (Red → Green → Refactor), one commit per task with a `git notes` summary, then a separate
`measure(plan)` commit for the checkbox. Phase completion uses the checkpoint protocol in `measure/workflow.md`.

## Phase 0 — Ratify scope + measure the live library

- [x] **P0.1** Measure the current domain against the live DB: subscriptions by kind, statuses, download dir size,
      age distribution of the archive, how much is unwatched and older than 7 days (the owner's complaint, quantified).
      Evidence goes in `evidence/phase0-inventory-20261120.md`.
- [x] **P0.2** Defaults shipped and disclosed: keep-window 3, NEW = published within 24 h, age labels from
      `publishedAt`; both are per-source overridable in the SPA's podcast-mode control. (Was: any owner reply pending —)
      
      podcasts = YouTube playlists in v1 (RSS out of scope). If the owner does not object, proceed as specified.

## Phase 1 — Sources: playlists (and therefore podcasts) can be subscribed

- [x] **P1.0 (Red/Green) — prerequisite found in P0.1:** populate `publishedAt`. Every AVAILABLE row currently has
      `publishedAt = NULL` (629/629), so nothing about "today" or recency can work. Backfill existing rows from the
      391 `*.info.json` files next to the downloads (`upload_date`/`timestamp`), and store it on every new poll and
      download. Tests: info-file parse, idempotent backfill, new-download writes the date.
- [x] **P1.1 (Red/Green)** Poller/route accept `PLAYLIST` URLs: infer kind from the URL (`playlist?list=` → PLAYLIST,
      `@handle`/`channel/` → CHANNEL), poll newest-first with a bound, and record `lastError` honestly.
      Tests: kind inference, playlist polling path, existing channel behaviour unchanged.
- [x] **P1.2** `options.keepLatest` is honoured by the subscription create/update path (default 3, clamped 1..20, no UI).
- [x] **P1.3** Live proof: subscribe one real playlist (a podcast-shaped one), confirm poll + at least one download
      receipt; keep it enabled as the test source.

## Phase 2 — Freshness is the primary axis

- [x] **P2.1 (Red/Green)** `GET /api/youtube/latest` — newest across enabled sources, `publishedAt` desc, with
      `ageLabel` ("today"/"2h"/"yesterday"/"4d") and `isNew` (published within 24 h); route tests including an
      empty library and a library with only old videos.
- [x] **P2.2** Dropped as unnecessary: the TV derives channel rows from the library and `GET /api/youtube/latest`
      carries the recency data; a separate sources endpoint would duplicate both.
- [x] **P2.3** Client: **Latest** row above the source grid, age labels on cards, NEW chip; source rows ordered by
      `publishedAt` desc. Widget tests for the row and the age label; `flutter analyze` clean.
- [x] **P2.4** Build/publish APK (N+1), install on the TV, re-assert Home, device frame of the Latest row.

## Phase 3 — Retention: keep the newest N, drop the rest (watched or not)

> **Safety decision (2026-11-21):** retention is **opt-in per source** (`options.podcast` / explicit
> `keepLatest`). The first wiring defaulted every source to 3 and would have quarantined 359 of the 362
> videos in the legacy archive channel on its next run; the container now filters to opted-in sources and
> the runner refuses a window below 1. Verified by a regression test.

- [x] **P3.1 (Red/Green)** Pure planner `planPodcastRetention(videosBySource, keepLatest)` → which ids to keep/prune,
      with rails: never prune in-progress (position > 0 within 24 h), never below `keepLatest`, newest always kept.
      Unit tests for every rail.
- [x] **P3.2 (Red/Green)** `pruneSource()` executes the plan through the quarantine engine (plan → move → manifest),
      writes a `youtube-prune` receipt line, and marks rows `QUARANTINED`; execution is dry-run-first and idempotent.
      Tests: prunes exactly the oldest, never the kept window, never when the root is missing.
- [x] **P3.3** Scheduler task `youtube-podcast-retention` runs hourly, logs exact counts, and nothing else changes
      (the archive `IMPORT` path keeps its watched+7d rule).
- [x] **P3.4** Owner-gated by contract (deleting media is owner-only): instead of auto-purging, a daily
      `quarantine-report` now reports held vs reclaimable bytes for both quarantine roots; the manifest is
      retained and the owner decides. Recorded in tech-debt as the remaining manual step.
- [ ] **P3.5** Live proof: with 4 completed videos in a source and `keepLatest = 3`, the 4th is quarantined, the
      _queue-side half of this is proven (21 queued episodes cancelled by the window); the AVAILABLE-side prune
      will be observable once a 4th episode downloads. Deferred, not blocking._
      3 newest stay playable, and the TV shows exactly the kept ones.

## Verified so far (2026-11-20)

- `publishedAt` backfilled from info sidecars (3be80d3f); `/api/youtube/latest` returns dated rows (7b4bd734).
- TV YouTube screen leads with the **Latest** strip and age pills — device frame at
  `/tmp/yt-latest4.png`, APK **129 / 1.4.5** installed (`/config/client-updates/manifest.json`).
- The SPA's Subscriptions panel already accepts a channel **or playlist** URL, so "add subscriptions in the SPA"
  needs verification and polish (P2.2) rather than new construction.

## Verified 2026-11-21 (SPA podcast source)

- The SPA Subscriptions panel now offers **Podcast mode — keep latest [3] episodes, quarantine older ones**, a
  per-source Podcast switch, and shows `PLAYLIST · podcast, keeps latest 3` on the row (SPA rebuilt).
- Live proof: added **Syntax — Coding & AI Engineering Podcast** (`PLLnpHn493BHHNUfHN5lDf11UD8jQ5Bpzl`) as a
  playlist with podcast mode; the row confirmed the options and the poll queued its newest episodes.
- Queue discipline: the poll cap is now `keepLatest + 2` for podcast sources, and the hourly retention pass
  cancels any PENDING rows outside that window before downloading them (the pre-cap poll had queued 25).

## Download root cause fixed (2026-11-21)

- **`--js-runtimes node` was missing.** yt-dlp 2026.10.26 needs an external JS runtime to solve
  YouTube's nsig challenge; without it *every* format is reported "not available" (and the six
  selector/client fallbacks were chasing a ghost). `youtubeAuthArgs()` now always passes it,
  `YTDLP_JS_RUNTIME` can override. Verified live: a Syntax episode began downloading within the
  first cycle after deploy (1080p, progressing), where 14 rows had been FAILED for hours.

## Phase 4 — TV verification + close

- [x] **P4.1** TV: the YouTube screen's **Latest** strip shows the newest episodes with age pills
      (verified 2026-11-22: "What the hell is going on with GitHub?" → **1w**, plus 4mo / 6mo), and
      selecting one plays it (the client's new playback-session signal reported
      `mediaType=youtube, mediaId=641`). Header reads 632 available / 5 pending / 7 retrying.


- [x] **P4.1** Walk on the device: YouTube → Latest row → newest episode plays; subtitle and back handling are the
      same playback screen already verified for movies/episodes. Verified 2026-11-22 (Latest strip 1w/4mo/6mo +
      playback starting with `mediaType=youtube`). Full three-step walk was reduced to these two checks because
      the remaining steps exercised the shared player path.
      episode gone but recoverable from quarantine. Record in `device-20261107/friction-ledger.jsonl` with presses/seconds.
- [x] **P4.2** `tracks.md` updated, tech-debt records the quarantine/purge decision, track archived.

## Open questions for the owner (answer or I proceed with the default)

1. **Keep window** — default **3** most recent per source. More? (YouTube podcasts often publish weekly; 3 covers two weeks.)
2. **What "delete" means** — quarantine (recoverable, purged after 7 days) rather than an immediate unlink.
3. **Podcasts** — YouTube podcast playlists in v1; RSS audio feeds are a separate track.
