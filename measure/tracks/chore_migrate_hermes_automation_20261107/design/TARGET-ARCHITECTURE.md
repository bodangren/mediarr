# Target architecture v2 — media automation after Hermes (owner-ratified)

**Status:** RATIFIED 2026-11-07 by owner answers to D1–D4 and four blast-radius questions.
Supersedes v1. Inputs: three independent designs
([`intent-cadence.md`](./intent-cadence.md), [`dsh-substrate.md`](./dsh-substrate.md),
[`mediarr-contract.md`](./mediarr-contract.md)), graded against source by the Lead.
No production service, task, or profile was modified to produce this document.

## 0. One-page answer

**No model runs hourly or daily.** That was the old system's central mistake: an agent turn in
every loop, 167 runs, 42 provider-outage failures, none noticed (`../inventory.md` §2). The
owner's decision to *move more work into DSH* is honored as **DSH plugin timers running
deterministic Node code**, not as hourly/daily model turns — a scheduled prompt would reintroduce
the exact failure mode, so the plugin is the executor and the model is reserved for weekly
judgement.

| Class | When | Owner | Model? |
|---|---|---|---|
| Event-driven / continuous | on the event | **Mediarr in-process** (import, subtitles, playback, seeding, indexer backoff, auto-grab) | never |
| Hourly / daily, deterministic | 10 min – daily | **DSH plugin `media-automation`** (timers) + **Mediarr's native engine tasks** it observes and verifies | never |
| Weekly / monthly, judgement | Sunday / monthly | **DSH scheduled tasks** (watch-next, prune candidates, rule review) | yes — the only model calls |
| Continuous, meta | 1–10 min | **DSH plugin** (ledger, retry, heartbeat) + **systemd watchdog** (host/plugin/Mediarr down) | never |
| Human | on demand | Mediarr UI/API (add+search, override, restore from quarantine, delete) | optional |

**Reliability property: "never silently wrong"** — every expected occurrence either succeeded, was
retried, or alerted. Mechanisms, each covering what the others cannot:

1. **Receipts everywhere** — Mediarr `TaskExecution` rows, plugin job-ledger rows, artifacts in
   `~/media-reports/`, plugin heartbeat.
2. **Plugin outcome attribution** — scheduled delivery only proves inbox delivery; the plugin reads
   the consuming `turn/end`, so a provider outage is a recorded failure with retry and alert
   (`dsh-substrate.md` §1.3, §3.5).
3. **External watchdog** — a systemd timer that runs when the DSH Host or the plugin is down. It is
   the only component that can notice its own dependency's absence.

**What changed from v1 because of the owner:**

| Decision | v1 | Ratified v2 |
|---|---|---|
| D1 runtime split | Mediarr-first; systemd scripts | **More in DSH:** one plugin owns the household automation layer (timers, receipts, quarantine, alerts); Mediarr keeps only engine-coupled native tasks and gains almost no new code |
| D2 library scope | Movies/TV; music dropped | **Music module scoped as a new track** (`feature_music_library_20261107`); music automation paused until it exists, beets manual meanwhile. Adult folds into the normal Movies pipeline |
| D3 browser dependency | Browser allowed for weekly recommendations | **Indexers only; browser browsing dropped entirely** — no `kimi-webbridge`, Chrome or VPN in the runtime. Discovery uses TMDB + indexers + library |
| D4 reliability bar | never silently wrong | unchanged |
| Prune | name candidates only | **quarantine-then-delete unattended**, with retention, manifest, restore and caps |
| DSH host | proposed | **systemd user unit, `DSH_PERMISSION_MODE=danger-full-access`** |
| Watch-next | markdown report | report **plus a `Watch Next` collection in Mediarr** |

> **Guardrail on "more work into DSH":** deterministic DSH work is plugin code only. If the intent
> was hourly/daily *model* turns, that reverses the single largest reliability win and should be
> re-decided explicitly.

## 1. Owner decisions recorded (Phase 3)

