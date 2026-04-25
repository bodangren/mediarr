# Plan: MediaSearchService Corner-Case Testing

## Phase 1 — searchAllIndexers: empty state, dedup, ranking
- [x] Test: empty indexer list returns empty result without querying — 5dcfef9
- [x] Test: infoHash deduplication keeps higher-ranked release — 5dcfef9
- [x] Test: releases sorted by customFormatScore (desc), then seeders (desc), then size (desc) — 5dcfef9
- [x] Test: dedup preserves releases without infoHash (no dedup for them) — 5dcfef9

## Phase 2 — searchAllIndexers: fallback, failures, events
- [x] Test: movie IMDB fallback succeeds when primary returns empty — d18b9c8
- [x] Test: all indexers fail returns empty releases with error statuses — d18b9c8
- [x] Test: SEARCH_EXECUTED activity event emitted on successful search — d18b9c8
- [x] Test: non-movie type does NOT trigger IMDB fallback — d18b9c8

## Phase 3 — searchEpisode, searchMovie, getSearchCandidates
- [x] Test: searchEpisode returns null when no candidates found — 7c2af88
- [x] Test: searchEpisode grabs best candidate when results exist — 7c2af88
- [x] Test: searchMovie returns null when no candidates found — 7c2af88
- [x] Test: searchMovie grabs best candidate when results exist — 7c2af88
- [x] Test: getSearchCandidates converts legacy query format correctly — 7c2af88

## Phase 4 — Full suite verification
- [x] Run full test suite, confirm no regressions — 195 passed, 1 pre-existing failure
- [x] Fix any bugs found during testing — no bugs found
