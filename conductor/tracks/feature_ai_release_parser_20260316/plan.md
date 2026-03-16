# Plan: AI Release Parser — Batch Search Scoring & Import Matching

## Phase 1: ReleaseParser Service

### Context
- `ai` and `@ai-sdk/openai` already installed in `server/`
- `DEEPSEEK_API_KEY` already in `.env`
- `AiParsingService` exists and will be deleted at end of Phase 4
- Serial queue pattern from `AiParsingService` is reimplemented here

---

- [x] Task 1: Define `ParsedRelease` Zod schema and `SearchContext` type
    - [x] Create `server/src/services/ReleaseParser.ts`
    - [x] Define and export `ParsedReleaseSchema` (zod), `ParsedRelease`, `ParsedReleaseWithScore`, `SearchContext`
    - [x] `matchType` enum: `episode | season_pack | complete_series`
    - [x] `quality` sub-object: `resolution`, `source`, `codec`

- [x] Task 2: Write failing tests for `ReleaseParser`
    - [x] Create `server/src/services/ReleaseParser.test.ts`
    - [x] Mock `@ai-sdk/openai` and `ai` modules via `vi.mock`
    - [x] `parse()`: returns `ParsedRelease` on success; `null` on schema failure; `null` on network error; falls back to regex for `SxxExx` filenames when AI returns null
    - [x] `parse()`: serial queue — second call waits for first
    - [x] `parseBatch()`: single call returns scored array aligned with input; returns `[]` on failure
    - [x] `parseBatch()`: `season_pack` scores higher than `complete_series` for a season-specific context
    - [x] Run tests; confirm all fail (Red) ✓

- [x] Task 3: Implement `ReleaseParser`
    - [x] `createOpenAI()` from `@ai-sdk/openai` with `baseURL: https://api.deepseek.com` + `DEEPSEEK_API_KEY`
    - [x] `parse()`: `generateObject({ model, schema: ParsedReleaseSchema, prompt })` with 10s timeout, 2 retries, serial queue; regex fallback on null
    - [x] `parseBatch()`: `generateObject` with `z.array(ParsedReleaseWithScoreSchema)`, single call, 15s timeout; returns `[]` on failure
    - [x] Batch prompt includes `SearchContext` when provided
    - [x] Export singleton `releaseParser`
    - [x] Run tests; confirm all pass (Green) ✓

- [x] Task 4: Phase 1 complete — commit

---

## Phase 2: Import Path Integration

### Context
- `ImportManager` calls `Parser.parse()` at lines 329, 335, 339
- `FilenameParsingService` calls `aiParsingService.parse()` for `parseFilename` and `parseEpisodeFilename`
- `Parser.ts` retains regex methods as static helpers (used by `ReleaseParser` fallback)

---

- [x] Task 5: Update `ImportManager` to use `ReleaseParser`
    - [x] Replace `await Parser.parse(filename)` with `await releaseParser.parse(filename)`
    - [x] Replace `await Parser.parse(torrent.name)` and `Parser.parseDirectory(torrent.name)` likewise
    - [x] Update `ImportManager.test.ts` — swap `Parser` mocks for `ReleaseParser` mocks

- [x] Task 6: Update `FilenameParsingService` to delegate to `ReleaseParser`
    - [x] `parseFilename(filename)`: call `releaseParser.parse(filename)`; map `ParsedRelease` → `ParsedMovieInfo`
    - [x] `parseEpisodeFilename(filename)`: call `releaseParser.parse(filename)`; map → `ParsedEpisodeInfo`

- [x] Task 7: Update remaining `Parser` call sites
    - [x] `ExistingLibraryScanner`, `LibraryScanner`, `WantedSearchService`, `RssMediaMonitor` — swap `Parser.parse` → `releaseParser.parse`
    - [x] `seriesRoutes.ts` (line ~270) — active torrent matching
    - [x] Cascade fixes: `importRoutes.ts`, `ImportMatchService.ts`, `BulkImportService.ts` and their tests, `ExistingLibraryScanner.test.ts`

- [x] Task 8: Phase 2 complete — commit

---

## Phase 3: Search Path Integration + SSE Progress

### Context
- `MediaSearchService.searchAllIndexers()` collects indexer results then scores via `CustomFormatScoringEngine`
- `SearchParams` carries `season`, `episode`, `type`, `query`
- `ApiEventHub` is available for SSE events
- `WantedSearchService.autoSearchEpisode` filters candidates via `Parser.parse()`

---

- [x] Task 9: Add SSE progress events to `searchAllIndexers`
    - [x] Emit `search:querying` before parallel indexer calls
    - [x] Emit `search:parsing` after indexer results collected, before AI batch call
    - [x] Emit `search:done` with result count after scoring complete
    - [x] `ApiEventHub` added as optional dep to `MediaSearchService` constructor

- [x] Task 10: Wire `parseBatch` into `searchAllIndexers`
    - [x] After collecting all releases, call `releaseParser.parseBatch(titles, context)` derived from `SearchParams`
    - [x] Attach `ParsedReleaseWithScore` to each `SearchCandidate` as `parsedRelease`
    - [x] `CustomFormatScoringEngine.scoreCandidateUnified()`: use `parsedRelease.relevanceScore` as `confidenceScore` when available; fall back to Levenshtein otherwise

- [x] Task 11: Update `WantedSearchService` to accept season packs
    - [x] Done in Phase 2: `autoSearchEpisode` uses `matchType` guards (episode/season_pack/complete_series)
    - [x] `FilenameParsingService.test.ts` + `ExistingLibraryScanner.test.ts` updated to mock `releaseParser`

- [x] Task 12: Phase 3 complete — commit

---

## Phase 4: Cleanup & Integration

- [ ] Task 13: Delete `AiParsingService`
    - [ ] Remove `server/src/services/AiParsingService.ts` and `AiParsingService.test.ts`
    - [ ] Remove all imports of `aiParsingService` from `Parser.ts` and `FilenameParsingService.ts`
    - [ ] `Parser.ts` becomes pure regex static helpers (no AI); exported for use as fallback inside `ReleaseParser`

- [ ] Task 14: TypeScript clean compile
    - [ ] `npx tsc --noEmit -p server/tsconfig.json` — zero errors

- [ ] Task 15: Full test suite
    - [ ] `CI=true npx vitest run` — all tests pass

- [ ] Task 16: Phase 4 complete — commit
