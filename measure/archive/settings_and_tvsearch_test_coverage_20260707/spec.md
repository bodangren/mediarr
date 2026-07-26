# Spec: Settings and TV Search Service Test Coverage

## Problem
Two server services were deferred from `chore_untested_server_services_20260526` and remain without dedicated tests:

- `SettingsService` — reads and writes application settings, handles defaults and validation.
- `TvSearchService` — orchestrates TV episode/season searches across indexers and formats results.

## Goal
Add focused unit tests for both services, mocking repositories and external API clients per the established Mediarr pattern. Reach ≥80% branch coverage on new/changed code.

## Acceptance Criteria
- [x] `SettingsService` tests cover CRUD, default fallback, validation, and serialization edge cases. — Met with a caveat: `SettingsService.ts` is a thin 3-method delegation wrapper (`get`/`update`/`replace`) with zero internal branches — all default-fallback, validation, and serialization logic lives one layer down in `AppSettingsRepository` (out of this track's scope). Coverage is 100% stmts/branch/funcs/lines (trivially, since there are no branches to miss). The 20 tests in `server/src/services/SettingsService.test.ts` exercise CRUD delegation, Error and non-Error rejection propagation, reference-identity/no-cloning behavior for both objects and arrays, edge-case enum/null/extreme-numeric payloads (port 0/65535, empty arrays, `phantom`/`form`/`remove`/`trace` enum values), and call-independence across repeated invocations.
- [x] `TvSearchService` tests cover season/episode search dispatch, result aggregation, and indexer error handling. — **Obsolete as originally written; see "2026-07-26 Amendment" below.** `TvSearchService.ts` does not exist in this codebase. The responsibility now lives in `MediaSearchService.ts` and already has dedicated test coverage (see amendment).
- [x] `cd server && bun run test -- <affected-files>` passes. — `CI=true npx vitest run server/src/services/SettingsService.test.ts` → 20/20 tests pass.
- [x] `cd server && bun run typecheck` reports no new errors in affected files. — `npx tsc -p server/tsconfig.json --noEmit` exits with zero errors.

## Scope
Server workspace only; no UI or API route changes unless a bug is found.

## Notes
- `TvSearchService` was previously an orphan alias; verify the current source file name and unify mocks accordingly.
- Use `vi.useFakeTimers({ toFake: ['Date'] })` if date assertions are needed, to avoid `setTimeout` interactions seen in `MediaSearchService` sibling tests.

## 2026-07-26 Amendment: TvSearchService acceptance criteria are obsolete

`TvSearchService.ts` does not exist in `server/src` — confirmed via `find server/src -iname '*TvSearch*'` (no results) and `grep -rn "TvSearchService" server/src` (no results). It was deleted as an orphan alias during the archived track `chore_test_infrastructure_hardening_20260612` (completed 2026-06-12), Phase P4, commit `037418f`: "Delete `TvSearchService.ts`; migrate the legacy test to construct `MediaSearchService` directly." This is recorded in `measure/archive/chore_test_infrastructure_hardening_20260612/plan.md` and in `measure/tech-debt.md` (2026-06-13 entry: "...+ 1 deleted as orphan alias (TvSearchService)").

**Where the responsibility now lives:** `server/src/services/MediaSearchService.ts`.
- Season/episode search dispatch: `searchEpisode(series, episode)` (builds an `SxxEyy` query and delegates to `getSearchCandidates`/`grabRelease`), plus `getSearchCandidates`/`searchAllIndexers` accepting `season`/`episode` query params.
- Result aggregation: `searchAllIndexers` — runs per-indexer searches via `Promise.allSettled`, deduplicates by info hash, applies unified scoring, and returns `{ releases, indexerResults, totalResults, deduplicatedCount }`.
- Indexer error handling: `searchWithTimeout` (per-indexer timeout via `setTimeout`/reject) and the `Promise.allSettled` handling in `searchAllIndexers` that records `settled.reason?.message` and marks each indexer's status (`'error'` / `'timeout'`) in `indexerResults`.

**Coverage status:** already covered, no gap.
- `searchEpisode` dispatch: `server/src/services/MediaSearchService.phase1.test.ts`, `server/src/services/MediaSearchService.publicApi.test.ts`.
- `searchAllIndexers` aggregation + indexer error/timeout handling: `server/src/services/MediaSearchService.searchAllIndexers.test.ts` (explicit assertions on `status === 'error'` and `status === 'timeout'`), plus `MediaSearchService.cornerCases.test.ts`, `MediaSearchService.timeout.repro.test.ts`, `MediaSearchService.phase1/2/3/4.test.ts`, `MediaSearchService.customFormat.test.ts`, `MediaSearchService.enrichment.test.ts`.

No new tests were added for this track's TvSearchService half — there is nothing left to test that isn't already tested under `MediaSearchService`. This criterion is closed as obsolete rather than silently dropped.
