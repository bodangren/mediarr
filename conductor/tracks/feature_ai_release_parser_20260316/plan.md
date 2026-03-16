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

- [ ] Task 5: Update `ImportManager` to use `ReleaseParser`
    - [ ] Replace `await Parser.parse(filename)` with `await releaseParser.parse(filename)`
    - [ ] Replace `await Parser.parse(torrent.name)` and `Parser.parseDirectory(torrent.name)` likewise
    - [ ] Handle `matchType === 'season_pack'`: when file is inside a season pack torrent, use `seasonNumber` from parsed result + derive episode number from filename's `SxxExx` pattern
    - [ ] Update `ImportManager.test.ts` — swap `Parser` mocks for `ReleaseParser` mocks

- [ ] Task 6: Update `FilenameParsingService` to delegate to `ReleaseParser`
    - [ ] `parseFilename(filename)`: call `releaseParser.parse(filename)`; map `ParsedRelease` → `ParsedMovieInfo`
    - [ ] `parseEpisodeFilename(filename)`: call `releaseParser.parse(filename)`; map → `ParsedEpisodeInfo`
    - [ ] Update `FilenameParsingService.test.ts`

- [ ] Task 7: Update remaining `Parser` call sites
    - [ ] `ExistingLibraryScanner`, `LibraryScanner`, `WantedSearchService`, `RssMediaMonitor` — swap `Parser.parse` → `releaseParser.parse`
    - [ ] `seriesRoutes.ts` (line ~270) — active torrent matching

- [ ] Task 8: Phase 2 complete — commit

---

## Phase 3: Search Path Integration + SSE Progress

### Context
- `MediaSearchService.searchAllIndexers()` collects indexer results then scores via `CustomFormatScoringEngine`
- `SearchParams` carries `season`, `episode`, `type`, `query`
- `ApiEventHub` is available for SSE events
- `WantedSearchService.autoSearchEpisode` filters candidates via `Parser.parse()`

---

- [ ] Task 9: Add SSE progress events to `searchAllIndexers`
    - [ ] Emit `search:querying` before parallel indexer calls
    - [ ] Emit `search:parsing` after indexer results collected, before AI batch call
    - [ ] Emit `search:done` with result count after scoring complete
    - [ ] `ApiEventHub` injected into `MediaSearchService` (or passed as optional dep)

- [ ] Task 10: Wire `parseBatch` into `searchAllIndexers`
    - [ ] After collecting all `IndexerRelease[]`, call `releaseParser.parseBatch(titles, context)` where `context` is derived from `SearchParams`
    - [ ] Attach `ParsedReleaseWithScore` to each `SearchCandidate` as `parsedRelease`
    - [ ] In `CustomFormatScoringEngine.scoreCandidateUnified()`: use `parsedRelease.relevanceScore` as `confidenceScore` when available; fall back to existing Levenshtein logic otherwise

- [ ] Task 11: Update `WantedSearchService` to accept season packs
    - [ ] `autoSearchEpisode`: replace `Parser.parse(candidate.title)` with `releaseParser.parse(candidate.title)`
    - [ ] Accept candidates where `matchType === 'season_pack'` AND `seasonNumber === episode.seasonNumber`
    - [ ] Accept candidates where `matchType === 'complete_series'` as last resort (score must still exceed threshold)
    - [ ] Update `WantedSearchService` tests

- [ ] Task 12: Phase 3 complete — commit

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
