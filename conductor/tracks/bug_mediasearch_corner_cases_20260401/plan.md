# Plan: MediaSearchService Corner-Case Testing

## Phase 1 — searchAllIndexers: empty state, dedup, ranking
- [x] Test: empty indexer list returns empty result without querying — 5dcfef9
- [x] Test: infoHash deduplication keeps higher-ranked release — 5dcfef9
- [x] Test: releases sorted by customFormatScore (desc), then seeders (desc), then size (desc) — 5dcfef9
- [x] Test: dedup preserves releases without infoHash (no dedup for them) — 5dcfef9

## Phase 2 — searchAllIndexers: fallback, failures, events
- [x] Test: movie IMDB fallback succeeds when primary returns empty
- [x] Test: all indexers fail returns empty releases with error statuses
- [x] Test: SEARCH_EXECUTED activity event emitted on successful search
- [x] Test: non-movie type does NOT trigger IMDB fallback

## Phase 3 — searchEpisode, searchMovie, getSearchCandidates
- [ ] Test: searchEpisode returns null when no candidates found
- [ ] Test: searchEpisode grabs best candidate when results exist
- [ ] Test: searchMovie returns null when no candidates found
- [ ] Test: searchMovie grabs best candidate when results exist
- [ ] Test: getSearchCandidates converts legacy query format correctly

## Phase 4 — Full suite verification
- [ ] Run full test suite, confirm no regressions
- [ ] Fix any bugs found during testing
