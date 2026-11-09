# System events page: 8.3 s → 12 ms (2026-11-09)

## Symptom
`GET /api/system/events` took **8.3 s** — the SPA Events page and any activity export stalled the event
loop while it answered.

## Root cause
The handler called `ActivityEventRepository.export()` (every row, no limit) and then filtered/paginated
in JS. The live table holds **253,271** activity events.

## Fix
- The common path (no classified-type filter) now calls `repository.query()`: success/date filters and
  LIMIT/OFFSET are pushed into SQL, and `COUNT(*)` supplies `totalCount`.
- `level=warning|fatal` returns an empty page immediately: activity events only carry success
  true/false, so the old path scanned the entire table to produce an empty result.
- The classified-`type` path still uses export + `classifyEventType` (that mapping is not expressible in
  SQL), so behaviour there is unchanged.

## After (live)
```
/api/system/events?pageSize=50                   0.012 s   (was 8.31 s)
/api/system/events?page=1&pageSize=25&level=error 0.164 s
/api/system/events?level=warning                 0.001 s
total events: 253,271
```

## Tests
Two new route tests: pagination goes through `repository.query` (export not called) and warning returns an
empty page without touching the repository; existing truthfulness tests still green (11).
