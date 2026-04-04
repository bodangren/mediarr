# Spec: SearchAggregationService Comprehensive Corner-Case Testing

## Problem Statement

The SearchAggregationService (alias for MediaSearchService) coordinates the entire search-to-grab pipeline: querying indexers, aggregating results, AI batch parsing, unified scoring, deduplication, and torrent handoff. While 6 test files exist (~1500 lines), several critical corner cases remain untested:

1. **AI batch parsing failure** — `releaseParser.parseBatch()` has no try/catch; a thrown error crashes the entire `searchAllIndexers` call
2. **Custom format repository errors silently swallowed** — `findByQualityProfileId` errors are caught and silently ignored; no test verifies scoring still proceeds with defaults
3. **Notification failure during grab** — `notifyGrab()` is fire-and-forget; if it throws, the grab still succeeds but no test validates this isolation
4. **`searchEpisode`/`searchMovie` don't pass `qualityProfileId`** — scoring is suboptimal in these convenience methods; no test documents this behavior
5. **`extractInfoHash` edge cases** — malformed magnet URLs, base32-to-hex conversion, already-provided infoHash alongside magnetUrl
6. **Concurrent `searchAllIndexers` calls** — eventHub publishes could interleave; no concurrency guard exists

## Acceptance Criteria

- [ ] All identified corner cases have failing tests written first (Red phase)
- [ ] Any bugs discovered are fixed with minimal code changes (Green phase)
- [ ] All tests pass (target: 30+ new tests)
- [ ] Full test suite remains green after changes
- [ ] Production build succeeds

## Subsystem Scope

- `server/src/services/MediaSearchService.ts` — primary implementation
- `server/src/services/SearchAggregationService.ts` — thin alias
- `server/src/services/CustomFormatScoringEngine.ts` — scoring logic
- `server/src/services/ReleaseParser.ts` — AI batch parsing
- Existing test files in `tests/services/MediaSearchService/`

## Out of Scope

- UI changes
- Indexer implementation details
- TorrentManager lifecycle (already tested in prior tracks)
- RSS pipeline (already tested in prior tracks)
