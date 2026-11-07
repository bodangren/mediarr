# Plan — Subtitle coverage + viewing-priority wanted queue

> Contract-first + TDD per `measure/workflow.md`. ACTIVE 2026-11-08; Phase 0 is measured on the live
> server (spec §Provenance), so Phase 1 may proceed.

## Phase 0: Measure the gap ✅

- [x] Count wanted rows and their states on the live DB — **2026-11-08:** 1,740 rows, all `FAILED`.
- [x] Count existing subtitle tracks by language/source — 1,513 `zho` EXTERNAL, 402 `chi` EMBEDDED,
      1,353 `en` EMBEDDED.
- [x] Confirm the bilingual pipeline and its cadence — `bilingual-subs` every 2 h, `limit: 3`,
      120 s translator deadline, in-flight guard.
- [x] Confirm the SPA wanted page has no ordering — `wantedApi.listMissingMovies` only paginates.

## Phase 1: Priority model (server)

- [ ] Contract tests for the classifier: bucket precedence, recency tie-break, stability.
- [ ] `ViewingPriorityService` (pure function over progress rows) + SQL shape that returns
      `{ itemId, kind, bucket, lastPlayedAt, added }`.
- [ ] Unit tests for finished vs in-progress, 14-day/30-day boundaries, and items with no playback.

## Phase 2: Coverage + ordered APIs

- [ ] `GET /api/subtitles/coverage` with per-bucket counts and EN/ZH/bilingual/none tallies + route
      tests.
- [ ] Order `GET /api/subtitles/wanted/series|movies` by bucket then recency; add `priority` and
      `bucket` filter; route tests for ordering and filtering.
- [ ] Sort `GET /api/media/wanted` with the same model (no shape change).

## Phase 3: Automation consumes the order

- [ ] Subtitle fetch cycle pulls candidates through the priority query (highest bucket first) with
      the existing provider guard and per-run cap intact; test with a simulated provider.
- [ ] Bilingual cycle same ordering; test with a simulated translator.
- [ ] Receipt log line records the bucket of each processed item.

## Phase 4: SPA + client surface

- [ ] Wanted page: grouped sections with counts, coverage card, reason badges; component tests.
- [ ] TV client: pass through `priority`/`bucket` for the wanted/watched surfaces (read-only).
- [ ] Browser check against the live server with the real library.

## Phase 5: Acceptance + close

- [ ] Live high-priority coverage reported; every missing item explainable.
- [ ] Server suite, SPA tests, `flutter analyze`/tests green; screenshots recorded.
- [ ] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md`.
