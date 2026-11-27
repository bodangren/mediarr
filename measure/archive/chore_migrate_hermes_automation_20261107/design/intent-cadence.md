# Intent & cadence — what this household's media system must do

**Brief A (cadence) · 2026-11-07.** Companions: [`../inventory.md`](../inventory.md), [`../spec.md`](../spec.md), [`BRIEFS.md`](./BRIEFS.md).
No DSH API is asserted here (substrate = Brief B; Mediarr capability = Brief C). Every Mediarr claim cites `file:line` so the Lead can verify without taking my word.

## 0. Method

Per behaviour: **what outcome does the owner need** → **how fast must it be true** → **what breaks if it does not happen** → **is judgement actually required, or is this deterministic work with a deterministic owner**.
Rule applied throughout: nothing is justified by "the Hermes job did it". A Hermes step survives only where its *intent* re-derives from the owner's stated need ("what is the intent of the scheduled task, not the exact workflow", `spec.md:24-26`); what cannot be justified is listed in §4 and dropped.
`media-pipeline-invariants` is a hard constraint: judgement stays with the agent, scripts move bytes and fail loudly, no `&&` chains standing in for reasoning, no approval forms for routine work.

## 1. Corrections to the inherited inventory

`inventory.md:126-133` lists Mediarr's six tasks. Three cadence figures must be corrected first — code, not prose, is authoritative:

| Task | inventory says | code says | evidence |
|---|---|---|---|
| `rss-sync` | every 12 min | `*/${rssSyncMinutes}`, **default 15** | `server/src/serviceContainer.ts:575-576`; `server/src/repositories/AppSettingsRepository.ts:128-133` |
| `subtitle-wanted-search` | ~5 min | `*/${max(5, availabilityCheckMinutes)}`, **default 30** | `server/src/serviceContainer.ts:609-610`; `server/src/repositories/AppSettingsRepository.ts:130` |
| `wanted-search` | every 60 min | confirmed, default 60 | `server/src/serviceContainer.ts:605-607`; `AppSettingsRepository.ts:132` |
| `import-list-sync` | 6 h | confirmed `0 */6 * * *` | `server/src/serviceContainer.ts:591` |
| library scan | 02:00 | confirmed `0 2 * * *` | `server/src/serviceContainer.ts:619-622` |
| auto-update | 04:00 | confirmed `0 4 * * *` | `server/src/serviceContainer.ts:637` |

Two consequences:
- **The subtitle cadence is 30 min, not 5.** "5" is only the *floor* of the clamp. Any plan promising sub-10-minute subtitles promises a behaviour the settings cannot produce.
- **That cadence is not durably configurable.** `TASK_INTERVAL_KEY` maps `availability-check` → `availabilityCheckMinutes` (`server/src/api/routes/schedulerRoutes.ts:38-42`), but no task with id `availability-check` is registered (`serviceContainer.ts:579-637` registers `subtitle-wanted-search` at `:613`) and `subtitle-wanted-search` has no `TASK_INTERVAL_KEY` entry. So `PUT /api/scheduler/subtitle-wanted-search/interval` reschedules this process (`schedulerRoutes.ts:116`) but persists nothing, and the cron is re-derived from `availabilityCheckMinutes` at next start (`serviceContainer.ts:609-610`). Subtitle cadence is an **owner-facing setting to repair**, not a cron to tune.

Also: `Scheduler` exports two helpers that are **never registered** — `scheduleActivityCleanup` (`server/src/services/Scheduler.ts:544`), `scheduleTargetedSubtitleSearch` (`Scheduler.ts:609`). The substrate is not short of task slots; it is short of *justified* ones.

## 2. What the substrate already guarantees

The failure that killed Hermes — 42 provider outages, 0 noticed — has no analogue in the deterministic path, because no model is in it. Mediarr already has the pieces a plan should reuse, not rebuild:

