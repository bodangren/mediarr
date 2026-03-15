# Plan: AI-Powered Filename Parsing

## Phase 1: AiParsingService

### Context
- Model: `glm-4.7-flash`
- Base URL: `https://api.z.ai/api/paas/v4/`
- Auth: `GLM_API_KEY` env var (already in `.env`)
- `openai` npm package not yet installed in `server/`

---

- [ ] Task 1: Install `openai` package
    - [ ] Run `cd server && bun add openai` (or `npm install openai`)
    - [ ] Verify it appears in `server/package.json` dependencies

- [ ] Task 2: Write failing tests for `AiParsingService`
    - [ ] Create `server/src/services/AiParsingService.test.ts`
    - [ ] Mock `openai` module via `vi.mock('openai')`
    - [ ] Test: successful call returns parsed JSON of type T
    - [ ] Test: malformed JSON response returns `null`
    - [ ] Test: response missing required fields returns `null`
    - [ ] Test: first attempt throws network error → retries → succeeds on 2nd attempt
    - [ ] Test: all 3 attempts throw network error → returns `null`
    - [ ] Test: attempt times out (mock AbortError / timeout) → retries → falls back to `null`
    - [ ] Run tests; confirm all fail (Red)

- [ ] Task 3: Implement `AiParsingService`
    - [ ] Create `server/src/services/AiParsingService.ts`
    - [ ] Instantiate OpenAI client with `baseURL` + `GLM_API_KEY`
    - [ ] Implement `parse<T>(systemPrompt, userPrompt, requiredFields?: string[]): Promise<T | null>`
    - [ ] Add 10 s `AbortSignal.timeout()` per attempt
    - [ ] Add retry loop: max 3 attempts, back-off 1 s / 2 s
    - [ ] Parse response content as JSON; validate required fields
    - [ ] Export singleton instance `aiParsingService`
    - [ ] Run tests; confirm all pass (Green)

- [ ] Task 4: Conductor - User Manual Verification 'Phase 1: AiParsingService' (Protocol in workflow.md)

---

## Phase 2: Parser.ts — Async + AI Integration

### Context
- `Parser` is a static-method class (`server/src/utils/Parser.ts`)
- 9 non-test call-site files: `WantedSearchService.ts`, `RssMediaMonitor.ts`,
  `RssSyncService.ts`, `seriesRoutes.ts`, `ImportManager.ts`,
  `ExistingLibraryScanner.ts`, `LibraryScanner.ts`, `TorznabParser.ts`,
  plus `WantedSearchService.episodeValidation.test.ts` (test file — update mocks only)
- Lessons learned: making static methods async requires all callers to await

---

- [ ] Task 5: Write failing tests for async `Parser` methods
    - [ ] Open `server/src/utils/Parser.test.ts` and add async test variants
    - [ ] Test `parse()`: mock `aiParsingService.parse` → returns valid `ParsedInfo` JSON
    - [ ] Test `parse()`: mock AI returns `null` → result equals current regex output
    - [ ] Test `parseMovie()`: AI success path
    - [ ] Test `parseMovie()`: AI failure → regex fallback
    - [ ] Test `parseDirectory()`: AI success path
    - [ ] Test `parseDirectory()`: AI failure → regex fallback
    - [ ] Run tests; confirm new tests fail (Red)

- [ ] Task 6: Update `Parser.ts` — async + AI primary
    - [ ] Import `aiParsingService` singleton
    - [ ] Change `parse`, `parseMovie`, `parseDirectory` to `async`
    - [ ] Each method: call `aiParsingService.parse<T>(systemPrompt, filename, requiredFields)`
    - [ ] On non-null AI result: return it
    - [ ] On null: run existing regex logic (moved to private `_parseRegex`, etc.)
    - [ ] Run tests; confirm all pass (Green)

- [ ] Task 7: Update all `Parser` call-site files
    - [ ] `WantedSearchService.ts` — await `Parser.parse()` / `Parser.parseMovie()`
    - [ ] `RssMediaMonitor.ts` — await relevant calls
    - [ ] `RssSyncService.ts` — await relevant calls
    - [ ] `seriesRoutes.ts` — await relevant calls
    - [ ] `ImportManager.ts` — await relevant calls
    - [ ] `ExistingLibraryScanner.ts` — await relevant calls
    - [ ] `LibraryScanner.ts` — await relevant calls
    - [ ] `TorznabParser.ts` — await relevant calls
    - [ ] Update `WantedSearchService.episodeValidation.test.ts` mock if needed
    - [ ] Run `CI=true bun run test --run`; confirm no new failures

- [ ] Task 8: Conductor - User Manual Verification 'Phase 2: Parser.ts Async + AI' (Protocol in workflow.md)

---

## Phase 3: FilenameParsingService — Async + AI Integration

### Context
- `FilenameParsingService` is an instance class (`server/src/services/FilenameParsingService.ts`)
- Callers to audit: `ExistingLibraryScanner.ts`, `LibraryScanService.ts` (check for `parseFilename` / `parseEpisodeFilename` calls)

---

- [ ] Task 9: Write failing tests for async `FilenameParsingService` methods
    - [ ] Create / update `server/src/services/FilenameParsingService.test.ts`
    - [ ] Mock `aiParsingService` module
    - [ ] Test `parseFilename()`: AI success → returns `ParsedMovieInfo`
    - [ ] Test `parseFilename()`: AI failure → regex fallback produces valid `ParsedMovieInfo`
    - [ ] Test `parseEpisodeFilename()`: AI success → returns `ParsedEpisodeInfo`
    - [ ] Test `parseEpisodeFilename()`: AI failure → regex fallback produces valid `ParsedEpisodeInfo`
    - [ ] Run tests; confirm new tests fail (Red)

- [ ] Task 10: Update `FilenameParsingService.ts` — async + AI primary
    - [ ] Import `aiParsingService` singleton
    - [ ] Change `parseFilename` and `parseEpisodeFilename` to `async`
    - [ ] Each method: call AI first; on null fall through to existing regex logic
    - [ ] Run tests; confirm all pass (Green)

- [ ] Task 11: Update `FilenameParsingService` call-site files
    - [ ] Search for `parseFilename` and `parseEpisodeFilename` usages
    - [ ] Add `await` to all call sites in `ExistingLibraryScanner.ts`, `LibraryScanService.ts`, and any others found
    - [ ] Run `CI=true bun run test --run`; confirm no new failures

- [ ] Task 12: Conductor - User Manual Verification 'Phase 3: FilenameParsingService Async + AI' (Protocol in workflow.md)

---

## Phase 4: Integration & Type Safety

---

- [ ] Task 13: TypeScript clean compile
    - [ ] Run `cd server && npx tsc --noEmit`
    - [ ] Fix any type errors introduced by async signature changes
    - [ ] Re-run until exit code 0

- [ ] Task 14: Full test suite + coverage verification
    - [ ] Run `CI=true bun run test --run --coverage` (server workspace)
    - [ ] Confirm `AiParsingService.ts` ≥ 80% coverage
    - [ ] Confirm `Parser.ts` ≥ 80% coverage
    - [ ] Confirm `FilenameParsingService.ts` ≥ 80% coverage
    - [ ] Confirm overall suite still passes

- [ ] Task 15: Conductor - User Manual Verification 'Phase 4: Integration & Type Safety' (Protocol in workflow.md)
