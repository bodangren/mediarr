# Plan: Corner-Case Testing — WantedSearchService + ImportManager

## Phase 1 — WantedSearchService `titlesMatch` and `isSeasonComplete` Corner Cases

- [x] Create `WantedSearchService.titlesMatch.test.ts` — test Cardigann template syntax rejection (`{{` / `}}`)
- [x] Test `titlesMatch` with year-stripped series title (e.g., "The Sopranos" matching "Sopranos Complete")
- [x] Test `titlesMatch` rejecting release that contains but doesn't start with series name
- [x] Test `titlesMatch` with article-stripped variants ("A", "An", "The")
- [x] Test `isSeasonComplete` returning false when some episodes have null `airDateUtc`
- [x] Test `isSeasonComplete` returning false for empty episodes array
- [x] Test `autoSearchSeries` with series that has no monitored seasons (should skip entirely)
- [x] Test `autoSearchSeries` with series that has no specials season (should not crash)
- [x] Run `CI=true npx vitest run server/src/services/WantedSearchService.titlesMatch.test.ts` — confirm all pass

## Phase 2 — ImportManager Parser-Based "Slow Path"

- [x] Create `ImportManager.slowPath.test.ts` — test parser-based episode import (no linkedEpisodeId)
- [x] Test episode import via parser: parsed filename matches series+episode in DB, file organized
- [x] Test episode import via parser: series found but episode not found for that season/episode number — falls through to movie path
- [x] BUG: parsed episode with no matching DB episode does NOT fall through to movie path (documents known bug)
- [x] Test movie import via parser: `findMovieMatch` matches by year+title
- [x] Test movie import via parser: no movie root folder configured — IMPORT_FAILED emitted
- [x] Test no match found: parser returns null, `findMovieMatch` returns null — IMPORT_FAILED emitted
- [x] Run `CI=true npx vitest run server/src/services/ImportManager.slowPath.test.ts` — confirm all pass

## Phase 3 — ImportManager Retry and Helper Edge Cases

- [x] Create `ImportManager.helpers.test.ts` — test `parseInfoHash` with malformed entity refs
- [x] Test `retryImportByInfoHash` throws when torrent not found
- [x] Test `retryImportByActivityEventId` throws when event not found
- [x] Test `retryImportByActivityEventId` throws when event is not IMPORT_FAILED type
- [x] Test `retryImportByActivityEventId` falls back to sourcePath when torrent row is deleted
- [x] Test import hook failure: `onEpisodeImported` throws but import still succeeds (error logged, not re-thrown)
- [x] Run `CI=true npx vitest run server/src/services/ImportManager.helpers.test.ts` — confirm all pass

## Phase 4 — Full Suite Verification and Bug Fixes

- [x] Run `CI=true npx vitest run server/` — full server suite green (94 files, 682 tests, 0 failures)
- [x] Fix any bugs discovered during Phase 1–3 testing
- [x] Run `cd app && npm run build` — confirm frontend build unaffected
- [x] Commit all new tests and any bug fixes
