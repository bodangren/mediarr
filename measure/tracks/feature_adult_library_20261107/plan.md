# Plan — Adult library for Mediarr

> Contract-first + TDD per `measure/workflow.md`. **Scoped track: no task starts until A1–A5 are
> decided and the track is promoted to active.**

## Phase 0: Ratify scope

- [ ] Resolve A1 visibility, A2 root, A3 metadata, A4 cadence, A5 retention.
- [ ] Confirm the existing `4TB/Porn` tree as migration input; record size/file count.

## Phase 1: Domain + scan

- [ ] Contract test for the adult library type/root written first.
- [ ] Schema/type change isolated so `TV|MOVIE` queries cannot see the new library.
- [ ] Scanner with flat-layout preservation and a scan summary.
- [ ] Seeded-tree counts test.

## Phase 2: API + UI

- [ ] Browse/search/list endpoints scoped to the adult library.
- [ ] Playback (existing stream handler) + watched state integration.
- [ ] Flutter client section (TV-safe focus walk); SPA section.
- [ ] Automation contract: list, watched, retention candidates.

## Phase 3: Agent discovery

- [ ] Browser-bridge prompt for discovery (score profile: Asian dominant, scene-style; avoid list).
- [ ] Queue via Mediarr torrent API; dedupe by info hash.
- [ ] Receipt + ledger row; forced browser failure alerts.

## Phase 4: Prune + migration

- [ ] Retention candidates → quarantine manifest; restore/delete proven.
- [ ] Import the existing tree; compare counts.
- [ ] Remove all jellyfin-go references.

## Phase 5: Close

- [ ] Acceptance criteria verified on the TV box.
- [ ] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md`; archive.
