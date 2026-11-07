# Spec — Re-derive media automation from first principles

**Track:** `chore_migrate_hermes_automation_20261107`
**Opened:** 2026-11-07 · **Revised:** 2026-11-07 (jellyfin-go declared deprecated; workflow
port replaced by intent-first redesign)

## Context

The household media pipeline runs on Hermes. Four LLM cron jobs and one systemd timer keep
the library fed, subtitled, refreshed and pruned. Measured reality (`inventory.md`): 167
executions, 42 failures — every failure a model-provider outage, none of them noticed by the
system itself.

Those jobs were built against **jellyfin-go**, which is now deprecated. They reach into
jellyfin-go over HTTP `:8097` and read its SQLite database directly; that entire dependency
surface is going away. Mediarr — the server in this repo — is the media server going forward.

So the old workflow cannot simply be ported: half of it points at a service that is being
removed, and the other half encodes habits rather than requirements.

## Principle

**Re-derive the schedule from intent, not from the old scripts.** For each behaviour ask:
what outcome does the owner need, how quickly must it be true, what happens if nothing runs
for a day, and is a language model actually required — or is this deterministic work that a
script should own and report loudly?

The old system's own doctrine survives this test and constrains the answer:
`media-pipeline-invariants` — judgement stays with the agent, scripts do pure I/O and fail
loudly, no `&&` chains standing in for reasoning, and no `clarify` forms.

## Goal

A media automation layer where every recurring behaviour has a justified cadence, a named
owner (Mediarr scheduler task, DSH scheduled task, or a DSH plugin), an idempotency key, a
proof-of-run artifact, and a failure signal the owner sees without having to notice a missing
report.

## Scope

**In:** the four Hermes cron jobs and their skill payloads; `fetch-monitor.timer`; the media
skills under `~/.hermes/skills/media`; the 15 scripts in `~/tools/jellyfin-tools/`; the
artifact contracts in `~/media-reports/` and `~/.local/share/media-recommendations/`; the
DSH substrate (schedules and any custom plugin); cut-over and decommissioning.

**Out:** Hermes functionality outside the media path; jellyfin-go stability (owner-owned);
rebuilding Mediarr's acquisition engine to mimic Pirate Bay browsing.

## Target shape (RATIFIED 2026-11-07)

Three execution classes, each with a different reliability story. Decisions were answered by the
owner on 2026-11-07 and are recorded in §Decisions; the full rationale is in
[`design/TARGET-ARCHITECTURE.md`](./design/TARGET-ARCHITECTURE.md).

| Class | Examples | Owner | Why |
|---|---|---|---|
| Continuous / event-driven | ingest a completed download, pick up a new episode, refresh a changed item | Mediarr in-process (native) | must not wait for a model or a human |
| Deterministic recurring | library scan, wanted search, subtitle wanted-search, RSS, tidy, receipts, quarantine | **Mediarr native tasks stay native; the household automation jobs run as DSH plugin timers** | owner chose more work in DSH; deterministic code needs no model, and native engine tasks are not duplicated |
| Judgement recurring | what to acquire next, which subtitle pack, what to prune | DSH scheduled task (agent), weekly/monthly | needs reasoning across sources |
| Meta / reliability | ledger, retry, alerts, heartbeat, dead-man | DSH plugin + systemd watchdog | must work when the model and the Host do not |

A DSH **plugin** is the owner of the automation layer wherever a scheduled prompt cannot deliver
the reliability property (deterministic work, retries, dedupe, run ledger, quarantine, alerting
without the model). Cron/scheduled prompts are used **only** for weekly/monthly judgement.

## Decisions (resolved with the owner, 2026-11-07)

