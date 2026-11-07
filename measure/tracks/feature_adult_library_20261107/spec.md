# Spec — Adult library for Mediarr

**Track:** `feature_adult_library_20261107`
**Opened:** 2026-11-07 · **Status:** ACTIVE 2026-11-08. Phase 0 ratified by the owner; A1–A5
resolved (see below). Owner decision D2 in
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
- **FR-3 UI:** a separate, clearly reachable section in the **SPA first**, then the Flutter client
  (the TV client's focus defects are a separate prerequisite); browse/play.
- **FR-4 Automation contract:** list items, watched state, queue-ready metadata, and retention
  candidates exposed to the agent runs.
- **FR-5 Discovery:** the agent browses sources with kimi-webbridge and queues picks; no DOM script.
  Destructive actions go through the plugin's mediated delete path, never a default-on API.
- **FR-6 Prune:** candidates named by the agent, moved/deleted by the quarantine engine; never raw
  SQL deletion.
- **FR-7 Migration:** the existing `4TB/Porn` tree imports without reorganisation.

## Acceptance criteria

1. The Adult section is visible and playable in the SPA, separate from Movies; the TV client follows
   once its focus fix lands.
2. A seeded tree scans with counts matching the filesystem.
3. The weekly agent run queues 1–3 picks via the browser bridge and reports them.
4. A prune candidate is quarantined, restorable, then deleted only after retention.
5. Existing video suites stay green; no `TV|MOVIE` regression.
6. No jellyfin-go dependency remains.

## Open decisions (resolve before Phase 1)

| # | Decision | Options |
|---|---|---|
| A1 | Visibility | Visible section (recommended) vs hidden behind a toggle/PIN — **DECIDED 2026-11-08: visible section**, owner-selected |
| A2 | Root | Keep `4TB/Porn` (recommended) vs move under `4TB/Adult` — **DECIDED: keep**, root becomes configurable `adultRootFolder` |
| A3 | Metadata | A **filename grammar matrix** (recommended) must be defined: the live tree mixes
  `pornplus.26.08.29.lulu.chu... [hash].mp4` and `001 [hash].mp4`. Hash-only names cannot satisfy
  AC1 by parsing; they go to a review bucket. vs a metadata provider — **DECIDED: grammar matrix,
  no provider.** Measured on 2026-11-08: 196 videos in 6 classes, 95.9 % yield at least a title;
  8 hash-only files go to review. Matrix in
  [`evidence/phase0-inventory-20261108.md`](./evidence/phase0-inventory-20261108.md) |
| A4 | Discovery cadence | Weekly (recommended, matches the old job) vs daily — **DECIDED: weekly**, Sun 04:00 |
| A5 | Retention profile | Agent proposes, quarantine executes (recommended) vs hard cap by age/size only — **DECIDED: agent proposes, quarantine executes.** No hard age/size cap |

## Phase 0 record

Ratified 2026-11-08. Live inventory: 246 files / **196 videos** / 298 GB, flat root plus 8
sub-directories. Filename grammar matrix, isolation contract for `TV|MOVIE` and the Phase 1 design
are recorded in [`evidence/phase0-inventory-20261108.md`](./evidence/phase0-inventory-20261108.md).

## Provenance

Scoped from inventory `adult-orchestrator` rows, the v3 architecture
([`TARGET-ARCHITECTURE.md`](../chore_migrate_hermes_automation_20261107/design/TARGET-ARCHITECTURE.md) §4),
and the schema/root facts above. See [`plan.md`](./plan.md).
