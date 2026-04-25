# Plan: Security Hardening & Code Quality Refactor

## Phase 1 — SQL Parameterization & Date Safety
- [x] Fix `main.ts` `repairMalformedJsonColumns()`: pass `defaultJson` as a positional parameter to `$executeRawUnsafe` instead of interpolating it into the SQL string
- [x] Fix `systemRoutes.ts` date parsing: replace bare `new Date(query.startDate as string)` / `new Date(query.endDate as string)` calls with `parseDate(query.startDate)` from `routeUtils.ts` (3 call sites: GET /events, DELETE /events/clear, GET /events/export)
- [x] Import `parseDate` into `systemRoutes.ts`

## Phase 2 — Enum Guards & Deduplication
- [x] Add `isEventLevel()` / `isEventType()` inline guards in `systemRoutes.ts` using the existing union type literals
- [x] Replace unsafe `query.level as EventLevel` / `query.type as EventType` casts with guarded assignments (throw ValidationError or silently skip on unknown value)
- [x] Extract duplicated filter-parsing block into a `parseEventFilters(query: Record<string, unknown>)` helper function above the routes
- [x] Replace both duplicate blocks in `/events` and `/events/export` handlers with a call to `parseEventFilters()`

## Phase 3 — SSE Hardening & Tests
- [x] Wrap `JSON.stringify(payload)` in `formatSseFrame()` (eventHub.ts) in a try/catch; on error, emit a `{"error":"serialization_failed"}` data frame so the connection stays alive
- [x] Add a unit test in `eventHub.test.ts` that verifies a circular-reference payload does NOT throw (emits an error frame instead)
- [x] Run full server test suite; verify no regressions (4 pre-existing failures only)
- [x] Run `cd app && npm run build`; verify no new TS errors
