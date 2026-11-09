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