| # | Decision | Answer | Rejected options and why |
|---|---|---|---|
| D1 | Runtime split | **More work into DSH**: one plugin owns household automation (timers, ledger, quarantine, alerts); Mediarr keeps engine-coupled native tasks. Deterministic DSH work is plugin code, never model turns. | Mediarr-first split (more product code in this repo); everything as scheduled prompts (reintroduces the 42-failure mode — models in hourly/daily loops). |
| D2 | Library scope | **Music scoped as a new track** (`feature_music_library_20261107`), automation paused meanwhile; **adult folded into the normal Movies pipeline**; Movies/TV automated as today. | Dropping music (owner wants it owned); keeping music-orchestrator (depends on Hermes + browser + jellyfin-go). |
| D3 | Browser dependency | **Indexers only; drop browser browsing.** Discovery uses TMDB + indexers + library; no `kimi-webbridge`, Chrome or VPN in the runtime. | Keeping the browser bridge (Chrome + USA VPN on the acquisition critical path; unmonitorable by receipts). |
| D4 | Reliability bar | **"Never silently wrong"**: every expected occurrence succeeded, was retried, or alerted. | "Always succeeds" (impossible with a provider that can be down); counting on a success status without an artifact (the 2026-11-06 case). |
| Q5 | Prune deletion | **Quarantine-then-delete unattended**: weekly agent names candidates, plugin moves to `4TB/quarantine` at 04:45, 14-day retention, manifest + restore + caps, shadow week first. | Candidates-only (owner accepted the quarantine safety net); heuristic deletion (banned). |
| Q6 | DSH host | **Systemd user unit with `DSH_PERMISSION_MODE=danger-full-access`**, one host on :3080. | Workspace-write host (scheduled turns cannot answer approvals; writes outside the repo fail closed). |
| Q7 | Watch-next surface | **Report + `Watch Next` collection in Mediarr** (existing Collections API). | Report only; auto-add to wanted (an LLM adding acquisition work without review). |

## Requirements

- **FR-1 Intent-first:** every scheduled behaviour traces to a stated intent, freshness
  tolerance and failure signal — not to "the old job did this".
- **FR-2 Single owner:** no behaviour is implemented twice (Mediarr task *and* DSH prompt).
- **FR-3 No decision scripts:** judgement stays in an agent; scripts are pure I/O and exit
  non-zero on failure.
- **FR-4 Observable runs:** each run leaves a durable receipt (artifact, DB row, or event)
  and a failure that is visible without reading logs.
- **FR-5 Idempotent + non-overlapping:** re-running a task must not duplicate work; two runs
  must not overlap.
- **FR-6 Survives a dead model:** the parts that matter for library correctness keep working
  when the model provider is unreachable.
- **FR-7 Reversible:** the Hermes media path is disabled, not deleted, and can be restored
  from an archived `jobs.json` until one clean week has passed.
- **FR-8 Versioned prompts:** the migrated prompts live in the repo (track docs or DSH skills),
  not only in a cron JSON blob.
- **FR-9 No model in deterministic loops:** hourly/daily work implemented in DSH is plugin code;
  scheduled model turns are reserved for weekly/monthly judgement.
- **FR-10 Quarantine safety:** unattended pruning deletes nothing without a manifest; moves are
  reversible for the retention window; safety rails (active torrents, last copy, continue-watching,
  collections) and a per-week byte cap are enforced; the first week is dry-run.
- **FR-11 No browser bridge:** the runtime does not depend on `kimi-webbridge`, Chrome, a VPN, or
  jellyfin-go in any form; discovery uses indexers + TMDB + library.

## Acceptance criteria

1. Every inventory row has a successor or a recorded drop decision with a reason.
2. One full week: every scheduled run produced its artifact; zero silent misses; provider
   outages produce an alert, not a missing report.
3. `~/media-reports/` keeps its filenames and shapes.
4. `systemctl --user is-enabled fetch-monitor.timer` and the Hermes media jobs show the
   successor in place; rollback is documented and tested once.
5. `measure/tracks.md` and `tech-debt.md` record what was dropped and why.
6. Quarantine is proven safe: a moved item restores byte-identically, an expired item is deleted
   only after retention and only with a manifest, and the safety rails reject an active torrent.
7. No runtime component starts or calls `kimi-webbridge`, Chrome, a VPN, or jellyfin-go.
8. The music module is registered as its own track with a spec and plan; music-orchestrator is
   disabled (not deleted) until that track lands.
