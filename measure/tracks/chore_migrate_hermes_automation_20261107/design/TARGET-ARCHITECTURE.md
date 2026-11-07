# Target architecture — media automation after Hermes

**Status:** PROPOSED for owner ratification (Phase 3). Inputs: three independent designs
([`intent-cadence.md`](./intent-cadence.md), [`dsh-substrate.md`](./dsh-substrate.md),
[`mediarr-contract.md`](./mediarr-contract.md)), graded against source by the Lead.
No production service, task, or profile was modified to produce this document.

## 0. One-page answer

**What must happen hourly and daily needs no model at all.** The old system put an LLM agent
turn inside every loop and paid a 25 % failure rate for it (167 runs, 42 failures, all provider
outages, none noticed — `../inventory.md` §2). Re-derived from intent:

| Class | When | Owner | Model? |
|---|---|---|---|
| Event-driven / continuous | on the event | **Mediarr in-process** (import on `torrent:completed`, subtitle attach, playback progress, seeding retire, indexer backoff) | never |
| Hourly | every 10–60 min | **Mediarr scheduler** (`wanted-search` 60, `subtitle-wanted-search` 10–15, `rss-sync` 15–30) | never |
| Daily | night | **Mediarr scheduler** (library scan 02:00, import lists, auto-update 04:00) + **pure-I/O systemd scripts** (downloads tidy 04:30, receipt 05:00) | never |
| Weekly | Sunday | **DSH scheduled tasks** (watch-next, prune candidates) + monthly rule review | yes — the only model calls left |
| Human | on demand | Mediarr UI/API (add+search, override, retry, delete) | optional |

**The reliability property is not "the agent never fails"; it is "no failure is ever silent."**
Three mechanisms deliver it, and each covers a failure the others cannot:

1. **Receipts.** Every run leaves durable proof: Mediarr `TaskExecution` rows (native), a report
   artifact, and a DSH run-ledger row.
2. **A custom DSH plugin** (`media-automation`) that watches scheduled delivery and the consuming
   `turn/end`, so a provider outage is recorded as a *failed occurrence* (DSH's receipt proves only
   inbox delivery — `dsh-substrate.md` §1.3), then retries within a hard cap and alerts.
3. **An external watchdog timer** that runs even when the DSH Host is down — the one failure the
   plugin cannot see — and alerts on stale/missing receipts and unhealthy services.

This is the combination the owner asked for: **DSH scheduled tasks for judgement, one custom DSH
plugin for outcome attribution and retry, plus an OS-level dead-man for the host-down case.**
Deterministic work stays in Mediarr, because a media server that is not running is broken anyway;
putting it in an agent turn only adds a failure domain (substrate matrix, `dsh-substrate.md` §4).

## 1. Grading of the three designs

All three are accepted. Their conflicts were resolved as follows.

| Source | Accepted | Corrected / constrained |
|---|---|---|
| cadence | intent-first rows, drop list, top-5, "no LLM in the hourly loop" | **Live cadences are 12/20/60 minutes, not defaults 15/30/60.** The live `AppSettings` row has `rssSyncMinutes:12, availabilityCheckMinutes:20, wantedSearchMinutes:60`; `inventory.md` read the live values. The doc's point stands: the *subtitle interval knob is broken* (`TASK_INTERVAL_KEY` maps `availability-check`, but the task id is `subtitle-wanted-search` — `schedulerRoutes.ts:38-42` vs `serviceContainer.ts:611-615`). |
| contract | capability table, torrent-control correction, E1–E5, switch-off conditions | The brief's assumed gap "torrent queue control" was **wrong** — it exists (`torrentRoutes.ts:23-338`). Accepted as a correction. |
| substrate | delivery≠execution, target semantics, plugin capability matrix, ledger design | **Two additions the substrate doc does not cover.** (a) Fresh sessions inherit `DSH_PERMISSION_MODE` from the Host process (`dsh --dump-config`: default `workspace-write`, approval `ask`), so a boot-persistent Host must set it deliberately or unattended writes outside the repo fail closed. (b) A plugin cannot alert while the Host is down; an **external watchdog** is required in addition to the plugin's dead-man. |
| all | — | **Provider history, recorded honestly.** Moonshot (`moonshotai-cn`) was authorized but every request timed out on the first token, killing two planning attempts; the substrate brief was rerouted to DeepSeek, so three families did the work (MiniMax, Xiaomi, DeepSeek). The owner has since replaced that route with `kimi-coding` (profile default `kimi-for-coding`), but **this session's subagent allow-list was fixed at creation and predates the fix**, so Kimi could not review in this session; a new session can use it. |