| Property | Where it already exists |
|---|---|
| durable run receipt per task | `TaskExecution` `server/src/db/schema.ts:727`; RUNNING → SUCCESS/FAILED + `errorMessage` in `Scheduler.executeRecorded` `server/src/services/Scheduler.ts:475-539` |
| no overlapping runs | `job.running` guard `server/src/services/Scheduler.ts:481`, `:484` |
| missed runs recovered after downtime | `Scheduler.start()` `server/src/services/Scheduler.ts:341-441`; invoked `server/src/serviceContainer.ts:762` |
| owner-readable history | `GET /api/scheduler/history?status=failed` `server/src/api/routes/schedulerRoutes.ts:153-176`; status vocabulary `:55` |
| owner-readable schedule state | `GET /api/scheduler/tasks` `schedulerRoutes.ts:75-88` |
| manual re-run, non-duplicating | `POST /api/scheduler/:taskId/trigger` → 409 if already running `schedulerRoutes.ts:132-151` |
| health | `GET /api/health` `server/src/api/routes/operationsRoutes.ts:259`; `/api/system/status` `server/src/api/routes/systemRoutes.ts:227`; scheduler slice `server/src/services/Scheduler.ts:458-467` |
| activity log + live push | `GET /api/activity` `server/src/api/routes/operationsRoutes.ts:134`; `GET /api/events/stream` `server/src/api/routes/eventsRoutes.ts:8` |
| outbound alert transports | seven — Discord, Email, Gotify, Pushover, Slack, Telegram, Webhook — `server/src/services/notifications/` |

**Caveat the Lead must not miss:** there is no dedicated "automation failed" switch. The only failure-shaped event type is `health` (`server/src/services/notifications/transport.ts:3-9`) and it is gated on the *series-add* toggle (`server/src/services/NotificationDispatchService.ts:229-230`). A task-failure alert built on it is silently suppressed when the owner turns off series notifications, and fires on every series add. **A `taskFailure` event type with its own toggle is a prerequisite for §3's failure-visibility column, not an optional extra.**

**The house pattern for an LLM inside a deterministic pipeline already exists** and should be copied, not reinvented: `ReleaseParser` falls back to regex when the model is unavailable (`server/src/services/ReleaseParser.ts:123`), classifies every degradation into named kinds (`:321-326`), matches model output on an echoed id instead of array position (`:262`, `:281`), and logs the model, the failure and the remediation (`:346-380`). That is exactly the "a provider outage must never look like a no-op" property Hermes lacked.

## 3. Behaviours by cadence class

### 3.0 Why five classes
| Class | Property that makes it right |
|---|---|
| event-driven / continuous | the outcome is due the moment the input lands; a timer adds latency the owner feels, a model adds latency they blame on the server |
| hourly | the input changes over hours (new release, new episode), the work is retry-cheap, and a day of staleness is visible |
| daily | the household's unit of "night": disk ↔ database reconciliation, staging cleanup, one receipt |
| weekly | the input is *taste* — it changes over weeks; a daily re-decision produces churn, not freshness |
| human-initiated | the owner is present and asking; a timer would answer a question nobody asked |

### 3.1 Event-driven / continuous

**C1 — A completed download becomes a library item.**
- **Intent:** a finished download lands in the library, named, organised, visible — with no owner action.
- **Trigger class:** event-driven; the trigger is the torrent's own completion. A timer delays every episode by up to its interval; a model delays it further. Too slow ⇒ the owner presses "search now" and duplicates work.
- **Freshness tolerance:** minutes; effectively zero once the download completes.
- **Idempotency key:** info hash. `ImportManager` subscribes to `torrent:completed` (`server/src/services/ImportManager.ts:55-60`); the handler resolves and persists the payload (`server/src/services/TorrentManager.ts:724-726`, `:752`).
- **Failure visibility:** the activity log records the attempt; the owner can mark it failed and retry from `/api/activity/:id/fail` and `/api/activity/:id/retry-import` (`server/src/api/routes/operationsRoutes.ts:198`, `:214`). A download that completes and never appears is visible without reading logs.
- **Blast radius:** the owner's data organisation — a bad match writes to the wrong library path; containment and payload verification are enforced (`TorrentManager.ts:767-785`).
- **LLM required?** **No.** Byte-moving and matching. Determinism is what makes it survive a dead provider (FR-6, `spec.md:83-84`).

**C2 — A newly imported item immediately joins the subtitle queue.**
- **Intent:** the thing the owner is about to watch has subtitles, without a separate wait.
- **Trigger class:** event-driven, from the import hook: `onMovieImported` / `onEpisodeImported` (`server/src/services/SubtitleAutomationService.ts:121`, `:126`). Hours here are visible as a defect.
- **Freshness tolerance:** the gap between "I can press play" and "there are subtitles".
- **Idempotency key:** `(variantId, language)` in `WantedSubtitle` (`server/src/db/schema.ts:307`); only `PENDING`/`FAILED` are re-fetchable (`SubtitleAutomationService.ts:12`).
- **Failure visibility:** failures are written back as `FAILED` with a warning naming the item (`SubtitleAutomationService.ts:64-70`) and stay re-fetchable, so the next sweep retries rather than silently "succeeding".
- **Blast radius:** a missing or wrong-language sidecar. Contained; the video is untouched.
- **LLM required?** **No** for acquisition; a Chinese-focused provider already exists (`server/src/services/providers/AssrtProvider.ts:35`).