| # | Question | Answer | Consequence |
|---|---|---|---|
| D1 | Runtime split | **Move more work into DSH** | Plugin becomes the automation runtime; fewer Mediarr changes; DSH Host now on the critical path for household jobs (mitigated by systemd `Restart=always` + watchdog) |
| D2 | Library scope | **Scope a music module; adult folds into Movies** | New track `feature_music_library_20261107` (scoped, not started); music-orchestrator disabled, beets manual meanwhile; no adult orchestrator |
| D3 | Acquisition source | **Indexers only; drop browser browsing** | Removes Chrome/VPN runtime dependency; discovery limited to configured indexers + TMDB; TPB-only content becomes undiscoverable |
| D4 | Reliability bar | **Never silently wrong** | Receipts + plugin ledger + external watchdog; measurable targets in §4.4 |
| Q | Prune deletion | **Quarantine-then-delete unattended** | New plugin quarantine engine, 14-day retention, manifest, restore, caps, shadow week first |
| Q | DSH host | **Systemd unit, full access** | §5.1 unit with `DSH_PERMISSION_MODE=danger-full-access`; one host on :3080 |
| Q | Watch-next surface | **Report + Mediarr Collections** | Weekly task writes `recommendations-*` and syncs a `Watch Next` collection via the existing Collections API |

Rejected options and why: Mediarr-first split (less DSH, more product code — not the owner's
choice); keeping `kimi-webbridge` (a browser + VPN on the critical path for acquisition, and it
cannot be monitored by receipts); dropping music (the owner wants it owned, not outsourced);
candidates-only pruning (the owner accepted the quarantine safety net instead); workspace-write
automation (scheduled turns cannot answer approval prompts, so writes fail closed).

## 2. What must happen, when, and who owns it

### 2.1 Continuous / event-driven (Mediarr native; no new scheduling)

| Behaviour | Owner / evidence | Proof |
|---|---|---|
| Import a completed download | `ImportManager` on `torrent:completed` (`ImportManager.ts:55`) | `IMPORT` activity row + item row |
| Attach subtitles on import | `SubtitleAutomationService.onMovie/EpisodeImported` (`:121,126`) | `WantedSubtitle` rows |
| Remember playback position | `PlaybackRepository` upsert (`:94`) | `PlaybackProgress` row |
| Retire finished torrents | `SeedingProtector` 60 s loop (`:23-25`) | torrent state |
| Back off a failing indexer | `IndexerAutoDisable` | `IndexerHealth` row + SSE |
| Auto-grab on new release | `RssMediaMonitor` on `release:stored` (`:8,17-19`) | `GRAB` activity row |

This row set is the successor to `fetch-monitor.timer`; the 10-minute rescan is not recreated.

### 2.2 Hourly / short-interval (Mediarr native; plugin observes and verifies)

| Behaviour | Cadence | Owner | Proof | New work |
|---|---|---|---|---|
| `wanted-search` | 60 min | Mediarr scheduler | `TaskExecution` | set 60; plugin polls history |
| `subtitle-wanted-search` | 10–15 min | Mediarr scheduler | `TaskExecution` + counters | **fix interval persistence (only Mediarr code change)** |
| `rss-sync` | 15–30 min | Mediarr scheduler | `TaskExecution` | set 30 |
| task-health verification | 5 min | **plugin timer** | plugin `runs`/`alerts` | build |

### 2.3 Daily (deterministic; plugin timers)

| Behaviour | Time | Intent | Owner | Proof |
|---|---|---|---|---|
| library scan + metadata backfill | 02:00 | DB matches disk; art repaired | Mediarr native | scan summary |
| import-list sync | 6 h | curated lists feed wanted | Mediarr native | per-list counts |
| auto-update check | 04:00 | updates found, not auto-applied | Mediarr native | task row |
| **downloads tidy** | 04:30 | staging empty, only of library-proven items | **plugin timer** | `downloads-tidy-*.md` + counts |
| **nightly receipt** | 05:00 | what ran, failed, changed | **plugin timer** | `YYYY-MM-DD.md`, `sub-priority-*.md`, `missing-subs-*.md` |
| **quarantine sweep** | 04:45 | execute approved manifests; delete expired quarantine | **plugin timer** | manifest + `quarantine-*.md` |
| plugin heartbeat | 1 min | prove the automation runtime is alive | **plugin timer** | heartbeat file |