## 2. What must happen, when, and who owns it

R = receipt, A = alert if missed. "Build" = new work in this track.

### 2.1 Continuous / event-driven (already native; no new scheduling)

| Behaviour | Intent | Owner / evidence | Proof | Build |
|---|---|---|---|---|
| Import a completed download | finished torrent becomes a library item, named and visible | Mediarr `ImportManager` on `torrent:completed` (`ImportManager.ts:55`) | `IMPORT` activity row + item row | none |
| Attach subtitles on import | the thing about to be watched has subs, without a wait | `SubtitleAutomationService.onMovie/EpisodeImported` (`:121,126`) | `WantedSubtitle` rows | none |
| Remember playback position | resume + continue-watching are correct | `PlaybackRepository` upsert (`:94`); Jellyfin surface (`createJellyfinServer.ts:234-299`) | `PlaybackProgress` row | none |
| Retire finished torrents | client never becomes a second invisible library | `SeedingProtector` 60 s loop (`:23-25`) | torrent state | none |
| Back off a failing indexer | one broken indexer cannot stall every search | `IndexerAutoDisable` | `IndexerHealth` row + SSE | none |
| Auto-grab on a new release | a monitored item's release is grabbed when it appears | `RssMediaMonitor` on `release:stored` (`:8,17-19`) | `GRAB` activity row | none |

**Successor to `fetch-monitor.timer`:** this row set *is* the successor. The 10-minute full
rescan existed because a shell script could not see a torrent finish; Mediarr can. No timer.

### 2.2 Hourly (Mediarr scheduler; no model in any loop)

| Behaviour | Cadence | Intent | Proof | Build |
|---|---|---|---|---|
| `wanted-search` | 60 min (native) | every declared-wanted item is searched and the best release grabbed | `TaskExecution` SUCCESS/FAILED | set 60; make "searched, found nothing" visible (E3/alerting) |
| `subtitle-wanted-search` | **10–15 min** (fix knob first) | subs land before playback, then backfill | `TaskExecution` + counters | **fix interval persistence** |
| `rss-sync` | 15–30 min (native; live 12) | new releases are noticed within hours | `TaskExecution` | set 30 (intent says 15 is over-driven) |
| transfer/queue health | continuous | transfers are healthy | torrent rows + SSE | none |

### 2.3 Daily (deterministic; no model)

| Behaviour | Cadence | Intent | Owner | Proof | Build |
|---|---|---|---|---|---|
| library scan + metadata backfill | 02:00 (native) | DB matches disk; missing art repaired | Mediarr (`serviceContainer.ts:619-631`) | scan summary | none |
| import-list sync | 6 h (native; keep) | curated lists feed the wanted set | Mediarr (`:591`) | per-list counts | none (daily is not worth a code change) |
| auto-update check | 04:00 (native) | updates found, never auto-applied silently | Mediarr (`:637`) | task row | none |
| **downloads tidy** | 04:30 | staging empty, only of things proven in the library | **new pure-I/O script + timer** | `downloads-tidy-*.md` + counts | **build** |
| **nightly receipt** | 05:00 | one artifact: what ran, what failed, what changed | **new renderer from `mediarr.db`** | `YYYY-MM-DD.md` + `sub-priority-*.md` | **build** |
| backup | weekly (see 2.4) | recoverable DB | Mediarr `BackupService` exists, **unscheduled** | backup file | **build (schedule it)** |

### 2.4 Weekly (DSH scheduled tasks; the only model calls)

| Behaviour | Cadence | Intent | Blast radius | Proof | Build |
|---|---|---|---|---|---|
| **watch-next** | Sun 03:00 | what to watch next, suited to taste | low — advisory only | `recommendations-YYYY-MM-DD.{md,json}` | **build (DSH task + prompt)** |
| **prune candidates** | Sun 03:30 | name what could be removed, before anything is removed | low if it only names; high if it deletes | `prune-candidates-*.txt` (shape preserved) | **build (DSH task + prompt)** |
| **rule review** | monthly, Sun 04:00 | quality profile / custom formats still match taste; proposes diffs | medium if auto-applied — **propose only** | `rule-review-*.md` | **build (DSH task + prompt)** |
| backup | Sun 02:00 | restorable DB | low | backup file + task row | **build (Mediarr task)** |

