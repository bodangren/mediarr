# Browser verification of the performance fixes (2026-11-09)

Measured inside the open Chrome tab on the running SPA.

## Gzip actually applied over the wire
```js
fetch('/assets/index-C8aCyAkT.js?gzip-check=1', {cache:'no-store'})
// -> content-encoding: gzip; buffer decodes to 1,984,061 bytes
performance resource entry:
{ encodedBodySize: 543684, decodedBodySize: 1984061, transferSize: 543984 }
```
So the bundle is **544 KB on the wire** (encoded) for **1.98 MB decoded** — the static gzip fix is real in a
browser, not only in curl.

## Events page after the SQL pagination fix
```js
fetch('/api/system/events?pageSize=25')
// -> 8 ms, 25 items, totalCount 253271
```
The Events page renders the 253,271-event log instantly (screenshot
`spa-events-fast-20261109.jpg`) instead of stalling ~8 s.

## Note for follow-up
The events list is currently dominated by `Error` rows like “Automated search skipped for <title>: No
releases found” from `wanted-search-service`; those are normal no-match outcomes logged as `success=false`,
so they surface as errors. Worth a semantic pass (warning/info level or a dedicated event type) in a later
round rather than being silently hidden.
