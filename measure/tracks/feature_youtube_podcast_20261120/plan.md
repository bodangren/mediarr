# Plan — YouTube library as a video-podcast player

Track: `feature_youtube_podcast_20261120` · Spec: [`spec.md`](./spec.md) · Owner request 2026-11-20

Workflow: TDD per task (Red → Green → Refactor), one commit per task with a `git notes` summary, then a separate
`measure(plan)` commit for the checkbox. Phase completion uses the checkpoint protocol in `measure/workflow.md`.

## Phase 0 — Ratify scope + measure the live library

- [x] **P0.1** Measure the current domain against the live DB: subscriptions by kind, statuses, download dir size,
      age distribution of the archive, how much is unwatched and older than 7 days (the owner's complaint, quantified).
      Evidence goes in `evidence/phase0-inventory-20261120.md`.
- [ ] **P0.2** Ratify with the owner in one message: keep-window default (3), "NEW = published within 24 h", and
      podcasts = YouTube playlists in v1 (RSS out of scope). If the owner does not object, proceed as specified.

## Phase 1 — Sources: playlists (and therefore podcasts) can be subscribed

- [x] **P1.0 (Red/Green) — prerequisite found in P0.1:** populate `publishedAt`. Every AVAILABLE row currently has
      `publishedAt = NULL` (629/629), so nothing about "today" or recency can work. Backfill existing rows from the
      391 `*.info.json` files next to the downloads (`upload_date`/`timestamp`), and store it on every new poll and
      download. Tests: info-file parse, idempotent backfill, new-download writes the date.
- [ ] **P1.1 (Red/Green)** Poller/route accept `PLAYLIST` URLs: infer kind from the URL (`playlist?list=` → PLAYLIST,
      `@handle`/`channel/` → CHANNEL), poll newest-first with a bound, and record `lastError` honestly.
      Tests: kind inference, playlist polling path, existing channel behaviour unchanged.
- [ ] **P1.2** `options.keepLatest` is honoured by the subscription create/update path (default 3, clamped 1..20, no UI).
- [ ] **P1.3** Live proof: subscribe one real playlist (a podcast-shaped one), confirm poll + at least one download
      receipt; keep it enabled as the test source.

## Phase 2 — Freshness is the primary axis

- [x] **P2.1 (Red/Green)** `GET /api/youtube/latest` — newest across enabled sources, `publishedAt` desc, with
      `ageLabel` ("today"/"2h"/"yesterday"/"4d") and `isNew` (published within 24 h); route tests including an
      empty library and a library with only old videos.
- [ ] **P2.2 (Red/Green)** `GET /api/youtube/sources` — per-source row data (title, kind, newest published, kept count).
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
- [ ] **P3.4 (Red/Green)** Purge quarantined files after 7 days (`youtube-quarantine-purge`), manifest retained.
- [ ] **P3.5** Live proof: with 4 completed videos in a source and `keepLatest = 3`, the 4th is quarantined, the
      3 newest stay playable, and the TV shows exactly the kept ones.

## Verified so far (2026-11-20)

- `publishedAt` backfilled from info sidecars (3be80d3f); `/api/youtube/latest` returns dated rows (7b4bd734).
- TV YouTube screen leads with the **Latest** strip and age pills — device frame at
  `/tmp/yt-latest4.png`, APK **129 / 1.4.5** installed (`/config/client-updates/manifest.json`).
- The SPA's Subscriptions panel already accepts a channel **or playlist** URL, so "add subscriptions in the SPA"
  needs verification and polish (P2.2) rather than new construction.

## Phase 4 — TV verification + close

- [ ] **P4.1** Walk on the device: YouTube → Latest row → newest episode plays with subtitles → back → older
      episode gone but recoverable from quarantine. Record in `device-20261107/friction-ledger.jsonl` with presses/seconds.
- [ ] **P4.2** Update `tracks.md`, `tech-debt.md`/`lessons-learned.md` if warranted; archive when 100 %.

## Open questions for the owner (answer or I proceed with the default)

1. **Keep window** — default **3** most recent per source. More? (YouTube podcasts often publish weekly; 3 covers two weeks.)
2. **What "delete" means** — quarantine (recoverable, purged after 7 days) rather than an immediate unlink.
3. **Podcasts** — YouTube podcast playlists in v1; RSS audio feeds are a separate track.