**No daily LLM task exists.** The old daily `media-orchestrator` bundled deterministic loops
(wanted, subs, refresh) with judgement (predict-next, prune); the loops are already native and the
judgement is weekly because taste is not daily-fresh (`intent-cadence.md` §3.4). This is the
largest reliability win and the largest simplification: **the provider can be down all week and
every hourly/daily function keeps working.**

### 2.5 Human-initiated (no schedule)

Add + search now (`POST /api/wanted` with `searchNow`), override a release/subtitle, retry an
import, delete an item, ask "what happened". Deletion of library content stays here (see W1).

### 2.6 Dropped, with reasons (`intent-cadence.md` §4)

music pipeline (no music domain in Mediarr — `MediaTypeEnum=["TV","MOVIE"]`, `schema.ts:15`; the
engine was beets/MusicBrainz/YouTube), adult orchestrator (no adult concept; browsing habit, not
an outcome; it auto-deleted by raw SQL), per-item jellyfin-go refresh + favourites publishing
(target deprecated), `.nfo` writing (no consumer), separate poster job (subsumed by scan),
recurring dedupe (one-time migration), the 10-minute rescan (event-driven now), LLM-authored
per-job markdown reports (rendered from DB instead), and **an LLM in the hourly search loop** (the
design decision that produced the 42 silent failures).

`recommendations-injected-*.md` is dropped with the jellyfin-go favourites target. `music-*.md`
and `adult-*.md` are dropped with their jobs. `sub-priority-*.md` survives as a deterministic
render from the subtitle wanted queue (no LLM), because it is an owner-facing priority view that
still has a consumer.

### 2.7 Report filename contract (spec acceptance criterion 3)

`~/media-reports/` keeps these producer/name pairs; the watchdog treats a missing expected file as
a failed run:

| File | Producer | Cadence |
|---|---|---|
| `YYYY-MM-DD.md` | nightly receipt renderer | daily |
| `downloads-tidy-YYYY-MM-DD.md` | downloads-tidy script | daily |
| `prune-candidates-YYYY-MM-DD.txt` | weekly prune-candidates task | weekly |
| `recommendations-YYYY-MM-DD.md` / `.json` | weekly watch-next task | weekly |
| `rule-review-YYYY-MM-DD.md` | monthly rule-review task | monthly |
| `sub-priority-YYYY-MM-DD.md` | nightly receipt renderer | daily |
| `missing-subs-YYYY-MM-DD.md` | nightly receipt renderer (already produced) | daily |

## 3. Ownership rules (FR-1/FR-2)

1. **One owner per behaviour.** Deterministic → Mediarr; judgement → DSH; never both. Running both
   the old job and its successor is a double-grab bug, not redundancy (`mediarr-contract.md` §3).
2. **No LLM where an acceptance check can be written** (`dsh-substrate.md` §5). Release ranking is
   already deterministic: scored (`MediaSearchService.ts:434`), sorted (`:608`), deduped by info
   hash (`:611`), grabbed (`:675`) with owner custom formats. Keep it that way; the LLM helps
   *author* rules once (rule review), not pick every release.
3. **No script decides; scripts move bytes or read data and fail loudly.** Downloads tidy is
   deterministic *proof-based* deletion (library match), never heuristic.
4. **No approval forms for routine work**; deletion of owned content and config changes are not
   routine and stay human-initiated (W1 names candidates; X4 deletes).

## 4. Reliability design (D4)

### 4.1 Receipts — three layers

| Layer | Written by | Contents | Where |
|---|---|---|---|
| Mediarr `TaskExecution` | Scheduler (native) | task, RUNNING→SUCCESS/FAILED, duration, error | `mediarr.db`; `GET /api/tasks/history` |
| DSH `runs` domain | **plugin** (authoritative outcome) | `taskId@occurrenceAt`, deliveredAt, messageId, sessionId, outcome, errorCode, attempts | DSH storage (plugin) |
| Artifacts | tasks/scripts | the files in §2.7; watchdog state | filesystem |

The plugin's ledger is the only place a *delivered-but-failed* turn is visible; the task record has
no outcome field (`dsh-substrate.md` §2). Artifacts satisfy the owner's existing contract
(`spec.md:95`).

### 4.2 Idempotency, overlap, retry

- **Key:** `(task_id, occurrence_at)` — present in both the delivery framing and the receipt
  (`dsh-substrate.md` §6.1). Every prompt starts by reading the ledger: if this occurrence is
  already `ok`, stop. Delivery is at-least-once, so this is mandatory, not optional.