### 2.4 Weekly / monthly (DSH scheduled tasks; only model calls)

| Behaviour | Schedule | Output | Blast radius |
|---|---|---|---|
| **watch-next** | Sun 03:00 | `recommendations-*.md/.json` + `Watch Next` collection sync | low — advisory + collection membership |
| **prune candidates** | Sun 03:30 | judgement manifest `prune-<date>.json` for the plugin | low — naming only; deletion is plugin-executed after quarantine |
| **rule review** | monthly, Sun 04:00 | `rule-review-*.md` (proposals only) | low |
| weekly backup trigger | Sun 02:00 | plugin timer calls Mediarr backup | low |

**No daily LLM task.** The old daily `media-orchestrator` bundled deterministic loops (already
native) with judgement (weekly, because taste is not daily-fresh). The provider may be down all
week while every hourly/daily function keeps working.

### 2.5 Quarantine-then-delete (owner-authorized unattended pruning)

1. Weekly judgement names candidates with rule + size + reason into
   `~/media-automation/inbox/prune-<date>.json` — it never deletes, and never writes outside the
   inbox.
2. Daily quarantine sweep in the plugin: validates each candidate (inside a configured library
   root, not the last copy, not an active/seeding torrent, not in continue-watching or a
   collection), then atomically renames it to `4TB/quarantine/<YYYY-WW>/<relative-path>` and
   records a manifest row (item, bytes, rule, movedAt, deleteAfter, restorePath).
3. Retention: 14 days (config). Deletion requires the manifest, a re-check of the safety rails and
   a per-week byte cap (default 50 GB). Every move and delete is notified.
4. Restore: any owner action (playback, collection add, manual restore endpoint/CLI) cancels the
   pending delete; the plugin exposes `automation/quarantine` state read-only in its CLI/log and
   the manifest is the restore source.
5. **Shadow week first:** quarantine engine runs in `dry-run` for the first week (manifest +
   notification, no move), then is enabled.

### 2.6 Human-initiated

Add + search now, override release/subtitle, retry import, restore from quarantine, delete,
ask "what happened". Deletion remains available directly here too.

### 2.7 Dropped, with reasons

Browser-based discovery (`kimi-webbridge`/TPB/YTS/EZTV/YouTube) — owner decision D3, removes
Chrome + VPN from the runtime; music automation until the new track lands (beets manual meanwhile);
adult orchestrator (folded into Movies); per-item jellyfin-go refresh and favourites publishing
(target deprecated); `.nfo` writing (no consumer); separate poster job (subsumed by scan);
recurring dedupe (one-time migration); the 10-minute rescan (event-driven now); LLM-authored
per-job reports (rendered deterministically); **an LLM in any hourly/daily loop**.

### 2.8 Report filename contract (spec AC3)

| File | Producer | Cadence |
|---|---|---|
| `YYYY-MM-DD.md` | nightly receipt (plugin) | daily |
| `downloads-tidy-YYYY-MM-DD.md` | tidy (plugin) | daily |
| `quarantine-YYYY-MM-DD.md` | quarantine sweep (plugin) | daily (when active) |
| `prune-candidates-YYYY-MM-DD.txt` | weekly prune task (judgement table) | weekly |
| `recommendations-YYYY-MM-DD.md` / `.json` | weekly watch-next | weekly |
| `rule-review-YYYY-MM-DD.md` | monthly rule review | monthly |
| `sub-priority-YYYY-MM-DD.md`, `missing-subs-YYYY-MM-DD.md` | nightly receipt | daily |

Missing expected file = failed run = watchdog alert.

