# Plan: AI-Powered Filename Parsing

## Phase 1: AiParsingService

### Context
- Model: `glm-4.7-flash`
- Base URL: `https://api.z.ai/api/paas/v4/`
- Auth: `GLM_API_KEY` env var (already in `.env`)
- `openai` npm package not yet installed in `server/`

---

- [x] Task 1: Install `openai` package (9a9dcd0)
    - [x] Run `cd server && bun add openai` (or `npm install openai`)
    - [x] Verify it appears in `server/package.json` dependencies

- [x] Task 2: Write failing tests for `AiParsingService` (9a9dcd0)
    - [x] Create `server/src/services/AiParsingService.test.ts`
    - [x] Mock `openai` module via `vi.mock('openai')`
    - [x] Test: successful call returns parsed JSON of type T
    - [x] Test: malformed JSON response returns `null`
    - [x] Test: response missing required fields returns `null`
    - [x] Test: first attempt throws network error → retries → succeeds on 2nd attempt
    - [x] Test: all 3 attempts throw network error → returns `null`
    - [x] Test: attempt times out (mock AbortError / timeout) → retries → falls back to `null`
    - [x] Run tests; confirm all fail (Red) ✓

- [x] Task 3: Implement `AiParsingService` (9a9dcd0)
    - [x] Create `server/src/services/AiParsingService.ts`
    - [x] Instantiate OpenAI client with `baseURL` + `GLM_API_KEY`
    - [x] Implement `parse<T>(systemPrompt, userPrompt, requiredFields?: string[]): Promise<T | null>`
    - [x] Add 10 s `AbortSignal.timeout()` per attempt
    - [x] Add retry loop: max 3 attempts, back-off 1 s / 2 s
    - [x] Parse response content as JSON; validate required fields
    - [x] Export singleton instance `aiParsingService`
    - [x] Run tests; confirm all pass (Green) — 9/9 ✓

- [x] Task 4: Measure - Phase 1 complete (9a9dcd0)

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

- [x] Task 5: Write failing tests for async `Parser` methods (fc77f9f)
- [x] Task 6: Update `Parser.ts` — async + AI primary (fc77f9f)
- [x] Task 7: Update all `Parser` call-site files — seriesRoutes, WantedSearchService, ImportManager, ExistingLibraryScanner, LibraryScanner, RssMediaMonitor (fc77f9f)
- [x] Task 8: Phase 2 complete (fc77f9f)

---

## Phase 3: FilenameParsingService — Async + AI Integration

- [x] Task 9: Write failing tests for async `FilenameParsingService` methods (bd712ee)
- [x] Task 10: Update `FilenameParsingService.ts` — async + AI primary (bd712ee)
- [x] Task 11: No external call-site changes needed; internal scanAndMatch methods updated (bd712ee)
- [x] Task 12: Phase 3 complete (bd712ee)

---

## Phase 4: Integration & Type Safety

- [x] Task 13: TypeScript clean compile — server source files clean; pre-existing vi.hoisted TS errors in test files only (426024c)
- [x] Task 14: Full test suite — 1082 passed, 0 failed; app build clean (426024c)
- [x] Task 15: Phase 4 complete (426024c)
