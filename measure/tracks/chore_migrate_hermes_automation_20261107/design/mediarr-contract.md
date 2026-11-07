# Mediarr contract for the automation successor (Brief C)

**Author:** `mediarr-contract` · 2026-11-07 · read-only inspection of `server/src/`, `server/src/db/schema.ts`,
and the live old scripts in `~/tools/jellyfin-tools/`. Every row cites `path:line`. Where the brief's
presumed gaps were wrong (torrent queue control, subtitle acquisition), the source wins.

Labels: **(a)** exists, only needs enabling · **(b)** exists but unreachable to an automation layer
(exact missing piece named) · **(c)** does not exist (verified by absence, method noted) · **(d)** observability.

## 1. Capability table

### 1.1 Scheduling, triggers, receipts

| Capability | Class | Evidence |
|---|---|---|
| Six native scheduler jobs: `rss-sync` (cron from `settings.schedulerIntervals.rssSyncMinutes`, default 15; inventory measured 12), `import-list-sync` (`0 */6 * * *`), `wanted-search` (`*/wantedSearchMinutes`, default 60), `subtitle-wanted-search` (`*/max(5, availabilityCheckMinutes)`, default 30), `library-scan` (default `0 2 * * *`, metadata `refreshAll` as afterScan hook), `auto-update-check` (`0 4 * * *`) | (a) | `server/src/serviceContainer.ts:575-579,591,605-615,619-631,637-656`; defaults `server/src/repositories/AppSettingsRepository.ts:128-132`; cron default `server/src/services/Scheduler.ts:592` |
| Per-run execution ledger: RUNNING→SUCCESS/FAILED row with duration + errorMessage, 100 retained per task | (d) | `server/src/services/Scheduler.ts:475-539` (record `:488-494`, success `:496-503`, failure `:504-513`, prune `:530-536`); table `server/src/db/schema.ts:727` |
| Overlap suppression (one run per task at a time) and missed-run recovery at startup from persisted nextRun | (a) | guard `server/src/services/Scheduler.ts:481-483`; recovery `:341-441` |
| Manual trigger + history HTTP: `POST /api/scheduler/:taskId/trigger`, `GET /api/scheduler/tasks`, `PUT .../toggle`, `PUT .../interval`, `GET /api/scheduler/history` | (a) | `server/src/api/routes/schedulerRoutes.ts:58,75,90,132,153` |
| Task API for agents: `GET /api/tasks/scheduled` (lastRun/nextRun/enabled/running), `GET /api/tasks/history` (filter `status=success\|failed`, `taskName`), `GET /api/tasks/history/:id`, `POST /api/tasks/scheduled/:taskId/run` | (a) | `server/src/api/routes/systemRoutes.ts:360,392-429,432,445-493` |
| Trigger responses don't carry the execution row id (`executionId: -1` hardcoded; the other trigger returns only taskId+queuedAt although `create()` returns the row) | (b) | `server/src/api/routes/schedulerRoutes.ts:144-147`; `server/src/api/routes/systemRoutes.ts:459-492`; row id exists at `server/src/services/Scheduler.ts:489` — missing: return it |
| Running task cannot be cancelled (documented limitation) | (b) | `server/src/api/routes/systemRoutes.ts:496-505` |
| `listJobsMeta.status` is binary `healthy`/`disabled` although the contract union has `warning`/`error`; failure truth lives in history, not task status | (b) | `server/src/services/Scheduler.ts:148` vs `server/src/contracts/scheduler.ts:1-10` |
| Interval persistence map knows `rss-sync`/`availability-check`/`wanted-search` but the subtitle job is named `subtitle-wanted-search`, and `library-scan` is absent — rescheduling those two doesn't persist to settings | (b) | `server/src/api/routes/schedulerRoutes.ts:38-42` vs `server/src/serviceContainer.ts:611-615,619` |

### 1.2 Acquisition: wanted, RSS, search, torrents