**C3 — Playback position is remembered and the owner can resume.**
- **Intent:** the owner stops a film on the TV and resumes it on the phone at the same second; "continue watching" is populated.
- **Trigger class:** continuous, client-driven — the player reports progress, nothing polls. Stale here means broken.
- **Freshness tolerance:** seconds.
- **Idempotency key:** `(userId, mediaType, mediaId)` — upsert (`server/src/repositories/PlaybackRepository.ts:94`), `markWatched` (`:151`), `markUnwatched` (`:194`); media-type vocabulary `MOVIE | EPISODE` (`server/src/contracts/playback.ts:9`).
- **Failure visibility:** resume surfaces derive from the same rows (`server/src/api/createJellyfinServer.ts:274-275`), so a stale `lastWatched` shows as a wrong resume card. A *missing* client report is invisible today (§6 Q4).
- **Blast radius:** cosmetic; it cannot lose media.
- **LLM required?** **No.** The Hermes jobs never touched it; keep it that way.

**C4 — The system notices, records and reports; the owner sees it without reading logs.**
- **Intent:** "what happened, and did it work?" is answerable from the app.
- **Trigger class:** continuous/event-driven — seconds live, days historical.
- **Freshness tolerance:** seconds (live), days (history).
- **Idempotency key:** activity event id; task execution id (`db/schema.ts:727`).
- **Failure visibility:** this *is* the visibility mechanism — activity events (`api/routes/operationsRoutes.ts:134`), SSE (`api/routes/eventsRoutes.ts:8`), task history (`api/routes/schedulerRoutes.ts:153-176`), health (`api/routes/operationsRoutes.ts:259`).
- **Blast radius:** none.
- **LLM required?** **No.**
- **Bundled here:** a failing indexer must back itself off rather than burn the search budget — event-driven on search failure (`server/src/indexers/IndexerTester.ts:46-47` → `server/src/services/IndexerAutoDisable.ts:22`), keyed by indexer id + failure count (`server/src/repositories/IndexerHealthRepository.ts:36-45`), surfaced via health snapshots (`db/schema.ts:588`). Blast radius is missed releases, not broken media; no LLM. It was never one of the four retired jobs and must survive as part of Mediarr, not be re-implemented as a job.

**C5 — Torrent lifecycle closes itself.**
- **Intent:** a torrent stops seeding at the owner's ratio and its client state is retired, so the download client never becomes a second, invisible library.
- **Trigger class:** continuous. `SeedingProtector` runs its own 60 s check loop (`server/src/services/SeedingProtector.ts:23-25`), started at `server/src/serviceContainer.ts:745-747`.
- **Freshness tolerance:** minutes.
- **Idempotency key:** info hash (`server/src/services/TorrentManager.ts:190`, `:231`).
- **Failure visibility:** torrent status is persisted (`TorrentManager.ts:719`, `:786`) and surfaced through the torrent routes; a stuck torrent is a row with a stale status.
- **Blast radius:** the owner's upload bandwidth and client state — it cannot delete library content, because the library copy is a separate import.
- **LLM required?** **No.**
- **This is the successor to `fetch-monitor.timer`** (every 10 min, `inventory.md:52-57`): same intent — "finished work is noticed and retired" — but event-driven and internal. The 10-minute cadence was the price of a script that could not see a torrent finish; Mediarr can (`TorrentManager.ts:724-726`).

### 3.2 Hourly

**H1 — Everything the owner declared wanted is searched for, and the best release is grabbed.**
- **Intent:** a film or episode the owner asked for eventually arrives, at the quality the owner's profile specifies.
- **Trigger class:** hourly — monitored-but-missing items are searched on the hour (`serviceContainer.ts:605-607`, default 60). Too slow ⇒ the owner waits a day for a film released years ago. Too fast ⇒ indexer rate limits and repeated queries for the same missing item; the search is not free.
- **Freshness tolerance:** a day for films (availability rarely changes), an hour for episodes (aired weekly, watched immediately).
- **Idempotency key:** the wanted-set entry plus the torrent info hash at grab time; the search already skips items whose air date has not passed (`server/src/services/WantedSearchService.ts:278`, `:30`) and prefers season packs only once the season has aired (`:267`, `:383`).
- **Failure visibility:** the task execution row turns FAILED with a message (`db/schema.ts:727`; `Scheduler.ts:475-539`), visible at `/api/scheduler/history?status=failed` (`schedulerRoutes.ts:153-176`). **The missing case is "ran, searched, found nothing"** — a SUCCESS row with zero results, indistinguishable from a healthy idle hour (§6 Q3).
- **Blast radius:** the download client and the indexers. A wrong grab wastes bandwidth and is recoverable by deleting the torrent and correcting the quality profile.
- **LLM required?** **Not on the hot path — the decision the Lead must ratify.** Mediarr already selects deterministically: candidates scored (`server/src/services/MediaSearchService.ts:434`), sorted (`:608`, `compareReleasesForRanking`), de-duplicated by info hash (`:611`), top candidate grabbed (`:675`, `:696`) using the owner's custom formats (`server/src/services/CustomFormatScoringEngine.ts:433`, `:460`). *Recommendation:* keep the hot path deterministic and move the judgement **upstream into owner-authored custom-format rules** — the agent helps write the rules once, the rules then run forever. If scoring proves insufficient for a case, the right shape is an agent-assisted **release review that never blocks the grab** (a missed review degrades to the deterministic pick, never to a stalled library). Do **not** put an LLM call in the hourly loop: that shape produced the 42 silent failures.

