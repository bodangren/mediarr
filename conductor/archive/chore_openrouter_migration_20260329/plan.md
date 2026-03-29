# Implementation Plan: OpenRouter AI Provider Migration

## Phase 1 — Install & Update Environment

- [x] Task: Install `@openrouter/ai-sdk-provider` in `server/package.json` (installed v2.3.3)
- [x] Task: Rename `OPENAI_API_KEY` to `OPENROUTER_API_KEY` in `.env` (preserve the value — user will replace with their OpenRouter key)
- [x] Task: Add `OPENROUTER_MODEL=minimax/minimax-m2.7` to `.env`
- [x] Task: Conductor - User Manual Verification 'Install & Environment'

## Phase 2 — Migrate ReleaseParser.ts

- [x] Task: Replace `import { openai } from '@ai-sdk/openai'` with `import { createOpenRouter } from '@openrouter/ai-sdk-provider'` in `ReleaseParser.ts`
- [x] Task: Create OpenRouter singleton instance (`const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })`) and update env guard checks from `OPENAI_API_KEY` to `OPENROUTER_API_KEY`
- [x] Task: Replace all `openai.chat('gpt-5-nano')` calls with `openrouter(process.env.OPENROUTER_MODEL ?? 'minimax/minimax-m2.7')` (3 call sites: `_parseSingle`, `parseBatch`, `parseFiles`)
- [x] Task: Update `providerOptions` from `{ openai: { reasoningEffort: 'minimal' } }` to `{ openrouter: {} }` (3 call sites)
- [x] Task: Update `smoke-debug.ts` — provider import, model ID, env var in JSDoc
- [x] Task: Update `smoke-releaseparser.ts` — env var in JSDoc comment
- [x] Task: Conductor - User Manual Verification 'Migrate ReleaseParser'

## Phase 3 — Update Tests

- [x] Task: Update `ReleaseParser.test.ts` mock for `@ai-sdk/openai` → mock `@openrouter/ai-sdk-provider` instead (replace `vi.mock('@ai-sdk/openai', ...)` with `vi.mock('@openrouter/ai-sdk-provider', ...)`)
- [x] Task: Update all `vi.stubEnv('OPENAI_API_KEY', ...)` calls to `vi.stubEnv('OPENROUTER_API_KEY', ...)` in test file
- [x] Task: Update test descriptions that reference `OPENAI_API_KEY` to say `OPENROUTER_API_KEY`
- [x] Task: Run `CI=true npx vitest run` — confirm all ReleaseParser tests pass (18/18)
- [x] Task: Conductor - User Manual Verification 'Update Tests'

## Phase 4 — Smoke Test & Verification

- [x] Task: Run `OPENROUTER_API_KEY=<key> bun server/smoke-debug.ts` — confirm structured output from OpenRouter (user verified)
- [x] Task: Run `OPENROUTER_API_KEY=<key> bun server/smoke-releaseparser.ts` — confirm all smoke assertions pass (user verified)
- [x] Task: Grep for residual `@ai-sdk/openai` and `OPENAI_API_KEY` references in `server/src/` — zero hits confirmed
- [x] Task: Run `CI=true npx vitest run ReleaseParser.test.ts FilenameParsingService.test.ts ExistingLibraryScanner.test.ts` — 35/35 pass, 0 failures
- [x] Task: Conductor - User Manual Verification 'Smoke Test & Verification'
