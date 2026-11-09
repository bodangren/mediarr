# The owner-facing report is live and self-refreshing in Chrome (2026-11-09)

Requirement: keep a single HTML report open in Chrome, recent improvements at the top, reload every
five minutes.

Browser measurement (webbridge `evaluate` on the open tab):

```json
{
  "url": "http://127.0.0.1:5174/reports/features.html",
  "title": "Mediarr — System Feature Report",
  "metaRefresh": "300",
  "type": "reload",          // navigation type: the page refreshed itself, it was not re-opened
  "msSinceLoad": 283183      // loaded 4m43s ago, i.e. inside a 5-minute refresh cycle
}
```

`performance.getEntriesByType('navigation')[0].type === 'reload'` proves the meta refresh fired in the
real browser; `msSinceLoad ≈ 283 s` puts the measurement within the 5-minute cycle. The page is served
from disk per request with `Cache-Control: no-store`, so a track-end edit appears on the next reload
without restarting anything.