**H2 — Missing subtitles in the owner's wanted languages are fetched.**
- **Intent:** every library item has subtitles in the languages the owner configured.
- **Trigger class:** short-interval — a subtitle must land before the owner presses play. Current cadence is 30 min by default (`serviceContainer.ts:609-610`; `AppSettingsRepository.ts:130`); target ~5–10 min, and §1 notes the knob must be repaired before it can be set.
- **Freshness tolerance:** minutes for a fresh import (covered by C2 anyway), hours for a backfill.
- **Idempotency key:** `(variantId, language)` in `WantedSubtitle` (`db/schema.ts:307`); only `PENDING`/`FAILED` re-fetched (`SubtitleAutomationService.ts:12`).
- **Failure visibility:** `FAILED` rows with the error logged (`SubtitleAutomationService.ts:64-70`) plus per-cycle counters `downloaded / failed / queued` (`SubtitleAutomationService.ts:14-18`).
- **Blast radius:** a wrong-language or badly-synced sidecar; contained per item, the video is never touched.
- **LLM required?** **No** for acquisition. The one genuine judgement — *which* pack is the right cut when several exist — belongs to W3, not H2.

**H3 — The release feeds are re-read so "something new exists" is known.**
- **Intent:** when the owner follows a show or a list, a new episode or release is noticed within hours rather than weeks.
- **Trigger class:** hourly is the intent-derived cadence; 15 min (`AppSettingsRepository.ts:129`) is over-driven for a feed that updates hourly-to-daily. Too slow ⇒ a new episode is discovered days late. Too fast ⇒ indexer traffic with no new information, because an unchanged feed returns the same rows.
- **Freshness tolerance:** hours for TV, a day for a curated list.
- **Idempotency key:** `(indexerId, feedId, itemKey)`; RSS releases are keyed by the indexer's own release id (`db/schema.ts:467`).
- **Failure visibility:** the task execution row plus indexer health snapshots (`db/schema.ts:588`).
- **Blast radius:** indexer reputation and local DB churn only.
- **LLM required?** **No** for the fetch. The AI in Mediarr's release path is a *title parser* with a regex fallback (`server/src/services/ReleaseParser.ts:123`) — keep it there, where its failure is loud (`ReleaseParser.ts:346-380`). **Import lists are a different cadence** (D4): human-curated, so they change over days.

### 3.3 Daily

**D1 — The database and the disk are reconciled, and missing artwork is repaired.**
- **Intent:** what the app shows matches what is on the 4 TB disk, and every item has a poster, a backdrop and an overview.
- **Trigger class:** daily at 02:00 (`serviceContainer.ts:619-622`) — a whole-library pass, cheap once a night, wasteful hourly.
- **Freshness tolerance:** a day; a hand-edited library is off-book for at most a night.
- **Idempotency key:** filesystem path per row (`db/schema.ts:45`, `media.path`); the backfill touches only rows whose `posterUrl`/`backdropUrl`/`overview` are null (`server/src/services/MetadataRefreshService.ts:49-61`, `:186`).
- **Failure visibility:** the scan summary carries counts including `subtitleFilesDetected` and `durationMs` (`server/src/services/LibraryScanService.ts:4-11`), and the backfill runs **only if the scan succeeded** (`serviceContainer.ts:624-629`; guard stated at `server/src/services/Scheduler.ts:583-585`) — a failed scan cannot pile provider traffic onto a broken state.
- **Blast radius:** metadata only; the scan reads and adds rows, it does not delete files.
- **LLM required?** **No.** Deterministic backfill owned by Mediarr. Replaces `acquire-posters.py` (341 LOC) and `fetch-episode-nfo.py` (224 LOC) (`inventory.md:87`, `:89`) — but see §4 for the NFO half, which is dropped, not migrated.

