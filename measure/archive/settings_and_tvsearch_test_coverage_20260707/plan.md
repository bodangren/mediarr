# Plan: Settings and TV Search Service Test Coverage

## Phase 1: Discovery
- [x] Locate `SettingsService` and `TvSearchService` source files. — `SettingsService` exists at `server/src/services/SettingsService.ts` (3-method delegation wrapper: `get`/`update`/`replace`). `TvSearchService.ts` does not exist (confirmed via `find server/src -iname '*TvSearch*'` and `grep -rn "TvSearchService" server/src`, both empty).
- [x] Map public methods, dependencies, and I/O boundaries. — `SettingsService` has exactly 3 public methods, all pure pass-throughs to `AppSettingsRepository` (`get()`, `update(partial)`, `replace(payload)`); zero internal branches. Season/episode search dispatch + aggregation + indexer error handling (the intended TvSearchService responsibility) now lives in `MediaSearchService.ts` (`searchEpisode`, `searchAllIndexers`, `searchWithTimeout`).
- [x] Identify existing mock factories and the `TvSearchService` alias history. — Existing test file uses a hand-rolled `makeRepository()` returning `vi.fn()` stubs (no external factory needed for a 3-method interface). `TvSearchService` was deleted as an orphan alias in archived track `chore_test_infrastructure_hardening_20260612` (commit `037418f`, Phase P4) — its legacy test was migrated to construct `MediaSearchService` directly at that time.
- [x] Commit: `docs(measure): map SettingsService and TvSearchService contracts`

## Phase 2: Red Tests — SettingsService
- [x] Add `SettingsService.test.ts` with failing tests for read operations. — File already existed with 7 tests (get/update/replace happy-path + error propagation); extended with 5 new `get` tests (non-Error rejection, reference identity, no-caching across calls, pre-invocation no-op check).
- [x] Add failing tests for write operations and validation. — Added 5 new `update` tests: non-Error rejection, deep-nested single-field partial forwarding, edge-case enum/null payload forwarding, array reference-identity preservation, per-call independence/ordering.
- [x] Add failing tests for default fallback and serialization edge cases. — Added 5 new `replace` tests: non-Error rejection, extreme numeric/null edge-value payload (port 0/65535, empty `wantedLanguages`, `seedLimitAction: 'remove'`), reference-identity forwarding, cross-method isolation check. (Note: `SettingsService` itself has no default-fallback/validation logic — that lives in `AppSettingsRepository`, out of this track's edit scope — so these edge-case tests validate correct verbatim pass-through of edge-shaped payloads rather than in-service validation branches.)
- [x] Run tests and confirm they fail (Red). — New tests were written against the existing, already-passing implementation (no red phase was meaningful here since there is no logic to implement — pure delegation). Tests pass immediately (Green), consistent with the file's existing pattern.
- [x] Commit: `test(server): add red tests for SettingsService`

## Phase 3: Green Tests — SettingsService
- [x] Implement or adjust `SettingsService` to satisfy the Red tests. — No source changes needed; no bug found. `SettingsService.ts` correctly delegates all 3 methods with matching signatures; confirmed via usage grep across `main.ts`, `MetadataProvider.ts`, `CollectionService.ts`, `PlaybackService.ts`, `SubtitleAutomationService.ts`, provider classes, and ~10 route test files — no mismatch found.
- [x] Verify tests pass and coverage ≥80%. — `CI=true npx vitest run --coverage server/src/services/SettingsService.test.ts`: 20/20 tests pass. Coverage for `SettingsService.ts`: 100% Stmts / 100% Branch / 100% Funcs / 100% Lines (starting coverage was already 100%/100%/100%/100% with 7 tests, since the file has zero branches; ending state adds 13 more tests for depth/robustness, same 100% numbers).
- [x] Commit: `feat(server): satisfy SettingsService tests`

## Phase 4: Red Tests — TvSearchService
- [x] Add `TvSearchService.test.ts` with failing tests for season search dispatch. — obsolete: TvSearchService was deleted as an orphan alias in chore_test_infrastructure_hardening_20260612; see spec amendment
- [x] Add failing tests for episode search dispatch. — obsolete: TvSearchService was deleted as an orphan alias in chore_test_infrastructure_hardening_20260612; see spec amendment
- [x] Add failing tests for result aggregation and indexer error handling. — obsolete: TvSearchService was deleted as an orphan alias in chore_test_infrastructure_hardening_20260612; see spec amendment
- [x] Run tests and confirm they fail (Red). — obsolete: TvSearchService was deleted as an orphan alias in chore_test_infrastructure_hardening_20260612; see spec amendment
- [x] Commit: `test(server): add red tests for TvSearchService` — obsolete: TvSearchService was deleted as an orphan alias in chore_test_infrastructure_hardening_20260612; see spec amendment

## Phase 5: Green Tests — TvSearchService
- [x] Implement or adjust `TvSearchService` to satisfy the Red tests. — obsolete: TvSearchService was deleted as an orphan alias in chore_test_infrastructure_hardening_20260612; see spec amendment
- [x] Verify tests pass and coverage ≥80%. — obsolete: TvSearchService was deleted as an orphan alias in chore_test_infrastructure_hardening_20260612; see spec amendment. (Its actual responsibility — season/episode dispatch, aggregation, indexer error handling — now lives in `MediaSearchService.ts` and is already covered by `MediaSearchService.phase1.test.ts`, `MediaSearchService.publicApi.test.ts`, and `MediaSearchService.searchAllIndexers.test.ts` among others.)
- [x] Run `bun run typecheck` in the server workspace. — `npx tsc -p server/tsconfig.json --noEmit` exits with zero errors.
- [x] Commit: `feat(server): satisfy TvSearchService tests` — obsolete: TvSearchService was deleted as an orphan alias in chore_test_infrastructure_hardening_20260612; see spec amendment

## Phase 6: Regression & Closeout
- [x] Run the full server test suite and confirm no regressions. — Out of scope for this agent per orchestrator instructions (concurrent agents are working on other service test files in this same worktree); ran only `server/src/services/SettingsService.test.ts` (20/20 pass) as directed. Full-suite regression run is the orchestrator's responsibility.
- [x] Update `measure/tech-debt.md` if these coverage gaps are resolved. — Not performed; `measure/tech-debt.md` is explicitly out of this agent's edit scope (owned by the orchestrator). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Update `measure/tracks.md` to archive this track. — Not performed; `measure/tracks.md` is explicitly out of this agent's edit scope (owned by the orchestrator). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Commit: `docs(measure): close out Settings and TV Search test coverage track` — Not performed; this agent does not run git commands (orchestrator commits). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
