# Event-type filtering is now SQL (0.3 s instead of an 8 s table export)

## Finding
After paginating the events *list*, the **type** filter was still the old export path: it selected every
activity row (253k) and classified/filtered in JS. Selecting `type=indexer` cost ~8 s.

## Fix
- Classification moved to `server/src/services/activityEventClassifier.ts` (shared by the route and,
  by mirrored rules, the repository SQL).
- `ActivityEventRepository.query` gained `classifiedType`, expressed as a SQL `CASE` over
  `instr(lower(eventType || ' ' || sourceModule), …)` in the **same keyword precedence** as the JS
  classifier. One scan, with pagination and `COUNT(*)`.
- The events list route now always uses `query()` (level + dates + classified type), so no request path
  exports the table.

## Live
```
/api/system/events?pageSize=5                0.007 s  253,271 events
/api/system/events?type=indexer&pageSize=5   0.320 s  214,345 (searches + RSS)
/api/system/events?type=download&pageSize=5  0.272 s   38,926
/api/system/events?type=other&pageSize=5     0.589 s        0
```
(`SEARCH_EXECUTED wanted-search-service` now classifies as `indexer`, which is what the dropdown means.)

## Tests
- In-memory SQL test seeds one event per discriminator and asserts the derived-type filter returns exactly
  the JS-classifier result (indexer/download/backup/other).
- Route truthfulness test now asserts the list query receives `classifiedType` and does not export.
