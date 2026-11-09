# Embedded-subtitle recovery status (2026-11-09)

The extraction pass is now observable without reading the journal:

```
GET /api/subtitles/extraction/status
{ tracks: 18, extracted: 15, failed: 3, queueRemaining: 331 }
```

- `extracted`/`failed` come from the durable `subtitle-extract-state.json` (3 attempts then skipped);
  `queueRemaining` is a live count of embedded text-Chinese tracks without a sidecar.
- The report's Subtitle-coverage card appends
  `· embedded 15 reclaimed, 331 queued`, so the owner sees the recovery pass next to coverage and sync.

`summarizeExtractionState` is unit-tested (9 extraction tests green).

## Sustained recovery (18:11)
```
extraction: 25 reclaimed, 6 attempt-capped failures, 321 queued (5/run, 0 fresh failures per run)
sync: 244 tried / 238 ok / 4 gave_up / 1,294 remaining · 3h rate 32.3/h · ETA 41 h
sync candidates: 1,512 -> 1,538 as reclaimed embedded sidecars enter the realignment pass
```
Full server suite after the extraction-status endpoint: **302 files / 2,839 tests passed, 11 skipped**.
