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

## Phase 3: Automation consumes the order [checkpoint: 052b4af1]

- [x] Subtitle fetch cycle pulls candidates through the priority query (highest bucket first) with the existing provider guard and per-run cap intact; test with a simulated provider — `listWantedSubtitlesByPriority` (pool ×5, variant→media, batched progress, sibling-series activity) wired into `processWantedQueue`; 2 simulated-provider tests; live ordering waits on a provider credential — 1687509
- [x] Bilingual cycle same ordering — candidate provider maps sidecar paths through `VariantSubtitleTrack.filePath` → variant → movie/episode, orders with `orderSubtitlePathsByPriority` (3 tests), logs the ordered count, degrades on failure; cycle consumes the order as given with a simulated-translator test — 09448275
- [x] Receipt names the order and each item's bucket — fetch cycle logs count/order/cap and `wanted <id> bucket=<bucket>`; bilingual provider logs ordered/mapped counts — 2ac3780

## Phase 4: SPA + client surface [checkpoint: 570d8082]

- [x] Wanted page: coverage card + grouped list, browser-verified — live `/wanted` shows "9 high-priority · 7 covered · 2 missing" and per-bucket sections with counts (BACKFILL · 25 in `device-20261107/wanted-grouped.jpg`); commits 9811f7c, 6189a9a, 9d568f1; 4 card + 17 page tests; reason badges deferred to the TV client — 97fda37
- [x] TV client: **nothing to pass through** — measured 2026-11-08: the Flutter client has no wanted surface (`grep -rn wanted lib test` = 0 hits; feature dirs are activity/calendar/discovery/home/library/playback/search/settings) and no `priority` usage (`grep -rn priority lib` = 0). A TV wanted screen would be its own track, not a pass-through — 97fda37
- [x] Browser check against the live server with the real library — `/wanted` renders the coverage card (9 high-priority · 7 covered · 2 missing) and bucket sections (BACKFILL · 25); evidence `device-20261107/wanted-coverage.jpg` + `wanted-grouped.jpg` — 97fda37

## Phase 5: Acceptance + close

- [x] Live high-priority coverage reported; every missing item explainable — measured 2026-11-08: high priority `{total: 9, covered: 7, missing: 2}` and subtitle search providers configured: **none** (`apiKeys` has no opensubtitles/subdl/assrt value), so both missing items are explained by `no-provider` and the automation idles with a visible notice rather than silently failing — 570d808
- [x] Server suite, SPA tests, `flutter analyze`/tests green; screenshots recorded — 2026-11-08: **62 server tests** across the 11 priority/coverage/wanted/bilingual files, **34 SPA tests** (`WantedPage`, `SubtitleCoverageCard`, `subtitleWantedApi`), server + app `tsc` clean, SPA rebuilt and browser-checked; screenshots `device-20261107/wanted-coverage.jpg`, `wanted-grouped.jpg`. Flutter client was not modified by this track (grep-only evidence) — 8f63fa6
- [x] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md` — registry status + evidence, TV-wanted-screen debt row, three lessons — 123af82
