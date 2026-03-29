# Specification: OpenRouter AI Provider Migration

## Overview

Migrate the AI provider in `ReleaseParser.ts` from `@ai-sdk/openai` (direct OpenAI) to `@openrouter/ai-sdk-provider` (OpenRouter) for text generation and structured output. This is a provider swap — the Vercel AI SDK `generateText` + `Output.json()` API surface remains identical.

OpenRouter provides multi-provider access (OpenAI, Anthropic, Google, etc.) through a single API key and unified billing, enabling easy model experimentation without code changes beyond a model ID string.

## Motivation

- **Model flexibility:** Swap between `openai/gpt-4.1-mini`, `anthropic/claude-3.5-sonnet`, `google/gemini-1.5-pro`, etc. by changing one string
- **Unified billing:** Single OpenRouter account for all provider access
- **Fallback routing:** OpenRouter can route to alternative providers if primary is unavailable
- **Cost optimization:** Easier to A/B test cheaper models against quality

## Scope

### In Scope

1. Install `@openrouter/ai-sdk-provider`
2. Replace provider initialization in `ReleaseParser.ts`
3. Make model configurable via `OPENROUTER_MODEL` env var (default: `minimax/minimax-m2.7`)
4. Update environment variable from `OPENAI_API_KEY` → `OPENROUTER_API_KEY`
5. Add `OPENROUTER_MODEL` to `.env`
5. Update `providerOptions` from `openai` namespace to `openrouter`
6. Update all test mocks (`ReleaseParser.test.ts`)
7. Update smoke scripts (`smoke-debug.ts`, `smoke-releaseparser.ts`)
8. Update `.env` with new variable name

### Out of Scope

- Image generation (not used in this codebase)
- Streaming (not used — `generateText` only)
- Multi-model fallback chains
- Adding new AI capabilities beyond existing ReleaseParser behavior
- Removing `@ai-sdk/openai` from `package.json` (keep as transitive dep if needed)

## Key Differences: OpenAI vs OpenRouter

| Aspect | `@ai-sdk/openai` | `@openrouter/ai-sdk-provider` |
|--------|-------------------|-------------------------------|
| Import | `import { openai } from '@ai-sdk/openai'` | `import { createOpenRouter } from '@openrouter/ai-sdk-provider'` |
| Init | `openai` is ready to use | `const openrouter = createOpenRouter({ apiKey })` |
| Text model | `openai.chat('gpt-5-nano')` | `openrouter(process.env.OPENROUTER_MODEL ?? 'minimax/minimax-m2.7')` |
| Model IDs | Bare: `'gpt-5-nano'` | Namespaced: `'minimax/minimax-m2.5'`, `'openai/gpt-4.1-mini'`, etc. |
| Env var | `OPENAI_API_KEY` | `OPENROUTER_API_KEY` |
| Provider options | `providerOptions: { openai: { ... } }` | `providerOptions: { openrouter: { ... } }` |

**Critical:** OpenRouter's returned function has NO `.chat()` method. Use `openrouter('model-id')` directly.

## Affected Files

| File | Change |
|------|--------|
| `server/src/services/ReleaseParser.ts` | Provider swap, env var, model IDs, providerOptions |
| `server/src/services/ReleaseParser.test.ts` | Mock target swap, env stubs |
| `server/smoke-debug.ts` | Provider swap, model ID |
| `server/smoke-releaseparser.ts` | Env var reference in JSDoc |
| `.env` | Rename `OPENAI_API_KEY` → `OPENROUTER_API_KEY`, add `OPENROUTER_MODEL=minimax/minimax-m2.7` |
| `server/package.json` | Add `@openrouter/ai-sdk-provider` |

## Acceptance Criteria

1. `bun install` succeeds with new dependency
2. `CI=true bun test` — all existing ReleaseParser tests pass with new mocks
3. `OPENROUTER_API_KEY=<key> bun server/smoke-debug.ts` produces valid structured output from OpenRouter
4. `OPENROUTER_API_KEY=<key> bun server/smoke-releaseparser.ts` passes all smoke assertions
5. No references to `@ai-sdk/openai` or `OPENAI_API_KEY` remain in application code (test mocks of removed imports are OK only if fully replaced)
6. `.env` uses `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`
7. Changing `OPENROUTER_MODEL` in `.env` changes which model is used at runtime — no code changes needed
8. Regex fallback behavior unchanged when API key is absent
