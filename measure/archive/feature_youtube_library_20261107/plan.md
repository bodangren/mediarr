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

## Phase 2: Download + library [checkpoint: d58c9b4]

- [x] Download job (video + metadata + thumbnail) into the YouTube root — `YoutubeDownloadService` (yt-dlp, ≤1080p per Y3, `Title [videoId]` naming, `PENDING→DOWNLOADING→AVAILABLE|FAILED`, exact tool error stored, `.part` cleanup) + `POST /api/youtube/download` bounded batch; 5 tests; **first live download succeeded** (`{attempted:1, downloaded:1, failed:[]}`) — d8241c1
- [x] Scanner/metadata mapping: channel/playlist → episode, title/date/duration/thumbnail — duration and channel are read from the yt-dlp `.info.json` sidecar (flat-playlist figures are often missing) and stored with path/thumb; a corrupt sidecar never fails the download; 6 tests; **live: row 2 stored duration 267 s and channel `Dave Gray`** — 1d52d8c
- [x] Dedupe by video id; partial-download cleanup — `videoId` UNIQUE in the DB plus `queueNewVideos` insert-only-unknown guarantee; `.part`/`.temp` files removed when a download fails, and a "success without a file" is treated as a failure — d8241c1, 1d52d8c
- [x] UI section: playlist → episodes, D-pad navigable — **SPA done**: `/youtube` route + nav group, videos grouped by channel with thumbnail/duration/watched marker and inline playback; live endpoints verified (listing, 206 `0-1023/35160714`, thumbnail 200) and browser-verified in `device-20261107/youtube-spa.jpg` — 05ba691. TV section also done: own model/screen, channel groups, D-pad cards, shared player over the Range stream with manifest skipped; device 1.3.20 (code 44) verified grid + playback, with a clipped-title row-height bug found and fixed on device (`youtube-tv-section.png`, `youtube-tv-playback.png`) — d58c9b4

## Phase 3: Retention [checkpoint: db7fdbf4]

- [x] Watched-state integration — `applyYoutubeProgress` (clamp to duration, watched at 95%, monotonic, `watchedAt` once) with 14 domain tests, `POST /api/youtube/videos/:id/progress`, and the TV reporter wired for `mediaType youtube`; live: curl 100→not watched, 430/441→watched, device playback updated position/lastPlayedAt — b9bf18e
- [x] Eligibility rule: watched + retention days (default 7) — `retentionEligible` (subscriptions only, archive excluded per G9, custom window) with tests; `GET /api/youtube/retention/candidates` dry-run list; live: back-dated watched row appeared, restored row disappeared — 5f4f8858
- [x] Quarantine move/restore/delete with manifest; dry-run first — reuses `planQuarantine`/`executeQuarantine`; `planYoutubeRetention` + `runYoutubeRetention` (dry-run default, EXDEV copy+verify, JSONL manifest), `POST /retention/run|restore|purge` (restore/purge guarded to the quarantine root); 6 tests; **live round-trip** on a throwaway file: dry run untouched → moved+QUARANTINED+manifest → restored byte-identical → re-run+purge deleted+DELETED — db7fdbf4
- [x] Nightly retention job + receipt — `youtube-retention` cron `45 5 * * *` in the existing Scheduler, sharing `runRetention` with the manual endpoint; every run appends a JSONL receipt (counts + moved/failed ids) under CONFIG_DIR; `GET /api/youtube/retention/receipts`; live receipt verified — cf31c883

## Phase 4: Automation + verification [checkpoint: e86f9362]

- [x] Deterministic subscription poll (plugin/native task) downloads new entries; the agent is used only for ambiguity. Reports new downloads and failures; no silent skip — `youtube-poll` hourly (`:20`) + `youtube-download` every 20 min (bounded batch of 2), each writing a JSONL receipt; live poll: 463 seen, 25 queued PENDING, receipt written — 0eec7ed
- [x] Forced `yt-dlp` failure produces an alert with the tool error — a real bot-check failure marked the row FAILED with yt-dlp's message and the receipt recorded it; `downloadPending` now routes failures to `NotificationDispatchService.notifyYoutubeFailure` (SSE `notification:youtube-failure` + journal alert channel while no transport is configured); the fix itself (browser cookies via env) was verified against the same video — 09a1ea3
- [x] TV device check: subscribe → download → play → watch → retire — subscribe (Dave Gray, live poll), download (real yt-dlp+transcode, 57 MB), play on the box (`device-20261107/youtube-tv-e2e-play.png`), watch (device reporter stored position 28 + lastPlayedAt), retire (watchedAt back-dated as test setup: dry run listed the file, real run moved it to quarantine + QUARANTINED, restore returned it byte-identical); stale DOWNLOADING claims now recover to PENDING after 30 min — 7ebeae6e
- [x] Remove all jellyfin-go references — no code, dependency or unit references remain: grep over `server/src`, `app/src`, `clients/mediarr-client/lib` and `package.json` is clean; the only mentions are historical prose in `automation/PROVISIONING.md` and measure docs naming the retired service — 8e12b86
- [x] Import the 262 existing `/data/Youtube` files as unmanaged archive — `YoutubeArchiveImporter` (.nfo title/runtime, `<stem>-poster.jpg` artwork, 11-char deterministic synthetic ids, idempotent, source IMPORT, retention-ineligible); live dry + real: scanned 265, imported 263, skipped 2 existing, channels CodeStoic 132 / Codevelution 92 / Dave Gray 38 / Uncategorized 1; listing now returns all 265 and the SPA shows the archive with posters — e86f9362
- [x] Three-model screenshot review of the YouTube TV + SPA screens (owner request: review each new screen with Kimi K3.1 Pro, MiMo 2.6, MiniMax M3.1 Flash; implement the consensus P0/P1) — 9 per-image reviews + `yt-consolidated.md`; implemented TV typography/duration pills/channel ordering/control hint and SPA title clamp/pills/wording; 1.3.22 (code 46) device-verified in `device-20261107/youtube-tv-review-fixes.png` — 54a626

## Phase 5: Close

- [ ] Acceptance criteria verified on the TV box.
- [ ] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md`; archive.
