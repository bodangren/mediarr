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

## Target shape (to be ratified in Phase 3)

Three execution classes, each with a different reliability story:

| Class | Examples | Owner | Why |
|---|---|---|---|
| Continuous / event-driven | ingest a completed download, pick up a new episode, refresh a changed item | Mediarr scheduler or filesystem/SSE event | must not wait for a model or a human |
| Deterministic recurring | library scan, wanted search, subtitle wanted-search, RSS, prune candidates, reports | Mediarr scheduler (in-process) | no judgement; failure must be loud and local |
| Judgement recurring | what to acquire next, which release, which subtitle pack, what to prune | DSH scheduled task (agent) | needs reasoning across sources |

A DSH **plugin** is the fallback wherever a scheduled prompt cannot deliver the reliability
property: deterministic work, retries, dedupe, a run ledger, or an alert path that does not
depend on the model being reachable.

## Decisions required

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Runtime split | (a) everything as DSH scheduled prompts, (b) everything in Mediarr code, (c) hybrid by class | **(c)** per the table above |
| D2 | Library scope | all four libraries, or Movies/TV only | all four; adult/music are small and already working |
| D3 | Browser dependency | keep `kimi-webbridge` (Chrome + USA VPN) for TPB/YTS/EZTV/YouTube, or move acquisition onto Mediarr indexers | decide per source; Mediarr indexers for anything they can reach |
| D4 | Reliability bar | what counts as "error-free" | every run writes a receipt; any missed or failed run raises an alert the owner sees; no silent skips |

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

## Acceptance criteria

1. Every inventory row has a successor or a recorded drop decision with a reason.
2. One full week: every scheduled run produced its artifact; zero silent misses; provider
   outages produce an alert, not a missing report.
3. `~/media-reports/` keeps its filenames and shapes.
4. `systemctl --user is-enabled fetch-monitor.timer` and the Hermes media jobs show the
   successor in place; rollback is documented and tested once.
5. `measure/tracks.md` and `tech-debt.md` record what was dropped and why.