**D2 — The staging area is emptied, and only of things proven to be in the library.**
- **Intent:** the download staging directory does not grow without bound, and the owner never loses a download that has not safely reached the library.
- **Trigger class:** daily — housekeeping, not a reaction to an event. Too fast ⇒ a download in flight is judged "done" before the library copy exists. Too slow ⇒ the staging disk fills and aborts active downloads.
- **Freshness tolerance:** a day of staging residue is harmless; a day of *stalled* downloads is visible on the downloads page.
- **Idempotency key:** the library-match proof, not a timestamp. The Hermes rule — delete a completed folder only when a matching file exists in the library (`inventory.md:40-43`) — is the right invariant and must be preserved verbatim.
- **Failure visibility:** the count removed **and** the count skipped because no library match was proven must both be recorded; "0 removed" and "removed nothing because nothing was done" are otherwise indistinguishable. A receipts requirement, not a reporting preference.
- **Blast radius:** **irreversible deletion of the owner's downloads.** Mitigation is structural: never delete on a heuristic, delete only on a proven library match, and make the job's dry-run list part of its receipt.
- **LLM required?** **No.** A script that decides to delete is exactly the banned class (`inventory.md:97-104`). Deterministic rule, loud failure. **Also dropped from the old job:** removing 100 %-done torrents whose source is gone (`-rad`, `inventory.md:42`) — a torrent-client mutation with no library proof behind it; if wanted, it belongs to C5, where the ratio limit already decides when a torrent retires (`TorrentManager.ts:190`, `:231`).

**D3 — One nightly receipt for the whole system.**
- **Intent:** in one artefact the owner can see what ran, what succeeded, what failed, and what changed in the library.
- **Trigger class:** daily, after the night's work — a receipt is only meaningful once the day's jobs have run.
- **Freshness tolerance:** 24 h. A missing receipt is itself the signal (FR-4, `spec.md:79-80`).
- **Idempotency key:** the date; one artefact per date, overwritten, not appended.
- **Failure visibility:** the receipt *is* the visibility, but only if absence is loud — the criterion should be **a missing or stale receipt raises an alert**, not merely "the file was not written". The Hermes habit of a per-day markdown file in `~/media-reports/` (`inventory.md:80`) is worth keeping (acceptance criterion 3, `spec.md:95`) but must be **rendered deterministically from the database**, not written by an agent turn.
- **Blast radius:** none.
- **LLM required?** **No** for the receipt. **Yes** for the weekly narrative (W2).

**D4 — The owner's curated lists are re-read.**
- **Intent:** items the owner curated into a list are re-added to the wanted set so they are actually searched for.
- **Trigger class:** daily, not 6-hourly — a curated list changes over days (`serviceContainer.ts:591` runs `0 */6 * * *`). Too slow ⇒ a list edit takes a day to act. Too fast ⇒ repeated TMDB list fetches (`server/src/services/importLists/TMDBListProvider.ts`, `TMDBPopularProvider.ts`) for an unchanged list, and re-adds of items the owner deliberately excluded.
- **Freshness tolerance:** a day.
- **Idempotency key:** the import-list id plus the item's external id; exclusions are a first-class table (`db/schema.ts:739`).
- **Failure visibility:** the sync returns per-list results and an added count (`serviceContainer.ts:593-598`); a failing list must be named in the receipt, not averaged into a total.
- **Blast radius:** the wanted set — a bad list adds junk that is then searched for and grabbed, which is why the exclusion table matters.
- **LLM required?** **No.**

### 3.4 Weekly

**W1 — Space is reviewed and prune candidates are named.**
- **Intent:** the owner learns what could be removed to reclaim space, before anything is removed.
- **Trigger class:** weekly — deleting media is irreversible, and a weekly rhythm shows the pattern (this genre always fills up) rather than reacting to a full disk. Too fast ⇒ churn and re-downloads of things the owner wanted. Too slow ⇒ the disk fills unexpectedly.
- **Freshness tolerance:** a week; space does not change fast enough to justify a daily judgement.
- **Idempotency key:** the candidate's media id plus the rule that selected it; a candidate already named must not be re-named each week.
- **Failure visibility:** Mediarr can *report* disk usage (`server/src/api/routes/systemRoutes.ts:262-264`; `server/src/api/routes/dashboardRoutes.ts:40-83`) but has **no content-prune capability at all** — the only `prune` in the codebase trims run records (`server/src/repositories/TaskExecutionsRepository.ts:134`). W1 is a gap, not a migration.
- **Blast radius:** **the highest of any behaviour — deletion of owned media.** Here "no approval forms" must be read narrowly: no approval form for *routine* work, but deleting the owner's content is not routine. The safe shape is **name candidates, delete nothing**; deletion stays human-initiated (X4) until the owner explicitly authorises unattended deletion.
- **LLM required?** **Yes, for the judgement** (watched long ago, not on any list, not a duplicate, not still seeding) — and that judgement belongs to an agent, per doctrine. **No** for the measurement, which is deterministic.

