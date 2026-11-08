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
      Sun 04:00, agent proposes / quarantine executes — 0723765
- [x] Confirm the existing `4TB/Porn` tree as migration input; record size/file count — **2026-11-08:**
      246 files, 196 videos (188 mp4 / 8 mkv), 49 jpg, 1 nfo, **298 GB**, flat root + 8 sub-dirs.
      Evidence: [`evidence/phase0-inventory-20261108.md`](./evidence/phase0-inventory-20261108.md) — 0723765

## Phase 1: Domain + scan [checkpoint: b49d424b]

- [x] Contract test for the adult library type/root written first — registry test pins `ADULT` kind + root/disabled semantics — c87e372
- [x] Schema/type change isolated so `TV|MOVIE` queries cannot see the new library — `Library` (migration 0008) + `AdultItem` (migration 0009) are separate tables; registry/import tests prove isolation — 9ed0044
- [x] Scanner with flat-layout preservation and a scan summary — `AdultLibraryScanner` (six-class grammar + review bucket, depth-first walk) and `AdultLibraryService.importAdultLibrary` (upsert by path, reports notSeen without deleting); **live import of `/data/Porn`: scanned 196, created 196, needsReview 8, unreadable 0, notSeen 0** — 9720fff
- [x] Seeded-tree counts test — live seeded tree: **196 items / 8 needsReview / 297 GB** in `AdultItem`, matching the Phase 0 inventory exactly; API returns 196 rows — 9720fff

## Phase 2: API + UI (SPA first, TV after the focus fix)

- [x] Browse/search/list endpoints scoped to the adult library — `GET /api/libraries`, `GET /api/adult/items` with `q`/`page`/`pageSize` (title, filename, studio) returning `items/page/pageSize/totalCount/needsReview`; live verified against the 196-item tree — 9720fff, 3d229b6
- [x] Playback (existing stream handler) + watched state integration — `GET /api/adult/items/:id/stream` serves Range/206 (live: 1024/264237135 bytes, partial content); progress stored on `AdultItem` (migration 0010) so it cannot enter movie/episode Continue Watching — PlaybackProgress count stayed 9 after posting progress on the live DB — ac93e8f
- [~] Flutter client section (TV-safe focus walk); SPA section.
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
