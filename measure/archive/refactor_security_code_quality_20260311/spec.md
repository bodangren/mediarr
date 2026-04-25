# Spec: Security Hardening & Code Quality Refactor

## Context
Code review of the 2026-03-10 tracks (feature_notification_dispatch, feature_system_health,
feature_android_push_notifications, refactor_search_release_date_ui_cleanup) surfaced four
concrete issues that must be addressed before the codebase grows further.

## Problems

### P1 — SQL Value Parameterization (main.ts)
`repairMalformedJsonColumns()` uses `$executeRawUnsafe()` with a template-literal string that
interpolates `defaultJson` directly into the SQL text. Although the values come from a
hardcoded object, this violates the principle of parameterized queries and will fail lint /
security scanners. Fix: pass the JSON value as a positional parameter (second argument to
`$executeRawUnsafe`).

### P2 — Unsafe Date Parsing (systemRoutes.ts)
Three call sites use `new Date(queryString)` without validating the result. An invalid date
string silently produces `Invalid Date`, which makes comparisons return `false` for every
row — i.e., silent data corruption. Fix: use the existing `parseDate()` utility from
`routeUtils.ts`, which already returns `undefined` for invalid inputs.

### P3 — Unsafe Enum Coercion (systemRoutes.ts)
`EventLevel` and `EventType` values from query parameters are cast with `as EventLevel` and
`as EventType` without checking membership. An unknown string passes silently, corrupting
filters. Fix: add an inline enum guard that rejects non-member strings.

### P4 — Duplicated Filter-Parsing Logic (systemRoutes.ts)
The filter-parsing block (lines 526-536) is copy-pasted verbatim in the `/events` and
`/events/export` handlers. Fix: extract into a shared `parseEventFilters(query)` helper.

### P5 — Unguarded JSON.stringify in SSE publish (eventHub.ts)
`formatSseFrame()` calls `JSON.stringify(payload)` without a try/catch. A circular-reference
payload throws synchronously inside `publish()`, which propagates out and potentially crashes
the server process. Fix: wrap in try/catch and emit a safe error frame instead.

## Acceptance Criteria
- All existing tests still pass after changes.
- Production build (`cd app && npm run build`) succeeds.
- No new TS errors introduced.
- `parseDate()` is used everywhere dates come from query strings.
- `formatSseFrame` never throws even for circular-reference payloads.
