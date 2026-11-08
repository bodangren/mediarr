# Plan — YouTube series library for Mediarr

> Contract-first + TDD per `measure/workflow.md`. **ACTIVE since 2026-11-08** — Y1–Y5 are ratified
> (spec §Open decisions), so Phase 0 may proceed. Migration note: the 786 existing files under
> `/data/Youtube` are 262 videos (133 webm + 129 mkv) with `.nfo` + thumbnail sidecars; they import as
> an unmanaged archive and are never subject to the watched+7d retention rule (gate G9).

## Phase 0: Ratify scope [checkpoint: 9b7c9e6a]

- [x] Resolve Y1 representation, Y2 retention, Y3 quality, Y4 cadence, Y5 shorts/live — ratified 2026-11-08 (separate library type, quarantine then delete at watched+7d, best ≤1080p, daily poll, shorts skipped / live skipped for v1) — 0723765
- [x] Confirm `yt-dlp` install/update path — installed 2026.10.26 at `~/.local/bin/yt-dlp`, self-updating (`yt-dlp -U`), verified against a live YouTube metadata fetch; `/data/Youtube` holds 262 videos across 3 channels as the import test set  — 9b7c9e6a
- [x] Migration decision: the 786 existing files (262 videos with .nfo + thumbnails) import as **unmanaged archive** and are never subject to watched+7d retention (gate G9); per-poll cap 25 entries to bound a run — 9b7c9e6a

## Phase 1: Domain + subscriptions [checkpoint: a969335]

- [x] Contract tests for library type, subscription table, and idempotent download by video id — `YoutubeLibrary` with 10 tests: video-id normalisation, subscription URL parsing, feed selection (duplicates, shorts/live per Y5, per-poll cap, invalid ids) and `queueNewVideos` single-download + per-entry failure reporting — adece9a
- [x] Schema/type change isolated from `TV|MOVIE` — migration 0013 `YoutubeSubscription` + `YoutubeVideo` (videoId unique, nullable subscription for archive imports, own playback state), client models registered, live tables verified on the running server — 36fd397
- [x] Subscription CRUD API with enabled/options — `GET/POST/PATCH/DELETE /api/youtube/subscriptions`; POST validates with the tested URL parser (video URLs rejected 422, kind mismatch rejected, duplicate URL returns the existing row), PATCH toggles enabled/title; live verified by adding @DaveGrayTeachesCode, rejecting a youtu.be video URL and toggling enabled — c91e7c8
- [x] `yt-dlp --flat-playlist` poller returning new entries; per-entry failure reporting — `YoutubeFeedPoller` (nested channel tabs flattened, dedupe/shorts/cap, per-entry failures, poll error recorded) with POST `/api/youtube/subscriptions/:id/poll`; 6 tests; **live poll of the real Dave Gray channel: seen 463, queued 25 PENDING (cap), skipped 438, no failures** — a969335

## Phase 2: Download + library

- [x] Download job (video + metadata + thumbnail) into the YouTube root — `YoutubeDownloadService` (yt-dlp, ≤1080p per Y3, `Title [videoId]` naming, `PENDING→DOWNLOADING→AVAILABLE|FAILED`, exact tool error stored, `.part` cleanup) + `POST /api/youtube/download` bounded batch; 5 tests; **first live download succeeded** (`{attempted:1, downloaded:1, failed:[]}`) — d8241c1
- [x] Scanner/metadata mapping: channel/playlist → episode, title/date/duration/thumbnail — duration and channel are read from the yt-dlp `.info.json` sidecar (flat-playlist figures are often missing) and stored with path/thumb; a corrupt sidecar never fails the download; 6 tests; **live: row 2 stored duration 267 s and channel `Dave Gray`** — 1d52d8c
- [x] Dedupe by video id; partial-download cleanup — `videoId` UNIQUE in the DB plus `queueNewVideos` insert-only-unknown guarantee; `.part`/`.temp` files removed when a download fails, and a "success without a file" is treated as a failure — d8241c1, 1d52d8c
- [~] UI section: playlist → episodes, D-pad navigable.

## Phase 3: Retention

- [ ] Watched-state integration.
- [ ] Eligibility rule: watched + retention days (default 7).
- [ ] Quarantine move/restore/delete with manifest; dry-run first.
- [ ] Nightly retention job + receipt.

## Phase 4: Automation + verification

- [ ] Deterministic subscription poll (plugin/native task) downloads new entries; the agent is used
      only for ambiguity. Reports new downloads and failures; no silent skip.
- [ ] Forced `yt-dlp` failure produces an alert with the tool error.
- [ ] TV device check: subscribe → download → play → watch → retire.
- [ ] Remove all jellyfin-go references.

## Phase 5: Close

- [ ] Acceptance criteria verified on the TV box.
- [ ] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md`; archive.
