# Implementation Plan: Local LLM Gateway Routing

## Phase 1 — Provider Routing Abstraction

- [x] Task: Create the urgent track artifacts and register the track in `measure/tracks.md`
- [x] Task: Add centralized ReleaseParser AI-provider configuration that prefers local gateway env vars and falls back to OpenRouter
- [x] Task: Measure - Checkpoint Phase 1

## Phase 2 — Wire Runtime and Tests

- [x] Task: Update `ReleaseParser.ts` and related smoke scripts to use the provider abstraction and env-driven model selection
- [x] Task: Extend `ReleaseParser.test.ts` to cover local-gateway routing, OpenRouter fallback, and no-provider fallback behavior
- [x] Task: Run targeted ReleaseParser tests red/green against the updated routing logic
- [x] Task: Measure - Checkpoint Phase 2

## Phase 3 — Docs and Verification

- [x] Task: Update README and/or local env documentation with the local gateway variables and usage
- [x] Task: Run targeted verification commands for tests and type-level sanity, then update this plan with outcomes — `CI=true npx vitest run server/src/services/ReleaseParser.test.ts` passed; `npx tsc -p server/tsconfig.json --noEmit` still fails on pre-existing `bun:sqlite` and Organizer/TorrentManager test typing debt, with no new gateway-routing errors remaining
- [x] Task: Commit the track progress and leave the track ready for the next implementation slice or archive if complete
