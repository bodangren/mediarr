# Plan — Adult library for Mediarr

> Contract-first + TDD per `measure/workflow.md`. **ACTIVE since 2026-11-08** — A1–A5 are ratified
> (spec §Open decisions) and the Phase 0 inventory is committed, so Phase 1 may proceed.

## Phase 0.5: Shared foundation (gate G10)

> The triumvirate review requires "one shared *library kinds + arbitrary roots + generic nav*
> foundation before Adult/YouTube/Music". Built once, here, rather than three times.

- [ ] Contract tests for the library registry: kinds, roots, seeding from settings, isolation from
      `TV|MOVIE` queries.
- [ ] `Library` table + migration; seed `MOVIES`/`TV` from the existing settings, add `ADULT`.
- [ ] `adultRootFolder` setting (default empty → library not scanned until configured).

## Phase 0: Ratify scope ✅ [checkpoint: 0723765b]

- [x] Resolve A1 visibility, A2 root, A3 metadata, A4 cadence, A5 retention — **2026-11-08:** visible
      section, keep `4TB/Porn`, filename grammar matrix + review bucket (no provider), weekly
      Sun 04:00, agent proposes / quarantine executes.
- [x] Confirm the existing `4TB/Porn` tree as migration input; record size/file count — **2026-11-08:**
      246 files, 196 videos (188 mp4 / 8 mkv), 49 jpg, 1 nfo, **298 GB**, flat root + 8 sub-dirs.
      Evidence: [`evidence/phase0-inventory-20261108.md`](./evidence/phase0-inventory-20261108.md).

## Phase 1: Domain + scan

- [ ] Contract test for the adult library type/root written first.
- [ ] Schema/type change isolated so `TV|MOVIE` queries cannot see the new library.
- [~] Scanner with flat-layout preservation and a scan summary — `AdultLibraryScanner` shipped: six-class filename grammar with review bucket, depth-first walk, layout preserved, unreadable directories reported; 9 tests — aafb814
- [ ] Seeded-tree counts test.

## Phase 2: API + UI (SPA first, TV after the focus fix)

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