| Capability | Class | Evidence |
|---|---|---|
| Wanted queue (successor to `wanted.jsonl`): `POST /api/wanted` (create, `searchNow`), `GET /api/media/wanted`, `GET /api/movies/missing`, `GET /api/episodes/missing` | (a) | `server/src/api/routes/mediaRoutes.ts:134,560-625`; `movieRoutes.ts:132`; `seriesRoutes.ts:246` |
| Wanted auto-search: scheduled `wanted-search` task calls `autoSearchAll()`; per-item `POST /api/media/:id/auto-search` (movie/episode answer synchronously; series is fire-and-forget) | (a)/(b) | task `server/src/serviceContainer.ts:605-608`; route `server/src/api/routes/mediaRoutes.ts:476-533`; `POST /api/wanted/search-all` fire-and-forget `:465-473` — missing on the async paths: a run id/receipt in the response |
| Idempotency: releases upsert on indexer `guid`; concurrent `autoSearchAll` suppressed; task overlap guard | (a) | `server/src/services/RssSyncService.ts:118-121`; `server/src/services/WantedSearchService.ts:16,300`; `server/src/services/Scheduler.ts:481-483` |
| Event-driven acquisition (continuous class, already native): `release:stored` → auto-grab for monitored items (score threshold 50) | (a) | `server/src/services/RssMediaMonitor.ts:8,17-19` (wired `serviceContainer.ts:750`); emit `RssSyncService.ts:145` |
| Manual search + grab: `POST /api/releases/search`, `/api/releases/grab`, `/api/releases/grab-candidate`, `POST /api/media/search`, `GET /api/search` | (a) | `server/src/api/routes/releaseRoutes.ts:79,157,203`; `mediaRoutes.ts:216,241` |
| **Torrent queue control exists over HTTP**: list/detail/add, pause, resume, remove (`?deleteData`, default true), priority, bulk, retry-import, speed-limits — the brief's presumed (c) is wrong | (a) | `server/src/api/routes/torrentRoutes.ts:23,49,74,113,141,169,204,240,310,338` |
| Seeding/queue policy (seed ratio, seed time, limit action, maxActiveDownloads) enforced natively | (a) | `server/src/serviceContainer.ts:732-747` (SeedingProtector start), `server/src/services/SeedingProtector.ts:35` |
| Auto-import of completed downloads: `torrent:completed` → import pipeline; `torrent:seeding_complete` handled (successor to fetch-monitor's move step) | (a) | `server/src/services/ImportManager.ts:55,61`; emit `server/src/services/TorrentManager.ts:829,234` |
| Import recovery: `POST /api/activity/:id/retry-import`, `PATCH /api/activity/:id/fail` | (a) | `server/src/api/routes/operationsRoutes.ts:198,214` |
| Downloads-staging audit ("delete folder only when library match exists", `downloads-tidy`): no equivalent logic; removal is API-driven only | (c) | no staging-audit service in `server/src/services/`; only removal `torrentRoutes.ts:169` |
| TPB top-100 browsing / YTS / EZTV / YouTube via browser: no such source in Mediarr; indexers are torznab/scrape (`server/src/indexers/`) | (c) | scope decision D3 `spec.md:46-47` |

### 1.3 Library, metadata, subtitles

| Capability | Class | Evidence |
|---|---|---|
| Library scan (reconcile DB↔filesystem): scheduled daily 02:00 + `POST /api/library/scan` | (a) | `server/src/serviceContainer.ts:619-631`; `server/src/api/routes/libraryRoutes.ts:9-22` |
| Per-series file re-link (nearest to jellyfin-go per-item refresh): `POST /api/series/:id/rescan` | (a) | `server/src/api/routes/seriesRoutes.ts:763-900` |
| Bulk refresh metadata: `POST /api/metadata/refresh` (refreshAll; failures counted, not thrown) | (a) | `server/src/api/routes/metadataRoutes.ts:9-15`; `server/src/services/MetadataRefreshService.ts:27-36` |
| **Per-item metadata refresh**: `refreshMovie()`/`refreshSeries()` exist but `ApiDependencies` exposes only `refreshAll`; no route accepts an id | (b) | `server/src/services/MetadataRefreshService.ts:106,141`; `server/src/api/types.ts:166`; missing: `POST /api/metadata/refresh/:type/:id` |
| Subtitle acquisition exists fully: provider CRUD+test, search, download, upload, bulk, wanted queues + per-item search triggers, blacklist, history + stats | (a) | `server/src/api/routes/subtitleRoutes.ts:154,184,235,281,331-488,530,610,671,710-757,1014-1077,773,913`; services `server/src/services/SubtitleAutomationService.ts:75,109,121-126`, `SubtitleInventoryApiService.ts:343,348` |
| Subtitle disk scan per item (idempotent) | (a) | `subtitleRoutes.ts:1248,1305`; idempotency test `subtitleRoutes.scan.test.ts:213` |
| Subtitle **timing/alignment** (subalign equivalent): nothing — no align/offset/timing code anywhere in `server/src` (grep `align|timing|offset` hits only release-parser "batch alignment" prose) | (c) | verified by absence 2026-11-07 |
| Wanted-languages config drives subtitle automation | (a) | `server/src/api/routes/operationsRoutes.ts:51-62`; `server/src/services/SubtitleAutomationService.ts:182` |
| Music domain (music-orchestrator successor): none — no album/track tables, root folders are movie/tv only | (c) | `server/src/db/schema.ts:2-739`; `server/src/repositories/AppSettingsRepository.ts:68-69` |
| Recommendation surfacing / favourites publishing: zero code (grep `recommend|Recommend` in `server/src` = 0 matches); nearest primitive is Collections (create/search/sync) | (c) | verified by absence; `server/src/api/routes/collectionRoutes.ts:154,292,325` |
| Prune / space management (prune-candidates, auto-delete): none. Disk space is read-only reporting; retention exists only for backups, activity rows, task rows | (c) | read-only `server/src/services/SystemHealthService.ts:66`, `server/src/api/routes/dashboardRoutes.ts:126`; `BackupService.ts:186`, `ActivityEventRepository.ts:113`, `TaskExecutionsRepository.ts:134` |
| Organization/import tooling: `POST /api/import/scan`, organize preview+apply (movies/series), import scan+apply | (a) | `server/src/api/routes/importRoutes.ts:59,99,126`; `movieRoutes.ts:640,667,698,729`; `seriesRoutes.ts:1093,1120,1151,1196` |
| Dry-run: no endpoint takes a dry-run flag; preview endpoints (`organize/preview`, `import/scan`) are the only read-before-write surfaces | (b) | `movieRoutes.ts:640`, `seriesRoutes.ts:1093`, `importRoutes.ts:59`; missing: dry-run on destructive ops (torrent delete `torrentRoutes.ts:169`, activity clear `operationsRoutes.ts:172`) |

### 1.4 Playback, sessions, client surface

| Capability | Class | Evidence |
|---|---|---|
| Playback progress / resume / watched in Mediarr's own DB (`PlaybackProgress`): `POST /api/playback/progress`, `GET /api/playback/:id`, `GET /api/playback/continue-watching`, `GET /api/stream/:id`, `GET /api/playback/subtitles/:trackId` | (a) | `server/src/api/routes/playbackRoutes.ts:60,93,129,149,187`; `server/src/db/schema.ts:557`; service `PlaybackService.ts:206-238,240,272,303` (watched threshold `:567`) |
| Jellyfin-protocol surface (clients): `/Sessions/Playing{,/Stopped,/Progress}`, Resume, `POST/DELETE /UserPlayedItems/:id`, `/Shows/NextUp`, `/Items`, artwork, direct play | (a) | `server/src/api/createJellyfinServer.ts:234-273,274-275,276-293,294-299,197-214` |
| `/Sessions` + capabilities registry (in-memory) | (a) | `server/src/api/createJellyfinServer.ts:226-233` |
| `POST /Library/Refresh` on the Jellyfin surface is a **no-op stub** returning `{ok:true}` | (b) | `server/src/api/createJellyfinServer.ts:195` — old jobs that call refresh against Mediarr silently do nothing; missing: real scan hookup or 501 |
| Playback **events** (started/stopped/watched on the bus): none — progress writes DB only; sessions registry emits nothing | (c) | `createJellyfinServer.ts:234-273`; `PlaybackService.ts:206-238` (no `emit`/`publish`); verified by absence |

### 1.5 Health, events, logs (d)

| Capability | Class | Evidence |
|---|---|---|
| `GET /api/health` — indexer severity + scheduler health (scheduledTaskCount, missedTaskCount, lastRecoveryAt) | (d) | `server/src/api/routes/operationsRoutes.ts:259-302`; `Scheduler.ts:458-467` |
| `GET /api/system/status` — db check, root folders, disk space, process, scheduler | (d) | `server/src/api/routes/systemRoutes.ts:227-357` |
| Activity event ledger (who did what to which entity, success flag): emitted from ImportManager, WantedSearch, MediaSearch, Subtitle services, MediaService; query/export/filter/clear HTTP | (d) | emits `server/src/services/ImportManager.ts:62-720`, `WantedSearchService.ts:109-571`, `MediaSearchService.ts:614,824,838`, `SubtitleInventoryApiService.ts:261,467`; `server/src/api/routes/operationsRoutes.ts:134,172,229`; table `db/schema.ts:606` |
| SSE stream `GET /api/events/stream` with events: `heartbeat`, `torrent:stats` (5 s), `activity:new` (1 s poll), `health:update` (3 s poll), `notification:grab/download/seriesAdd/episodeDelete`, `search:querying/parsing/done`, `parser:degraded`, `indexer:healthChanged`, `command:started/completed` | (d) | `server/src/api/routes/eventsRoutes.ts:7`; `server/src/api/eventHub.ts:40-46,57-61`; `createApiServer.ts:59-134,232-256`; `MediaSearchService.ts:477,556,612`; `NotificationDispatchService.ts:70,92,113,143`; `serviceContainer.ts:283`; `IndexerAutoDisable.ts:46`; `systemRoutes.ts:460,474,488` |
| Notification transports for owner-facing alerts: Discord, Email(SMTP), Gotify, Pushover, Slack, Telegram, Webhook — but **no task-failure or scheduler-health trigger** (event types are grab/download/import/seriesAdd/episodeDelete/health) | (b) | `server/src/services/notifications/` (7 transports); `server/src/services/notifications/transport.ts:3-9`; missing: dispatch on `TaskExecution.status=FAILED` |
| Logs: `GET /api/logs/files{,/:filename,/:filename/raw}` etc. via LogReaderService | (d) | `server/src/api/routes/logsRoutes.ts:35-80` |
| Slim mode leaves release/torrent/indexer/subtitle routes unregistered (404) — a slim deployment cannot be automated for acquisition | (d) note | `server/src/api/createApiServer.ts:170-178`; `server/src/config/slim.ts:18` |

## 2. Minimal automation-facing contract

Prefer the existing surfaces; the contract below is what a DSH agent/plus-plugin should code against.
Base URL is the Mediarr API (trusted LAN, no auth — `AGENTS.md` scope).

**Observe (verify its own runs):**
1. `GET /api/tasks/history?taskName=<id>&status=success|failed&page=&pageSize=` → the run receipt
   (startedAt, completedAt, durationMs, errorMessage). Pair with `GET /api/scheduler/tasks` for
   `lastRunAt`/`nextRunAt`/`enabled`. `server/src/api/routes/systemRoutes.ts:392`, `schedulerRoutes.ts:75`.
2. `GET /api/activity?eventType=&sourceModule=&entityRef=&success=&from=&to=` → entity-level receipts
   (grabs, imports, subtitle downloads). `server/src/api/routes/operationsRoutes.ts:134`.
3. `GET /api/health` and `GET /api/system/status` → liveness + `scheduler.missedTaskCount`.
4. Optional push: `GET /api/events/stream` (SSE) `activity:new` / `command:completed` /
   `notification:*`; otherwise poll (2) with `from=` watermark.

**Act (idempotent by construction — evidence in §1.2):**
5. Deterministic work: `POST /api/tasks/scheduled/:taskId/run` (tasks `rss-sync`, `import-list-sync`,
   `wanted-search`, `subtitle-wanted-search`, `library-scan`). Semantics: the handler **awaits
   completion** then returns 202 (`systemRoutes.ts:463-492`); failure → 500 + `TASK_FAILED` activity
   row (`:480-487`). Overlap → 409 `CONFLICT` (`schedulerRoutes.ts:141-143`). Re-running is safe:
   task bodies upsert/guard (§1.2) and each attempt leaves its own ledger row.
6. Judgement work (acquire-next, which release, which sub pack, what to prune): the DSH agent reads
   `GET /api/movies/missing`, `/api/episodes/missing`, `/api/subtitles/wanted/*`, `/api/torrents`,
   then actuates with `POST /api/wanted`, `POST /api/media/:id/auto-search`,
   `POST /api/releases/grab`, `POST /api/subtitles/wanted/.../search`, `POST /api/torrents*`.
7. Dry-run policy until (b) rows land: for destructive ops use read + preview endpoints only
   (`POST /api/movies/organize/preview`, `POST /api/import/scan`); treat `GET .../missing` and
   `GET /api/subtitles/wanted/count` as the dry-run of search jobs.

**Status semantics to adopt verbatim:** `RUNNING|SUCCESS|FAILED` (`db/schema.ts:25`) as the truth;
task `enabled` flag persisted across restarts (`Scheduler.ts:242-251`); 409 = overlap/disabled (retry
later), 500 = run failed (read `errorMessage` from history), 404 = unknown task.

**Small contract extensions worth building (each tiny, all reuse existing code paths):**
- E1 return the execution row id from both trigger endpoints (`Scheduler.ts:489` already has it).
- E2 `POST /api/metadata/refresh/:type/:id` → existing `refreshMovie`/`refreshSeries`.
- E3 dispatch a Notification (webhook) on `TaskExecution` FAILED — closes the "silent failure" hole.
- E4 fire-and-forget routes (`/api/wanted/search-all`, series auto-search) return a run id, or become
  awaited like `POST /api/tasks/scheduled/:taskId/run`.
- E5 give `POST /Library/Refresh` on the Jellyfin surface the real scan, or 501.

## 3. Sequencing recommendation

| Old behaviour | Successor | Switch-off condition (acceptance evidence) |
|---|---|---|
| `fetch-monitor.timer` (move completed downloads, rescan) | `ImportManager` on `torrent:completed` + `library-scan` | one real completed torrent imported into a root folder with an `IMPORT`-type activity row and no manual move; then `systemctl --user disable --now fetch-monitor.timer` |
| `media-orchestrator` FETCH/PREDICT/SUBS steps | `wanted-search`, `rss-sync`, `subtitle-wanted-search` (already enabled) | two consecutive days where wanted/missing counts fall and `/api/tasks/history` shows SUCCESS for the three tasks — **then disable the job**; do not run both or grabs double |
| `media-orchestrator` prune-candidates + report + recommendations | DSH judgement task (agent), report file in `~/media-reports/` | depends on contract E1-E3 + owner decisions below; **cannot switch off yet** |
| `media-orchestrator` per-item refresh | `POST /api/series/:id/rescan` (+ E2) | switch the jellyfin-go calls off **immediately** (target is gone); Mediarr import already updates its own DB |
| `downloads-tidy` | SeedingProtector limits + import pipeline; deletion judgement → agent | after a week with zero orphaned completed folders; until then keep as manual tool |
| `music-orchestrator` | **none** (no music domain) | owner decision D2 — keep or drop, cannot migrate |
| `adult-orchestrator` | Mediarr indexers (D3) or keep webbridge job; prune SQL → `DELETE /api/torrents/:infoHash`/`/api/movies/:id` | D3 decision; the jellyfin-go SQL half must stop now regardless |

**Switch off immediately (no successor needed, evidence in §1):**
1. All jellyfin-go HTTP calls (`POST /Library/Refresh` on :8097, favourites/sentinel publishing) — the
   server is deprecated; and on Mediarr the same call is a stub (`createJellyfinServer.ts:195`).
2. All direct SQL against `jellyfin-go/data/jellyfin.db` (`daily-prune.py:30`, `recommend.py:39`,
   `prioritize-subs.py:31`, `inject-recommendations.sh:37`) — replaced by read APIs in §2.4.
3. `fetch-monitor.py`'s jellyfin-go restart fallback (`fetch-monitor.py:681`) — forbidden by doctrine
   and meaningless against Mediarr.
4. `media-daily.py` + `media-daily` skill — already dead since 2026-08-30 (`inventory.md:93-95`).

**Must land before the old set is fully off:** E1+E3 (receipts + failure alerts, the D4 reliability
bar), one clean week of `wanted-search`/`subtitle-wanted-search` SUCCESS rows, owner answers on D2/D3,
and a decision on favourites→Collections.

## 4. Remaining jellyfin-go dependencies an automation successor inherits

| Old dependency | Where | Replacement |
|---|---|---|
| `POST http://127.0.0.1:8097/Library/Refresh` rescan after each move | `~/tools/jellyfin-tools/fetch-monitor.py:55,662-678` | Mediarr imports its own DB (`ImportManager.ts:55`); manual `POST /api/library/scan` (`libraryRoutes.ts:9`) |
| jellyfin-go login token (`/Users/AuthenticateByName`) | `fetch-monitor.py:645-658`, `inject-recommendations.sh:108` | none needed — Mediarr API is unauthenticated on the trusted LAN |
| `/Items?searchTerm=…` item lookup | `inject-recommendations.sh:54` | `GET /api/search`, `GET /api/movies`, `GET /api/series` (`mediaRoutes.ts:241`; `movieRoutes.ts:28`; `seriesRoutes.ts:112`) |
| `POST /UserFavoriteItems/{id}` + `…/Items/{id}/Rating?rating=6.5` sentinel publishing | `inject-recommendations.sh:22-23,120-124,134-138` | no equivalent concept; nearest: Collections (`collectionRoutes.ts:154,292`) — owner decision |
| SQLite `…/jellyfin-go/data/jellyfin.db` (`items`, `user_data`) for availability, predictions, prune candidates, sub priority | `daily-prune.py:30`, `recommend.py:39,128,173-201`, `prioritize-subs.py:5,31`, `media-daily.py:21` | read-only Mediarr APIs: `/api/movies/missing`, `/api/episodes/missing`, `/api/playback/continue-watching`, `/api/subtitles/wanted/*`, `/api/torrents`, `/api/system/stats` (or read-only SQL on `mediarr.db`; never write) |
| watched/resume state used for sub prioritisation | `prioritize-subs.py:5` (`user_data`) | `PlaybackProgress` (`db/schema.ts:557`) via `POST /api/playback/progress` / `GET /api/playback/continue-watching` (`playbackRoutes.ts:149,129`) |
| jellyfin-go refresh semantics "per-item only, never restart" | doctrine `inventory.md:107-108` | per-item: `POST /api/series/:id/rescan` (`seriesRoutes.ts:763`), subtitle disk scans (`subtitleRoutes.ts:1248,1305`); global: `POST /api/metadata/refresh` (`metadataRoutes.ts:9`) |

## 5. Open questions for the owner

1. **D2:** Music has no Mediarr domain at all. Keep `music-orchestrator` as-is, accept the drop, or
   scope a music module? (Adult is movies/TV-shaped and can ride the normal pipeline once D3 lands.)
2. **D3:** TPB/YTS/EZTV/YouTube via kimi-webbridge vs Mediarr indexers — per source.
3. Favourites/sentinel recommendations: map onto Collections, or drop the publishing behaviour?
4. May automation write `mediarr.db` directly for the analytics `recommend.py` did, or is API-only
   (plus read-only SQL) the rule? Recommendation: API-only.
5. Trigger semantics: accept blocking `POST …/run` (a 30-min wanted-search holds the HTTP call), or
   fund E1 + async execution ids first?