- **Overlap:** Mediarr tasks have a native `running` guard; reuse one Session per DSH task
  (`new_once`) or use `new` where stateless; media *writes* (tidy, prune, import) take one shared
  library lock — cross-task locking is the plugin's job, DSH has none (`dsh-substrate.md` §1.4).
- **Retry:** model-level retry already exists (`dsh-llm-retry`: 5 attempts, backoff; `always` for
  weekly jobs so a wobble does not consume the week). Work-level: plugin retries only
  `TIMEOUT|SERVER|TRANSPORT|RATE_LIMIT` at most twice (+5 min, +15 min), then alerts; auth/config
  errors alert immediately and never retry. Hard cap three attempts.

### 4.3 Dead-man and alerting — who catches what

| Failure | Caught by | Latency |
|---|---|---|
| provider unreachable during a scheduled turn | plugin (`turn/end` error) → ledger + alert (+ retry) | seconds |
| scheduled turn ran but failed at the end | plugin outcome + artifact audit | seconds–minutes |
| DSH Host not running / crashed / rebooted | **external watchdog** (`systemctl --user is-active`, stale ledger) | ≤ 10 min |
| Mediarr server down | **external watchdog** (`/api/health`) | ≤ 10 min |
| Mediarr deterministic task failed | watchdog polls `/api/tasks/history?status=failed` (or E3 notification) | ≤ 10 min |
| host down over an occurrence (DSH collapses misses to one) | watchdog stale check + plugin `host-was-down` on next start | ≤ 10 min / next start |
| "ran, found nothing" | watchdog compares wanted/missing counts + zero-result signal (owner question) | daily |

**Alert channel:** one outbound webhook/ntfy URL in `~/.config/mediarr-automation/alert.env`,
posted by both the plugin and the watchdog with no model involvement. Local file + `systemd-cat` is
the fallback if the network is also down.

### 4.4 Definition of "error-free" (replaces D4)

> **Never silently wrong.** Every expected occurrence either succeeded, was retried, or produced an
> alert. "Always succeeded" is not achievable when a provider can be down; "never silent" is.

Measurable: 100 % of occurrences have a terminal ledger outcome; 100 % of failures alerted < 3 min
(plugin) / < 10 min (watchdog); 0 occurrences with neither ledger row nor alert; 0 duplicate side
effects per idempotency key; one clean week with no silent miss.

## 5. DSH substrate — concrete design

### 5.1 Host (prerequisite, P0)

Run exactly one Host as a systemd **user** unit (linger already enabled on this machine —
verified `Linger=yes`):

```ini
# ~/.config/systemd/user/dsh-host.service
[Unit]
Description=DSH Host (web profile) - scheduler + agent runtime
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=%h/Desktop/mediarr
Environment=DSH_PERMISSION_MODE=danger-full-access   # unattended turns cannot answer approvals
ExecStart=%h/.local/bin/dsh web --no-open --port 3080
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

`DSH_PERMISSION_MODE` is the load-bearing line: the composed sandbox defaults to `workspace-write`
+ approval `ask` (`dsh --profile web --dump-config`); a scheduled turn has no answerer, so writes
outside the repo (e.g. `~/media-reports/`) would fail closed. The alternative — keep the default
and keep every write inside the repo, publishing via the watchdog — is offered as a decision (Q5).
Exactly one Host: the schedule store is Host-wide.

### 5.2 Scheduled tasks (weekly judgement)

Create from a session whose cwd is this repo; target `new` (fresh context each run, state in
files/DB — no transcript drift, no poisoned context), or `new_once` where narrative continuity
earns its cost. RRULE example (Sunday 03:00 Asia/Shanghai):

```
DTSTART;TZID=Asia/Shanghai:20261108T030000
RRULE:FREQ=WEEKLY;BYDAY=SU;BYHOUR=3;BYMINUTE=0
```

| Task | Schedule | Prompt (versioned in repo) | Writes |
|---|---|---|---|
| `media-watch-next` | Sun 03:00 | `automation/prompts/watch-next.md` | `recommendations-YYYY-MM-DD.{md,json}` + ledger |
| `media-prune-candidates` | Sun 03:30 | `automation/prompts/prune-candidates.md` | `prune-candidates-YYYY-MM-DD.txt` |
| `media-rule-review` | monthly, Sun 04:00 | `automation/prompts/rule-review.md` | `rule-review-YYYY-MM-DD.md` |

Thin task prompt: "You are the weekly media judgement run. Read
`automation/prompts/watch-next.md` and execute it exactly. Idempotency key: the
`schedule_id_json` occurrence in this message. On completion write the receipt; on failure exit
loudly." This satisfies FR-8: the prompt lives in the repo, not only in DSH storage.

### 5.3 Custom plugin `media-automation` (the "if necessary" — it is necessary)

One small in-process cordis plugin (no LLM, own timers, durable storage) that:

1. on scheduled delivery, correlates `messageId` (receipt) with the session's `user/message.id`;
2. on `turn/end`, records the occurrence outcome (`ok`/`error`/`timeout`) in a `runs` domain —
   turning "delivered" into "succeeded/failed";
3. retries retryable failures via `ctx.schedule.run({id})` under a hard cap;
4. reconciles every minute: missing terminal outcome or stale cadence → `stale`/`host-was-down`
   alert; shared `locks` table serializes media writes across tasks;
5. exposes the outcome to the external watchdog by writing a small state file (and appending to
   `~/media-automation/runs.jsonl`), so the watchdog does not need to read DSH internals.

Layout in this repo (versioned, installable by path):

```
automation/
  dsh-media-automation/   package.json + cordis.patch.yml + lib/index.js
  prompts/                watch-next.md, prune-candidates.md, rule-review.md
  scripts/                downloads-tidy.sh, nightly-receipt.ts, watchdog.sh
  systemd/                dsh-host.service, automation-watchdog.{service,timer}
