# Movie/series lists: relation lookups indexed (2026-11-09)

## Symptom
`GET /api/movies?pageSize=50` took **0.94 s**, `GET /api/series?pageSize=50` **0.78 s** — the two pages the
SPA opens first.

## Root cause
The database shim resolves Prisma-style includes by filtering the **whole related table for every parent
row**: 567 movies x 991 variants, and each variant again filters its subtitle/missing rows. That is
O(parents x children) JS work per request; the rows themselves were already cached, the lookups were not.

## Fix
`QueryContext` gained a `relationIndex` built lazily per `<model>.<targetField>`; relation lookups become
map accesses instead of table scans (preserving table order). This benefits every shim-powered include,
not just movies/series.

## After (same live library)
```
movies  0.94 s -> 0.18 s cold, 0.108 s warm
series  0.78 s -> 0.20 s cold, 0.123 s warm
```
Payload unchanged (50 items, same `fileVariants`, `playbackState` etc.).

## Verification
- `server/src/db` + MediaService tests: 8 files / 57 tests green.
- Full server suite re-run after the change (see suites evidence).
- Live response spot-check: first movie `12 Angry Men`, 2 variants; list shape unchanged.
