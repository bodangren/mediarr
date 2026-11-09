# Dashboard statistics: 10.9 s → 20–200 ms (2026-11-09)

## Symptom
`GET /api/system/stats` (used by the SPA dashboard and the report's live snapshot) took **10.93 s**
(`time curl`) and blocked the server event loop: every call added a ~10–14 s lag sample
(`maxLagMs 14562` in /api/health). The report refreshing every 5 minutes therefore caused the very
stalls it was displaying.

## Root cause
`/api/system/stats` used the Prisma-style shim, whose `count()` calls `findMany()` — it loads whole
tables into JS (including relation resolution) and filters in JavaScript. Six concurrent counts plus
variant scans and nested `fileVariants: none` filters made the route take ~11 s.

## Fix
New `readLibraryStats(sqlite)` (server/src/services/LibraryStatsQueries.ts) computes the identical
LibraryStats shape with indexed SQL aggregates; the route uses it when the SQLite handle is available
and falls back to the legacy path otherwise (existing route tests still cover the fallback). Quality
bucketing moved to a shared `libraryQuality.ts` module so both paths use the same classifier.

## After
```
stats 200 0.205 s (cold)
stats 200 0.020 s
stats 200 0.021 s     # was 10.93 s
```
Five consecutive calls left `eventLoop.maxLagMs` unchanged (987 ms, from process startup) and
`stallCount` unchanged — the endpoint no longer blocks the loop.

## One honest number change
`missing.episodes` went **1658 → 1623**. The 35-episode difference is exactly the monitored episodes
with `airDateUtc IS NULL` (unannounced): SQL `airDateUtc <= now` correctly excludes them, while the shim's
JS filter counted them as already missing. 1623 is the honest count (aired, monitored, no file). All
other numbers are byte-identical (`EQUAL` check across the full JSON except that field).

## Tests
`server/src/services/LibraryStatsQueries.test.ts` seeds an in-memory SQLite database (counts, file
sizes, quality buckets, missing with/without variants, 7/30-day activity windows) and asserts every
field; the fast path's numbers were also compared against the live endpoint before/after.

## Effect on the report itself
The 5-minute report refresh previously called this endpoint and created 10–14 s stalls. After the fix,
the live snapshot in Chrome reads:
**status ok · scheduler 18 tasks · recovered-at-start 0 · event-loop max lag 987 ms**
(vs 14,562 ms before) — the page no longer causes the latency it reports.
