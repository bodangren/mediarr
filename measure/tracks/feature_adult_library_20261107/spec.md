# Spec — Adult library for Mediarr

**Track:** `feature_adult_library_20261107`
**Opened:** 2026-11-07 · **Status:** SCOPED ONLY — no work started. Owner decision D2 in
[`chore_migrate_hermes_automation_20261107`](../chore_migrate_hermes_automation_20261107/spec.md):
the Adult library is separate and easily accessible, not folded into Movies.

## Context

An Adult library already exists on disk (`/run/media/daniel-bo/4TB/Porn`, flat layout). The Hermes
`adult-orchestrator` (Sundays 04:00) drove it through a browser bridge (TPB top-100), then
jellyfin-go's HTTP API **and raw SQL against its SQLite DB** for pruning/deletion. Both targets are
deprecated. Mediarr has no adult concept: `MediaTypeEnum = ["TV","MOVIE"]` (`server/src/db/schema.ts:15`),
roots are movie/TV only.

The owner wants a **separate library** that is easy to reach (its own section), not mixed into
Movies, and its own discovery/prune behaviour.

## Goal

Mediarr natively represents, scans, serves and prunes an Adult library with its own root and UI
section; the daily/weekly agent runs discover and queue content through the browser bridge, and
deletion goes through the quarantine engine.

## Scope

**In:** library type/root for Adult; scan + import; UI section and browse/play; API for the
automation layer (list, mark watched, retention candidates); migration of the existing tree;
automation wiring (browser-agent discovery + queue, quarantine prune).

**Out:** changes to Movies/TV behaviour; scraping scripts for adult sites (browser agent instead);
multi-user or access control beyond the trusted-LAN scope.

## Requirements

- **FR-1 Type + root:** a dedicated adult library type and configurable root; existing movie/TV
  queries must not see it.
- **FR-2 Scan/import:** reconcile filesystem ↔ DB; flat layout preserved; unreadable files reported.
- **FR-3 UI:** a separate, clearly reachable section in the Flutter client and SPA; browse/play.
- **FR-4 Automation contract:** list items, watched state, queue-ready metadata, and retention
  candidates exposed to the agent runs.
- **FR-5 Discovery:** the agent browses sources with kimi-webbridge and queues picks; no DOM script.
- **FR-6 Prune:** candidates named by the agent, moved/deleted by the quarantine engine; never raw
  SQL deletion.
- **FR-7 Migration:** the existing `4TB/Porn` tree imports without reorganisation.

## Acceptance criteria

1. The Adult section is visible and playable in the Flutter client, separate from Movies.
2. A seeded tree scans with counts matching the filesystem.
3. The weekly agent run queues 1–3 picks via the browser bridge and reports them.
4. A prune candidate is quarantined, restorable, then deleted only after retention.
5. Existing video suites stay green; no `TV|MOVIE` regression.
6. No jellyfin-go dependency remains.

## Open decisions (resolve before Phase 1)

| # | Decision | Options |
|---|---|---|
| A1 | Visibility | Visible section (recommended) vs hidden behind a toggle/PIN |
| A2 | Root | Keep `4TB/Porn` (recommended) vs move under `4TB/Adult` |
| A3 | Metadata | Filename parsing only (recommended; no TMDB) vs a metadata provider |
| A4 | Discovery cadence | Weekly (recommended, matches the old job) vs daily |
| A5 | Retention profile | Agent proposes, quarantine executes (recommended) vs hard cap by age/size only |

## Provenance

Scoped from inventory `adult-orchestrator` rows, the v3 architecture
([`TARGET-ARCHITECTURE.md`](../chore_migrate_hermes_automation_20261107/design/TARGET-ARCHITECTURE.md) §4),
and the schema/root facts above. See [`plan.md`](./plan.md).