## 3. Ownership rules

1. **One owner per behaviour.** Mediarr engine tasks stay Mediarr; household automation lives in the
   plugin; judgement in scheduled tasks. The plugin never re-implements a native task — it triggers
   or verifies it.
2. **Deterministic DSH code, judgemental DSH prompts.** Plugin timers may run any pure code; only
   scheduled tasks call the model. This is the guardrail that keeps "more in DSH" from restoring
   the Hermes failure mode.
3. **No script decides; scripts and plugin code move bytes or read data.** The only decision code
   is the agent's weekly judgement and the owner's custom-format rules. Quarantine executes a
   manifest; it does not choose.
4. **Deletion is now authorized but reversible for 14 days.** It is not routine: rails, caps,
   manifest, notifications, shadow week. Direct human deletion remains available.

## 4. Reliability design (D4)

### 4.1 Receipts

| Layer | Written by | Contents |
|---|---|---|
| Mediarr `TaskExecution` | Scheduler native | task, RUNNING→SUCCESS/FAILED, duration, error |
| Plugin `jobs` domain | plugin timers | job, occurrence key, started/ended, outcome, bytes moved, error |
| Plugin `runs` domain | scheduled-task observer | `taskId@occurrenceAt`, deliveredAt, messageId, sessionId, outcome, errorCode, attempts |
| Artifacts + heartbeat | jobs/tasks/plugin | §2.8 files; heartbeat every minute |

### 4.2 Idempotency, overlap, retry

- **Key:** `(job_or_task, occurrence)` for plugin jobs and scheduled tasks. Delivery is
  at-least-once (`dsh-substrate.md` §6.1), so every handler is a upsert keyed by it.
- **Overlap:** one plugin job type at a time (`jobs` row with `running` + lease); media writes take
  one shared library lock; quarantine and tidy never run concurrently.
- **Retry:** plugin jobs retry transient failures twice with backoff, then alert; scheduled-task
  failures are retried by the plugin via `ctx.schedule.run()` at most twice, only for
  `TIMEOUT|SERVER|TRANSPORT|RATE_LIMIT`; auth/config errors alert immediately.
- **Crash safety:** no in-memory state across operations; HMR may restart the plugin under a run
  (`dsh-substrate.md` §3.3), so leases expire and are stolen with an alert.

### 4.3 Who catches what

| Failure | Caught by | Latency |
|---|---|---|
| provider unreachable during weekly turn | plugin (`turn/end`) → ledger + retry + alert | seconds |
| plugin job failed | plugin (`jobs` outcome) → retry + alert | seconds |
| plugin crashed / disabled / HMR loop | **watchdog** (stale heartbeat) | ≤ 10 min |
| DSH Host down | **watchdog** (`systemctl is-active`) | ≤ 10 min |
| Mediarr down | **watchdog** (`/api/health`) + plugin failures | ≤ 10 min |
| Mediarr task failed | plugin poll `/api/tasks/history?status=failed`; watchdog as backstop | ≤ 5–10 min |
| quarantine manifest unsafe | plugin validation rejects + alerts | immediate |
| watchdog itself dead | `systemd` timer failure is visible; add a daily "watchdog alive" heartbeat to the overnight receipt | ≤ 1 day |

Alert channel: one outbound webhook in `~/.config/mediarr-automation/alert.env`; local file +
`systemd-cat` fallback. No model on the alert path.

### 4.4 Definition of "error-free"

> **Never silently wrong:** every expected occurrence succeeded, was retried, or alerted.

Targets: 100 % terminal outcomes; failures alerted < 3 min (plugin) / < 10 min (watchdog); 0
occurrences with neither ledger row nor alert; 0 duplicate side effects per key; quarantine delete
always manifest-backed; one clean week.

## 5. DSH substrate

### 5.1 Host (prerequisite P0) — approved

