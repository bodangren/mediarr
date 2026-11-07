# Spec — Migrate Hermes media automation to DSH + Mediarr

**Track:** `chore_migrate_hermes_automation_20261107`
**Opened:** 2026-11-07
**Source of facts:** [`inventory.md`](./inventory.md) (verified against the live install)

## Context

Four hermes cron jobs and one systemd timer currently run the household media pipeline:
a daily 03:00 orchestrator, a 03:30 downloads audit, a weekly music job, a weekly adult job,
and `fetch-monitor` every 10 minutes. They depend on a hermes gateway process, a MiniMax
provider route that fails 25% of the time, jellyfin-go's REST API and SQLite database, and
`kimi-webbridge` (Chrome + USA VPN) for TPB/YTS/EZTV/YouTube.

Mediarr is replacing jellyfin-go and already implements six native scheduler tasks that
overlap the mechanical half of that pipeline.

## Goal

Retire hermes from the media path without losing capability: every scheduled behaviour that
exists today either (a) becomes a Mediarr scheduler task, (b) becomes a DSH scheduled task
where genuine LLM judgement is required, or (c) is explicitly dropped with a recorded reason.

## Scope

**In scope**

- The four cron jobs and their prompt/skill payloads.
- `fetch-monitor.timer` / `fetch-monitor.service`.
- The 32 media skills + `media-pipeline-invariants` + `torrent-acquisition-llm-direct`.
- The 15 scripts in `~/tools/jellyfin-tools/` — ported, retargeted, or retired.
- Artifact contracts: `~/media-reports/*`, `wanted.jsonl`, `prune-candidates-*.txt`.
- Cut-over and decommissioning of the hermes units.

**Out of scope**

- The general hermes install outside the media path (messaging, other skills).
- jellyfin-go stability work (user-owned by standing rule).
- Rewriting Mediarr's acquisition engine to match TPB browsing semantics.

## Open decisions (block Phase 2)

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Where migrated jobs run | (a) DSH scheduled tasks, (b) Mediarr scheduler tasks in code, (c) hybrid | **(c)** — Mediarr owns deterministic cadence (scan, subs wanted, RSS); DSH owns the 2–4 daily judgement runs |
| D2 | Library scope | all four (Movies/TV/Music/Adult) vs Movies/TV only | all four; adult/music are small and already working |
| D3 | `kimi-webbridge` dependency | keep browser automation vs replace with Mediarr indexers / YTS direct | keep for TPB/YTS; replace YouTube with a yt-dlp path if Mediarr grows one |
| D4 | jellyfin-go API dependency | leave until Mediarr parity, or block migration | hard dependency: the port cannot finish before Mediarr exposes library/user_data/refresh |

## Requirements

- **FR-1 (parity):** every job in `inventory.md` §2–3 has a named successor or a recorded
  drop decision, with its schedule preserved.
- **FR-2 (no new decision scripts):** the `media-pipeline-invariants` doctrine survives the
  port — judgement stays in the agent, scripts stay pure I/O.
- **FR-3 (artifacts):** the report and wanted-queue contracts keep their paths and shapes so
  the operator's habits and any downstream reader keep working.
- **FR-4 (failure visibility):** a failed run must be visible without the user noticing a
  missing report — the hermes failure mode was 25% silent-ish failures.
- **FR-5 (reversibility):** hermes jobs are disabled, not deleted, until one full cycle of
  the successor has produced equivalent output; the old `jobs.json` is archived.
- **FR-6 (single source):** the migrated prompts live in the repo (or in DSH skills under
  version control), not in a cron JSON blob only.

## Acceptance criteria

1. `systemctl --user is-enabled fetch-monitor.timer hermes-gateway.service` shows the hermes
   media path disabled and the successor active.
2. One full week where every scheduled run produced its artifact, with zero provider-outage
   failures for the jobs that remain LLM-driven.
3. `~/media-reports/` continues to receive one report per run with the same filenames.
4. `measure/tracks.md` and `tech-debt.md` record what was dropped and why.
5. Rollback documented: re-enable `jobs.json` + `hermes-gateway` restores the old behaviour.