**W2 — A watch-next list is produced.**
- **Intent:** the owner opens the app and has something to watch that suits them, without browsing.
- **Trigger class:** weekly, plus on demand — taste does not change daily, and a daily re-decision rewrites the list the owner had already decided about. Too slow ⇒ the list is stale but harmless. Too fast ⇒ the list churns and loses the owner's trust.
- **Freshness tolerance:** a week.
- **Idempotency key:** the recommendation set for the week; already-recommended items are not re-recommended.
- **Failure visibility:** Mediarr has **no recommendation surface** — the only related code is resume (`server/src/api/createJellyfinServer.ts:274-275`), which is playback state, not taste. W2 needs a surface that does not exist yet.
- **Blast radius:** an unwanted suggestion is a minor annoyance; a wrong *automatic grab* is not (that is H1 with a corrupted input).
- **LLM required?** **Yes.** Matching taste across a watched history and a catalogue is judgement with no deterministic rule that generalises. This is the one recurring behaviour where an LLM is unambiguously the right instrument — and it is safe because nothing downstream depends on it.

**W3 — The rules that decide releases and subtitles are reviewed.**
- **Intent:** the quality profile and custom formats keep matching the owner's actual taste, so H1 and H2 get better without the owner rewriting them.
- **Trigger class:** weekly or on demand, judged by the owner — judgement over configuration. If it needed weekly attention it would be a chore, not a system.
- **Freshness tolerance:** months, honestly.
- **Idempotency key:** the rule-set version; a review that changes nothing produces no diff.
- **Failure visibility:** a rule set edited into producing worse picks is visible in the grab log, not in the rule set.
- **Blast radius:** the rules drive every grab (H1) and every subtitle pick (H2) — a bad edit is felt across the whole library.
- **LLM required?** **Yes, and only here.** The agent reads recent grabs and proposes rule changes; the owner accepts them. This is where the LLM judgement Hermes spent four cron jobs on actually belongs: **once, at rule-authoring time, instead of on every run.**

### 3.5 Human-initiated

**X1 — "Add this and get it."**
- **Intent:** the owner names a title; the system creates the wanted entry and searches immediately.
- **Trigger class:** human-initiated — the owner is present; a timer would answer a question nobody asked.
- **Freshness tolerance:** immediate; a delay here reads as a broken button.
- **Idempotency key:** the external id (tmdb/tvdb/imdb) on the media row; `POST /api/wanted` with `searchNow` already exists (`server/src/api/routes/mediaRoutes.ts:560-581`, `:390-392`).
- **Failure visibility:** the media row's `availability`/`status` and the task execution row for the triggered search; a failed search is visible in `/api/scheduler/history`.
- **Blast radius:** one search request and, if a release is grabbed, bandwidth. The Hermes `wanted.jsonl` file (`inventory.md:81`) has no successor and needs none — an API the owner can use beats a file the owner appends by hand.
- **LLM required?** **No.** If the owner types a vague title, Mediarr's provider lookup resolves it; an LLM is a fallback, not the mechanism.

**X4 — "Delete this now."**
- **Intent:** the owner removes one item they no longer want, on demand, with the consequences understood.
- **Trigger class:** human-initiated — the owner has already made the judgement, so a timer would only add delay and risk.
- **Freshness tolerance:** immediate.
- **Idempotency key:** the media id; deleting twice is a no-op, not an error.
- **Failure visibility:** the activity log (`api/routes/operationsRoutes.ts:134`) records the removal; the owner sees it in the same place they saw everything else.
- **Blast radius:** **irreversible deletion of one item** — and, with it, the seeds and the metadata rows. This is the *only* path that deletes library content until the owner authorises otherwise (§6 Q1).
- **LLM required?** **No.** The judgement is the owner's; the mechanism must be deterministic and must fail loudly if the delete does not complete.