```ini
# ~/.config/systemd/user/dsh-host.service
[Unit]
Description=DSH Host (web profile) - scheduler + automation runtime
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=%h/Desktop/mediarr
Environment=DSH_PERMISSION_MODE=danger-full-access
ExecStart=%h/.local/bin/dsh web --no-open --port 3080
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

`DSH_PERMISSION_MODE` is required: fresh sessions inherit it (`dsh --profile web --dump-config`:
default `workspace-write` + approval `ask`), and a scheduled turn has no answerer. Linger is
already enabled. Exactly one Host (the schedule store is Host-wide); the current terminal-launched
Host is replaced by this unit.

### 5.2 Custom plugin `media-automation` (the core of "more work in DSH")

One in-process cordis plugin, versioned in this repo:

```
automation/
  dsh-media-automation/        package.json + cordis.patch.yml + lib/*.js (or src/)
  prompts/                     watch-next.md, prune-candidates.md, rule-review.md
  scripts/                     none that duplicate plugin logic; CLI helpers only
  systemd/                     dsh-host.service, automation-watchdog.{service,timer}
  expectations.yaml            per-artifact max gaps for the watchdog
```

Responsibilities:

| Area | Behaviour |
|---|---|
| Timers | tidy 04:30, quarantine 04:45, receipt 05:00, backup trigger Sun 02:00, reconcile every 1–5 min |
| Mediarr client | triggers native tasks, polls `/api/tasks/history`, reads wanted/missing/torrents/playback, creates the `Watch Next` collection |
| Ledger | durable `jobs`, `runs`, `locks`, `alerts`, `quarantine` tables; idempotent by occurrence key |
| Outcome observer | scheduled-task `messageId` ↔ session `user/message.id` ↔ `turn/end`; retry + alert |
| Quarantine engine | manifest validation, atomic move, retention, caps, restore, dry-run mode |
| Files | receipts in `~/media-reports/`, heartbeat, inbox for judgement manifests |
| Alerts | webhook + local fallback, throttled, incident ledger |

Install: `dsh plugin --profile web add link:<repo>/automation/dsh-media-automation` (mechanism
validated by reading; installation is a Phase 4 step). HMR may recompose it — state is durable, and
the lease/alert path assumes it can be stopped mid-run.

### 5.3 Scheduled tasks (weekly judgement)

Target `new` (fresh context per run, state in files) unless continuity earns `new_once`. RRULE
example (Sunday 03:00 Asia/Shanghai):

```
DTSTART;TZID=Asia/Shanghai:20261108T030000
RRULE:FREQ=WEEKLY;BYDAY=SU;BYHOUR=3;BYMINUTE=0
```

| Task | Schedule | Prompt | Output |
|---|---|---|---|
| `media-watch-next` | Sun 03:00 | `automation/prompts/watch-next.md` | recommendations + collection sync |
| `media-prune-candidates` | Sun 03:30 | `automation/prompts/prune-candidates.md` | manifest in inbox |
| `media-rule-review` | monthly Sun 04:00 | `automation/prompts/rule-review.md` | proposals only |

Thin task prompt: read the repo prompt file, execute it, use the occurrence JSON as idempotency
key, write the receipt, fail loudly. Prompts live in the repo (FR-8).

### 5.4 External watchdog (the only non-DSH deterministic piece)

`automation-watchdog.timer` every 10 min, pure I/O: DSH host active, plugin heartbeat fresh,
Mediarr `/api/health`, expected artifacts per `expectations.yaml`, failed Mediarr tasks since a
watermark, alert webhook. This is the only component that notices the DSH Host or plugin being
down; it is deliberately outside DSH.

## 6. Mediarr contract (deliberately minimal changes)

**Used as-is:** wanted/search/grab, torrent control (`torrentRoutes.ts:23-338`), subtitle
search/upload, playback progress, import retry, `POST /api/tasks/scheduled/:taskId/run`,
`GET /api/tasks/history`, `GET /api/health`, `GET /api/activity`, SSE, `Collections`
(`collectionRoutes.ts:154`), backup service.

**Code changes required in this repo:**
1. **Fix the subtitle interval knob** (only blocking Mediarr change): map `subtitle-wanted-search`
   in `TASK_INTERVAL_KEY` (`schedulerRoutes.ts:38-42` vs `serviceContainer.ts:611-615`), plus test.
2. Settings changes (no code): rss 30, availability 10–15, wanted 60.
3. Optional, not required by the design: E1 execution ids, E2 per-item refresh route, E3 task-failure
   notification, E4 async receipts, E5 real `/Library/Refresh`. The plugin polls history and alerts,
   so the reliability bar does not depend on them. Keep them as future polish.

**Gaps this design absorbs rather than builds in Mediarr:** prune/quarantine (plugin), nightly
receipt (plugin), recommendations surfacing (report + Collections), subtitle alignment (manual
`subalign`, deferred), music domain (new track), downloads audit (plugin).

**Decommission list:** all jellyfin-go HTTP and direct SQL dependencies, `fetch-monitor.py` restart
fallback, `media-daily` chain, `kimi-webbridge` usage (`mediarr-contract.md` §3–4).

## 7. Migration sequence

| Step | Work | Switch off when |
|---|---|---|
| P0 | Deploy Mediarr 24/7; install DSH Host systemd unit; alert webhook | both survive reboot; watchdog alerts a synthetic miss |
| P1 | Subtitle knob fix; settings; plugin skeleton (ledger/timers/heartbeat) | plugin heartbeat + a no-op timer visible for 24 h |
| P2 | Tidy + receipt + backup jobs; **quarantine in dry-run** | one week of artifacts; shadow manifests reviewed with owner |
| P3 | Quarantine enabled (14-day retention, caps); weekly scheduled tasks; collections sync | each task leaves receipt + ledger row; forced provider failure alerts |
| P4 | Disable `media-orchestrator`, `downloads-tidy`, `fetch-monitor.timer`; music/adult per decisions | one real import with no manual move; no double grabs |
| P5 | One clean week; rollback test (re-enable archived `jobs.json`); archive | zero silent misses; rollback proven |

Immediate, no successor needed: jellyfin-go HTTP + SQLite calls, browser-bridge usage, dead
`media-daily` chain.

## 8. Backlog (Phase 4–6)

| # | Item | Acceptance evidence |
|---|---|---|
| B1 | Mediarr deployed 24/7 | reboot survives; `/api/health` green; scheduler nextRun present |
| B2 | Subtitle interval persistence fix + test | `PUT …/interval` persists across restart |
| B3 | DSH Host systemd unit + `DSH_PERMISSION_MODE` | reboot survives; synthetic scheduled run writes outside repo |
| B4 | Plugin skeleton: domains, heartbeat, alarms, install | installs via `link:`; survives HMR restart; heartbeat visible |
| B5 | Plugin timers: tidy, receipt, backup trigger, reconcile | each writes artifact + `jobs` row; missed run alerts |
| B6 | Quarantine engine (dry-run → enabled) | dry-run manifest matches review; enabled move/restore/delete rails tested; cap enforced |
| B7 | Three scheduled tasks + repo prompts + Collections sync | manual run: artifact + ledger row + collection updated; forced failure alerts |
| B8 | Watchdog + expectations map | host stopped, plugin disabled, Mediarr stopped each alert ≤ 10 min |
| B9 | Cutover + one clean week + rollback | zero silent misses; old path re-enabled once |
| B10 | Music track scoping handoff | `feature_music_library_20261107` registered with spec+plan |
| B11 | Docs: tracks/tech-debt/lessons | recorded |

## 9. What would falsify this design

- A scheduled weekly run that fails with neither ledger `error` nor watchdog alert in 10 minutes.
- A quarantine move/delete not backed by a manifest, or a restore that loses data.
- A daily/hourly behaviour that stops when the model provider is down.
- A receipt claiming success while the artifact is absent (the 2026-11-06 case).
- Two runs mutating media from one occurrence key.
