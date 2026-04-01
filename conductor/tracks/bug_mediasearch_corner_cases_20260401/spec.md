# Spec: MediaSearchService Corner-Case Testing

## Problem
The directive identifies `SearchAggregationService` / `MediaSearchService` as the 3rd priority subsystem for comprehensive corner-case testing. Existing tests cover `grabRelease` URL normalization, `grabReleaseByGuid` paths, and basic indexer resilience, but several important behaviors are untested:

1. **Empty indexer list** — `searchAllIndexers` returns empty without querying any indexer
2. **InfoHash deduplication** — two indexers returning the same release by infoHash should be deduplicated
3. **Scoring and ranking** — releases sorted by customFormatScore then seeders then size
4. **Activity event emission** — `SEARCH_EXECUTED` event fired on successful search
5. **IMDB fallback success** — movie search with imdbId: primary returns empty, fallback succeeds
6. **All indexers fail** — every indexer errors out; returns empty releases with all statuses marked
7. **`searchEpisode` and `searchMovie`** — public API integration methods
8. **`getSearchCandidates`** — legacy query conversion method

## Acceptance Criteria
- All new tests pass
- No regressions in existing 193 passing tests
- Any bugs discovered are fixed with TDD (Red → Green → Refactor)
- Coverage expands to cover all listed gaps

## Scope
- `server/src/services/MediaSearchService.ts` — all public methods
- New test file: `server/src/services/MediaSearchService.searchAllIndexers.test.ts`
- New test file: `server/src/services/MediaSearchService.publicApi.test.ts`