**X2 / X3 / X5 — the remaining manual actions.**
- **Intent:** X2 override one release or subtitle choice; X3 fix a specific item (re-import, re-scan, retry); X5 answer "what did you do today?".
- **Trigger class:** human-initiated for all three. X5 is answered from D3's receipt and `/api/activity` (`api/routes/operationsRoutes.ts:134`), so it needs no schedule; a natural-language question over that data is a one-shot agent request, not a recurring job.
- **Freshness tolerance:** immediate.
- **Idempotency key:** X2 the media/variant id plus the chosen candidate; X3 the task execution id — Mediarr already exposes manual triggers that refuse to double-run (`schedulerRoutes.ts:132-151`, 409 when already running) and a manual retry-import path (`operationsRoutes.ts:214`); X5 the date.
- **Failure visibility:** manual subtitle providers and an upload path exist (`server/src/services/SubtitleInventoryApiService.ts:283`); failed manual work appears in the activity log and the task history.
- **Blast radius:** one item each. No schedule means no unattended blast radius.
- **LLM required?** **No** for the mechanism. **Yes** only for an ad-hoc "find me a better cut" request — a one-shot, owner-triggered agent turn, never a recurring job.

## 4. Do not schedule this

| Dropped behaviour | Why |
|---|---|
| **Music pipeline** (`music-orchestrator`, Sun 02:00; `inventory.md:25`, `:44-46`) | Mediarr cannot represent music: the media model is `MediaTypeEnum = ["TV","MOVIE"]` (`server/src/db/schema.ts:15`) and the 34 tables contain no artist, album or track. The job's real engine was beets + MusicBrainz + YouTube scraping — a different product that happened to share a cron. **Keep beets; run it when the owner wants a tag pass, not as an unattended weekly agent.** It was also the least-exercised job: 8 runs, 2 failures (`inventory.md:25`) — a sample too small to justify an unattended pipeline. |
| **Adult-library top-100 browse + auto-delete** (`adult-orchestrator`, Sun 04:00; `inventory.md:26`, `:48-50`) | Three reasons, any one sufficient. (a) *No model*: `adult` appears only as a TMDB API field on a collection payload (`server/src/services/CollectionService.ts:15`), never on media. (b) *No outcome*: "browse TPB's top 100 and queue 1–3" is the browsing script's habit, not a household need — the need behind it is identical to ordinary wanted items. (c) *Wrong mechanism*: the job auto-deleted a prune candidate by SQL against jellyfin-go's database — an unattended delete of the owner's content, invisible, against a service being removed. If the owner wants this content it must be modelled as ordinary monitored/wanted items in the same pipeline; the only real difference is a tag. **Drop the orchestrator; if the owner wants adult content, it enters through X1 like everything else.** |
| **Per-item jellyfin-go refresh** (`inventory.md:36`) | jellyfin-go is deprecated and its `:8097` surface is being removed (`spec.md:15-16`). A refresh of a service that will not exist is a scheduled call to a dead endpoint. |
| **Publishing favourites into jellyfin-go** (`inject-recommendations.sh`, 315 LOC; `inventory.md:37`) | Same reason, plus the target is gone. W2's successor is a Mediarr surface that does not exist yet — a **build item**, not a scheduled job. |
| **Writing `.nfo` files** (`fetch-episode-nfo.py`, 224 LOC; `inventory.md:89`) | Mediarr *reads* `.nfo` (`server/src/services/ExistingLibraryScanner.ts:41`, `:135-136`) but never writes one — there is no writer in the tree. The intent is portability to other tools; this household runs one server and the owner verifies claims by reading this repo. **No consumer ⇒ no producer.** If portability becomes real, it is a manual export button, not a nightly job. |
| **"Predict the next watch" as a daily cron** (`decide-next-watch`, `recommend.py`; `inventory.md:34-37`) | Split what it actually was: the *recommendation* survives as W2 (weekly, LLM) because the owner asked for watch-next; the *daily* re-prediction does not, because taste is not daily-fresh and a list that rewrites itself every morning is a list the owner cannot rely on. |
| **Acquiring posters as its own job** (`acquire-posters.py`, 341 LOC; `inventory.md:87`) | Subsumed by D1's metadata backfill, already scheduled as the library scan's `afterScan` hook (`serviceContainer.ts:624-629`) and touching only rows missing artwork (`MetadataRefreshService.ts:49-61`). A separate poster job would duplicate work and create a second owner for one outcome — forbidden by FR-2 (`spec.md:77`). |
| **De-duplicating the library as a scheduled job** (`dedupe-movies.py`, 219 LOC; `inventory.md:89`) | De-duplication is a one-time migration for a library built by a previous system, not a recurring condition. Run it once during onboarding; afterwards the import path does not create duplicates. A recurring dedupe job is also delete-adjacent, with weekly blast radius and no justification. |
| **The 10-minute full rescan** (`fetch-monitor.timer --cleanup --no-rescan`; `inventory.md:52-57`) | Replaced by event-driven C5 and the daily scan D1. The 10-minute cadence existed because a shell script could not see a torrent finish; Mediarr can (`TorrentManager.ts:724-726`). Polling the whole library every 10 minutes is 144 scans a day for information that changes a handful of times. |
| **An LLM in the hourly search loop** (the implicit Hermes shape; `inventory.md:138`) | This is the single design decision that killed the old system: 42 provider outages, 0 noticed (`spec.md:11-12`). Mediarr's release selection is already deterministic (`MediaSearchService.ts:434`, `:608`, `:675`) and its LLM use is already fault-tolerant with a regex fallback (`ReleaseParser.ts:123`, `:346-380`). Keep the loop model-free. |
| **One markdown report written by an LLM per Hermes job** (`~/media-reports/downloads-tidy-*.md`, `music-*.md`, `adult-*.md`; `inventory.md:80`) | Acceptance criterion 3 requires `~/media-reports/` to keep its filenames and shapes (`spec.md:95`), so the *artefacts* stay — but they must be **rendered from the database**, not written by an agent turn. An LLM-authored report is a receipt that can be wrong, and it costs a model call per job per day to produce something `TaskExecution` already records (`db/schema.ts:727`). |

