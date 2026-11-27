# Team briefs — paste into a fresh session

Three planning agents, three different model families, one shared context block. Each writes
exactly one file; the Lead synthesises. Nothing here is a port order — all three are asked to
argue from intent.

**Before spawning:** DSH Settings → Subagents → enable "Allow agents to choose models" and
authorize three families. The allow-list is recorded once at session creation, so it cannot
be applied retroactively. Verify with `list_subagent_models` before spawning; if only one
provider is listed, say so and run same-family rather than pretending.

**Board setup:** create one task per brief with `team_task_create`, the write scope set to
that agent's file, then spawn with `context: "fresh"`. Suggested names:
`cadence-designer`, `dsh-architect`, `mediarr-contract`.

---

## Shared context block (prefix every brief with this)

> **Situation.** The owner is retiring Hermes media automation: four LLM cron jobs
> (`media-orchestrator` 03:00 daily, `downloads-tidy` 03:30 daily, `music-orchestrator`
> Sun 02:00, `adult-orchestrator` Sun 04:00) and one systemd timer (`fetch-monitor`, every
> 10 min). Measured history: 167 runs, 42 failures, every failure a model-provider outage.
> They drove transmission on `:9091`, jellyfin-go on `:8097` **and its SQLite database**, and
> TPB/YTS/EZTV/YouTube through `kimi-webbridge` (Chrome + USA VPN).
>
> **jellyfin-go is deprecated.** Mediarr (this repo, `/home/daniel-bo/Desktop/mediarr`) is the
> media server going forward. It already registers six scheduler tasks: `rss-sync` (12 min),
> `import-list-sync` (6 h), `wanted-search` (60 min), `subtitle-wanted-search`, library scan
> (02:00), auto-update check (04:00).
>
> **The owner's instruction:** redesign from first principles — the *intent* of each
> scheduled job, not its exact workflow — and implement with a combination of DSH scheduled
> tasks and, where necessary, custom DSH plugins.
>
> **Doctrine that must survive** (`media-pipeline-invariants`): judgement stays with the
> agent; scripts only move bytes or read data, and fail loudly; no `&&` chains pretending to
> reason; no approval forms — boring parts just run.
>
> **Constraints:** trusted LAN, no auth; the owner verifies claims, so cite `file:line` for
> any assertion about code and never state a DSH API you have not read in source.
>
> **Read first:** `measure/tracks/chore_migrate_hermes_automation_20261107/inventory.md`,
> `spec.md`, `plan.md`.

---

## Brief A — cadence (write `design/intent-cadence.md`)

> Derive what this household's media system must actually do. Ignore the old step lists;
> ask what outcome the owner needs, how fast it must be true, and what breaks if nothing runs
> for a day. Cover acquisition (wanted + discovery), library ingestion and organisation,
> subtitles (including Chinese and timing), metadata and artwork, playback state and resume,
> recommendations, space pruning, and reporting.
>
> For each behaviour: **intent** in one sentence · **trigger class** (event-driven /
> continuous / hourly / daily / weekly) and why · **freshness tolerance** · **idempotency
> key** · **how a silent failure becomes visible to the owner** · **blast radius** · **whether
> an LLM is genuinely required or deterministic code suffices**.
>
> Finish with: an explicit "do not schedule this" list, and the five behaviours that matter
> most, ranked.
>
> Reject your own instinct to transcribe. If a Hermes job did something you cannot justify
> from intent, say it should be dropped.

---

## Brief B — substrate (write `design/dsh-substrate.md`)

> Determine how recurring work should execute on DSH. Read the implementation at
> `/home/daniel-bo/.local/lib/node_modules/@deepseek-ai/dsh/` — source, with citations.
>
> Establish: (1) `schedule_create` semantics — RRULE subset, `this_session` vs `new_once` vs
> `new`, what each means for state continuity, missed-occurrence behaviour after downtime,
> the "delivery can repeat after a crash" property, and whether two runs can overlap;
> (2) how a scheduled prompt becomes work — which session runs it, what tools it gets, and
> exactly what happens when the model provider is unreachable (the failure mode that killed
> Hermes); (3) plugin mechanics — bundle/profile patch layering, `plugin_manager`, and what a
> cordis plugin can do that a scheduled prompt cannot (deterministic code, own timers, durable
> state, HTTP/DB, locks, subprocess); (4) what reliability machinery exists versus what must
> be built.
>
> Deliver: a capability matrix (scheduled prompt vs custom plugin), the recommended substrate
> per cadence class, a concrete reliability design (idempotency keys, overlap prevention,
> retry/backoff, alerting, run ledger, and a measurable definition of "error-free"), and a
> minimal installable skeleton or config patch with exact commands — marked validated only if
> you actually ran it.

---

## Brief C — contract (write `design/mediarr-contract.md`)

> Define what Mediarr must own natively and the contract an automation layer uses to drive
> it. jellyfin-go is deprecated; there is no fallback server, and today's jobs still reach
> into it.
>
> Investigate `server/src/`: the six scheduler tasks in `serviceContainer.ts`, `Scheduler.ts`,
> the wanted/RSS/subtitle services, the Jellyfin-compatible surface, playback progress, and
> any activity/SSE stream. Sort capabilities into: (a) exists, only needs enabling — name the
> task or endpoint; (b) exists but is unreachable by an automation layer — say exactly what is
> missing; (c) does not exist (torrent queue control, subtitle acquisition and timing, prune,
> recommendation surfacing, per-item refresh, playback events); (d) observability — health,
> task execution history, events, logs, i.e. what can prove a run worked.
>
> Deliver: the capability table with `file:line` evidence, a minimal automation-facing
> contract (endpoints/events/commands with idempotency, dry-run and status semantics), and a
> sequencing recommendation: what must land before each old job can be switched off, and what
> can switch off immediately.

---

## Lead synthesis (after all three return)

1. **Grade before merging.** For each design: is every DSH claim traceable to source? Is every
   Mediarr claim traceable to `file:line`? Any behaviour justified only by "the old job did
   it" gets pushed back.
2. **Reconcile conflicts explicitly.** The cadence doc will propose behaviours; the substrate
   doc will constrain where they can live; the contract doc will say what Mediarr can do
   today. Where they disagree, the constraint wins and the gap becomes a work item.
3. **Produce one artefact:** the ratified architecture + an ordered backlog where every item
   names its acceptance evidence. Update `spec.md` decisions (D1–D4) and `plan.md` phases.
4. **Do not start building** until D1–D4 are answered by the owner. The failure mode this
   track exists to avoid is a plausible plan that nobody signed off that quietly re-implements
   the old system.