```

Install: `dsh plugin --profile web add link:<repo>/automation/dsh-media-automation` (validated as a
mechanism only — installation itself is a Phase 4 step; the substrate doc marks the skeleton
`UNVALIDATED`, `dsh-substrate.md` §7).

### 5.4 External watchdog (the part no plugin can do)

`automation-watchdog.timer`, every 10 min, pure I/O, independent of both Hosts:

1. `systemctl --user is-active dsh-host.service` and Mediarr `GET /api/health`;
2. per-task max-gap map from `automation/expectations.yaml` against `runs.jsonl`/receipts;
3. `GET /api/tasks/history?status=failed` since a watermark;
4. one webhook alert per incident, throttled hourly, plus a local incident ledger.

This is the only mechanism that notices "the DSH Host is down" — the plugin cannot run to report
its own host's absence.

## 6. Mediarr contract and the small extensions it needs

**Use as-is:** `POST /api/tasks/scheduled/:taskId/run` (awaits, 409 on overlap, 500 on failure),
`GET /api/tasks/history`, `GET /api/scheduler/tasks`, `GET /api/health`, `GET /api/activity`,
`GET /api/events/stream`, torrent control (`torrentRoutes.ts:23-338`), wanted/search/grab, subtitle
search/upload, playback progress, import retry (`mediarr-contract.md` §2).

**Extensions (small, each reuses existing code):**

| # | Extension | Why | Prio |
|---|---|---|---|
| E1 | return the execution row id from both trigger endpoints (`executionId:-1` today) | the agent must verify its own run | P0 (D4) |
| E2 | `POST /api/metadata/refresh/:type/:id` → existing `refreshMovie/refreshSeries` | per-item refresh successor; only bulk is exposed | P1 |
| E3 | dispatch a notification on `TaskExecution.status=FAILED` (new `taskFailure` type/toggle) | closes the silent-failure hole without polling | P0 (D4) |
| E4 | fire-and-forget routes return a run id, or become awaited | "search all"/series search leave no receipt | P1 |
| E5 | `POST /Library/Refresh` does a real scan or returns 501 | today it is a no-op stub (`createJellyfinServer.ts:195`) | P1 |

**Genuine gaps, not migrations:** prune/space management (W1 names candidates only — no delete
code exists), recommendations surface (W2 is a report until a surface is chosen), subtitle
timing/alignment (no align code; keep the manual `subalign` tool, defer), music domain (out of
scope), downloads-staging audit (new script), browser-source discovery (D3). SubHD-specific
subtitle handling is replaced by the Chinese-capable Assrt provider; a title that exists only on
SubHD stays a manual download/upload via the existing subtitle upload route.

## 7. Migration sequence (switch-off conditions)

| Step | Work | Switch off when |
|---|---|---|
| P0 | deploy Mediarr always-on; DSH Host unit; alert webhook; watchdog skeleton | both services survive reboot; watchdog alerts a synthetic miss |
| P1 | fix subtitle interval knob; set rss 30 / subs 10–15; E1+E3 | two days of SUCCESS rows for `wanted-search` + `rss-sync` + `subtitle-wanted-search`, no double grabs |
| P2 | downloads-tidy + nightly receipt scripts; weekly backup task | one week of artifacts with zero orphaned staging folders |
| P3 | install plugin; create three DSH tasks; run each manually once | each run leaves a ledger row + artifact; a forced provider failure alerts |
| P4 | disable (never delete) `media-orchestrator`, `downloads-tidy`; disable `fetch-monitor.timer` | one real completed torrent imported with an `IMPORT` row and no manual move |
| P5 | music/adult per owner decision; disable their jobs | decision recorded |
| P6 | one clean week; rollback test (re-enable archived `jobs.json`) | zero silent misses; rollback proven |
| P7 | archive track; update `tech-debt.md`/`lessons-learned.md` | — |

**Immediate, no successor needed:** every jellyfin-go HTTP call and every direct SQL against
`jellyfin-go/data/jellyfin.db`, the restart fallback in `fetch-monitor.py`, and the dead
`media-daily` chain (`mediarr-contract.md` §3). These can stop the moment the old jobs are edited,
because their target is being removed.

## 8. Ordered backlog (Phase 4–6), each with acceptance evidence

| # | Item | Acceptance evidence |
|---|---|---|
| B1 | Mediarr deployed 24/7 (container `restart: unless-stopped` or systemd) | reboot survives; `/api/health` green; scheduler nextRun present |
| B2 | Fix subtitle interval persistence (+ test) | `PUT /api/scheduler/subtitle-wanted-search/interval` persists across restart |
| B3 | E1 + E3 (execution id, task-failure notification) | trigger returns real id; forced task failure sends webhook |
| B4 | DSH Host systemd unit + `DSH_PERMISSION_MODE` | reboot survives; a synthetic scheduled run writes outside the repo |
| B5 | Plugin skeleton + install + `runs`/`alerts`/`locks` | occurrence with a forced provider error records `outcome:error` and alerts |
| B6 | Watchdog timer + expectations map | host stopped → alert ≤ 10 min; host restarted → recovery note |
| B7 | downloads-tidy script + receipt | dry-run=delete counts match; no folder deleted without library proof |
| B8 | nightly receipt renderer | `YYYY-MM-DD.md` + `sub-priority-*.md` exist daily; missing file alerts |
| B9 | weekly backup Mediarr task | backup file + task row each week |
| B10 | three DSH tasks + prompts in repo | manual run of each: artifact + ledger row; prompt file is the authority |
| B11 | cutover + one clean week + rollback test | zero silent misses; old path re-enabled once successfully |
| B12 | docs: `tracks.md`, `tech-debt.md`, `lessons-learned.md` | recorded |

## 9. Decisions requiring owner sign-off

| # | Decision | Recommendation |
|---|---|---|
| D1 | Runtime split | **hybrid by class** — Mediarr for deterministic, DSH tasks for weekly judgement, one plugin for ledger/retry, external watchdog for host-down (this document) |
| D2 | Library scope | **Movies/TV only in this track.** Keep beets manual for music (no music domain); adult content, if wanted, enters the normal pipeline like any movie — no separate orchestrator |
| D3 | Browser dependency | **Indexers own acquisition.** Browser-based browsing (TPB/YTS/EZTV) survives only inside the weekly judgement task, and only to *recommend*; grabbing uses Mediarr's torrent API. Migrate sources to indexers where possible |
| D4 | Reliability bar | **"never silently wrong"** — every occurrence succeeded, retried, or alerted; receipts + plugin + watchdog; one clean week |

Open questions carried to the owner: unattended deletion (W1 names-only vs quarantine-then-delete),
DSH host full-access (Q5), watch-next surface, subtitle alignment, nightly receipt retention, and
whether "searched, found nothing" should alert after N days.

## 10. What would falsify this design

- A provider outage during a scheduled weekly run that produces neither a ledger `error` nor a
  watchdog alert within 10 minutes.
- A library mutation (delete/move/import) that happens twice from one occurrence.
- A daily/hourly behaviour that stops when the model provider is down — i.e. any surviving LLM call
  in the deterministic path.
- A receipt that says success while the artifact is absent or stale (the 2026-11-06 case: a
  "completed" `media-orchestrator` run with no `2026-11-06.md`).