## 5. The five behaviours that matter most

1. **C1 — import on completion.** Everything else is downstream of a finished download becoming a library item. Event-driven, model-free, already implemented (`ImportManager.ts:55-60`). If only one thing survives the migration untouched, it is this.
2. **H1 — wanted search, deterministic.** The pipeline's only reason to exist. It must not stop when the provider is down (FR-6, `spec.md:83-84`) — which is exactly why the LLM comes out of the hourly loop. Mediarr already ranks releases deterministically (`MediaSearchService.ts:608`); the remaining work is to keep it that way and to make "searched and found nothing" visible.
3. **C2 + H2 — subtitles: event-triggered, then swept.** Subtitles are the difference between a media server that works and one that is technically correct and unusable for this household. The event trigger (`SubtitleAutomationService.ts:121`, `:126`) makes it feel instant; the sweep is the backstop. The cadence knob must be repaired first (§1).
4. **D3 — the nightly receipt with a loud absence.** The Hermes failure was not that jobs failed; it was that **failure was invisible**. The ledger already exists (`db/schema.ts:727`; `Scheduler.ts:475-539`); the missing pieces are a `taskFailure` notification type with its own toggle (`NotificationDispatchService.ts:229-230`) and an alert when a receipt is absent. Smallest change, largest effect on whether the owner can trust the system.
5. **W2 — watch-next.** The one behaviour where an LLM is unambiguously the right instrument, safe because nothing depends on it, and the owner's stated want. It also needs a surface Mediarr does not yet have — so it is the honest place to spend a model budget, unlike every other behaviour.

**Deliberately not in the top five:** D1 (already implemented, harmless to run late), W1 (highest blast radius, so it is *named* rather than automated), C3–C5 (already correct and already event-driven — they need no migration attention).

## 6. Open questions the Lead must put to the owner

1. **Is unattended deletion of library content ever authorised?** W1 currently names candidates and deletes nothing; X4 is the only deletion path. If the owner wants true unattended pruning, the mechanism must be quarantine-then-delete, not `rm`, and the rules must be owner-authored. **This is the one answer that turns a blast-radius statement into an unattended one.**
2. **Does the music library still belong inside the media server?** Mediarr's model says no (`schema.ts:15`). The honest options are (a) keep beets outside Mediarr and drop it from this track, or (b) make music a separate product. Recommending (a).
3. **Is "searched, found nothing" a failure?** Today a wanted item no indexer has is indistinguishable from a healthy idle hour. The owner should say whether an item wanted for more than N days must raise an alert — that is the difference between "the system is running" and "the system is working".
4. **What is the acceptable staleness of playback progress?** Nothing in the app notices when the client stops reporting. A staleness check on `PlaybackProgress.lastWatched` (`server/src/repositories/PlaybackRepository.ts:94`) would turn a silently broken resume into a visible defect.
5. **Where does the watch-next surface live?** W2 has no home in Mediarr — a Mediarr page, a notification, or a DSH-generated file. The Lead must pick one before the behaviour is scheduled; an unsurfaced recommendation is a behaviour with no outcome.
6. **Does the owner want the nightly receipt at all?** If `/api/scheduler/history` and `/api/activity` are used daily, the markdown receipt in `~/media-reports/` is redundant — but acceptance criterion 3 (`spec.md:95`) requires the filenames to survive, so this is a ratification question, not a design one.
