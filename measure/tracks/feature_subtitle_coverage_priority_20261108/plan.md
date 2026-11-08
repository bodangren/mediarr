# Plan — Subtitle coverage + viewing-priority wanted queue

> Contract-first + TDD per `measure/workflow.md`. ACTIVE 2026-11-08; Phase 0 is measured on the live
> server (spec §Provenance), so Phase 1 may proceed.

## Phase 0: Measure the gap ✅

- [x] Count wanted rows and their states on the live DB — 2026-11-08: 1,740 rows, all `FAILED` — 0723765
- [x] Count existing subtitle tracks by language/source — 1,513 `zho` EXTERNAL, 402 `chi` EMBEDDED, 1,353 `en` EMBEDDED — 0723765
- [x] Confirm the bilingual pipeline and its cadence — `bilingual-subs` every 2 h, `limit: 3`, 120 s translator deadline, in-flight guard — 0723765
- [x] Confirm the SPA wanted page has no ordering — `wantedApi.listMissingMovies` only paginates — 0723765

## Phase 1: Priority model (server)

- [x] Contract tests for the classifier: bucket precedence, recency tie-break, stability — 13 tests in `server/src/services/ViewingPriorityService.test.ts` covering bucket precedence, both window boundaries, sort order and stability — 098f153
- [x] `ViewingPriorityService` — pure functions `classifyViewingPriority`, `rankByViewingPriority`, `compareViewingPriority`, `isHighPriority`; buckets continue-watching → recently-watched (14 d) → recently-added (30 d) → backfill — 098f153
- [x] Wire the SQL query (progress ⋈ movie/episode) that feeds it — `ViewingPriorityQuery` batches one query per media type and feeds the classifier — 67c3193
- [x] Unit tests for finished vs in-progress, 14-day/30-day boundaries, and items with no playback — 098f153

## Phase 2: Coverage + ordered APIs [checkpoint: 9d910b2c]

- [x] `GET /api/subtitles/coverage` with per-bucket counts and EN/ZH/bilingual/none tallies + route tests — live: 3,162 items, high priority 9 (7 covered, 2 missing); 3 route tests in `subtitleRoutes.coverage.test.ts` — b9c3aaa
- [x] Order `GET /api/subtitles/wanted/series|movies` by bucket then recency; `priority` field and `bucket` filter with 3 route tests — live: in-progress ranks first, backfill filter returns 1,202 — c822cc7
- [x] Sort `GET /api/media/wanted` with the same model (no shape change) — live: 1,736 items in priority order; explicit `sortBy` still honoured, 2 tests — ba465aa
- [x] Episodes inherit **series-level** viewing priority in the acquisition list — siblings aggregated per wanted series; live page 1 = Archer, which holds the newest episode progress (23:57 vs Reacher 21:50) — 912cd6e

## Phase 3: Automation consumes the order

- [x] Subtitle fetch cycle pulls candidates through the priority query (highest bucket first) with the existing provider guard and per-run cap intact; test with a simulated provider — `listWantedSubtitlesByPriority` (pool ×5, variant→media, batched progress, sibling-series activity) wired into `processWantedQueue`; 2 simulated-provider tests; live ordering waits on a provider credential — 1687509
- [~] Bilingual cycle same ordering — candidate provider maps sidecar paths through `VariantSubtitleTrack.filePath` → variant → movie/episode, orders with `orderSubtitlePathsByPriority` (3 unit tests), logs the ordered count, degrades to filesystem order on failure — f7e85a. Remaining: cycle-level simulated-translator test asserting the processing order.
- [x] Receipt names the order and each item's bucket — fetch cycle logs count/order/cap and `wanted <id> bucket=<bucket>`; bilingual provider logs ordered/mapped counts — 2ac3780

## Phase 4: SPA + client surface

- [ ] Wanted page: grouped sections with counts, coverage card, reason badges; component tests.
- [ ] TV client: pass through `priority`/`bucket` for the wanted/watched surfaces (read-only).
- [ ] Browser check against the live server with the real library.

## Phase 5: Acceptance + close

- [ ] Live high-priority coverage reported; every missing item explainable.
- [ ] Server suite, SPA tests, `flutter analyze`/tests green; screenshots recorded.
- [ ] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md`.
