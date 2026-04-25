# Plan: SearchAggregationService Comprehensive Corner-Case Testing

## Phase 1: AI Batch Parsing & Scoring Failure Modes

Tests for the most critical untested failure paths in the search pipeline.

- [x] AI batch parsing throws — `searchAllIndexers` should not crash, should fall back to Levenshtein-only scoring (bug fixed: added try/catch)
- [x] Custom format repository throws — scoring should proceed with defaults (no custom format rules)
- [x] Notification dispatch throws during grab — grab should still succeed, error silently swallowed
- [x] `searchEpisode` without qualityProfileId — verify scoring still works (confidence + indexer + seed scores only)
- [x] `searchMovie` without qualityProfileId — verify scoring still works

Test run checkpoint: `CI=true bun run test --run 2>&1 | tail -40`

## Phase 2: InfoHash Extraction & Quality Inference Edge Cases

Tests for utility functions that feed into the scoring pipeline.

- [x] `extractInfoHash` with malformed magnet URL (short hash, missing hash)
- [x] `extractInfoHash` with base32 hash — verify conversion behavior (lowercases, no actual base32→hex)
- [x] `extractInfoHash` when infoHash already provided alongside magnetUrl
- [x] `inferQualityFromTitle` with multiple resolution markers
- [x] `inferQualityFromTitle` with no quality markers
- [x] `normalizeIndexerFlags` with mixed delimiters, empty segments, whitespace-only

Test run checkpoint: `CI=true bun run test --run 2>&1 | tail -40`

## Phase 3: Search Query Building & Legacy API Edge Cases

Tests for query conversion and deprecated API paths.

- [x] `toSearchQuery` with tmdbId=0, tvdbId=0
- [x] `toSearchQuery` with categories provided alongside type-based defaults
- [x] `toSearchQuery` with empty string imdbId
- [x] `getSearchCandidates` with non-numeric tmdbid string (NaN conversion)
- [x] `grabReleaseByGuid` with downloadClientId — verify it's ignored
- [x] Promise.allSettled rejection path — force construction-time throw

Test run checkpoint: `CI=true bun run test --run 2>&1 | tail -40`

## Phase 4: Bug Fixes & Coverage Expansion

Fix any bugs discovered in Phases 1-3 and expand coverage to adjacent corner cases.

- [x] Fix AI batch parsing crash (add try/catch with fallback)
- [x] No other bugs discovered — all corner cases behave as expected
- [x] Add concurrent searchAllIndexers test (verify event interleaving behavior)
- [x] Final test suite verification

Test run checkpoint: `CI=true bun run test --run 2>&1 | tail -40`

## Phase 5: Verification & Archive

- [ ] Run full test suite: `CI=true bun run test --run 2>&1 | tail -60`
- [ ] Run production build: `cd app && npm run build 2>&1 | tail -20`
- [ ] Update memory files
- [ ] Archive track
