# Plan: Filter Service Test Coverage

> **Note (2026-07-26):** This plan was written assuming a greenfield start. In
> reality `server/src/services/FilterService.ts` and a substantial
> `FilterService.test.ts` (26 tests) already existed before this pass began.
> The work below reflects a gap-filling/verification pass, not a TDD
> red/green cycle from scratch. Phases are marked `[x]` where the underlying
> intent was already satisfied, with evidence noted.

## Phase 1: Discovery
- [x] Locate `FilterService` source and its public methods. — `server/src/services/FilterService.ts`. Public API: `list`, `create`, `update`, `delete`, `applyToSeries`, `applyToIndexers` (plus private `validateConditionsGroup`). Module-level helpers: `normalizeBooleanValue`, `stringMatches`, `arrayMatches`, `getSeriesValue`, `getIndexerCapabilities`, `getIndexerTags`, `evaluateSeriesCondition`, `evaluateIndexerCondition`.
- [x] Map dependencies (repositories, custom-format service, indexer service, etc.). — Only dependency is an injected `prisma`-shaped object (`customFilter.{findMany,create,findUnique,update,delete}`); no custom-format/indexer service dependency exists in this implementation — filters are generic series/indexer condition groups (quality/language/size/custom-format concepts from the spec do not apply to this concrete service; the real domain is `SeriesFilterField`/`IndexerFilterField` conditions).
- [x] Identify existing mock factories to reuse. — `makePrismaMock()` already defined at top of `FilterService.test.ts`; reused as-is, no new mock factories needed.
- [x] Commit: `docs(measure): map FilterService contracts for test coverage` — already satisfied at track start: mapping done via this discovery read; no separate docs commit made (orchestrator owns commits per track instructions).

## Phase 2: Red Tests — Core Filter Logic
- [x] Add `FilterService.test.ts` with failing tests for single-filter pass/fail. — already satisfied at track start: file existed with 26 passing tests covering single-filter pass/fail for series (`applyToSeries`) and indexers (`applyToIndexers`).
- [x] Add failing tests for composite AND/OR logic. — already satisfied at track start for series `and`/`or`; this pass added an explicit indexer `or` composite test (`applies "or" operator across indexer conditions`).
- [x] Add failing tests for unknown/unsupported filter types. — gap found and closed this pass: added `excludes all items for an unknown/unsupported field` (series) and `excludes all indexers for an unknown/unsupported field` (indexers).
- [x] Run tests and confirm they fail (Red). — N/A in gap-filling mode; new tests were written against known source behavior and passed immediately (verified via coverage run), consistent with verification rather than fresh TDD.
- [x] Commit: `test(server): add red tests for FilterService` — superseded; actual test additions are captured in the final `FilterService.test.ts` diff, committed by the orchestrator.

## Phase 3: Green Tests — Core Filter Logic
- [x] Implement or adjust `FilterService` to satisfy the Red tests. — no source changes were needed; all new/existing tests passed against the current implementation. No bugs found in core AND/OR/unknown-field logic.
- [x] Verify tests pass and coverage ≥80%. — Verified: 64/64 tests pass; `FilterService.ts` branch coverage 100% (see final measurement below).
- [x] Commit: `feat(server): satisfy FilterService core tests` — N/A, no source (`feat`) changes required.

## Phase 4: Red Tests — Filter Categories
- [x] Add failing tests for quality filter evaluation. — N/A: this concrete `FilterService` has no "quality" filter concept (no release-quality filtering code path exists in the source). Not applicable to this implementation.
- [x] Add failing tests for language filter evaluation. — N/A: no "language" filter field/logic exists in `FilterService.ts`. Not applicable.
- [x] Add failing tests for size and indexer filter evaluation. — "size" filter concept does not exist in this service; indexer filter evaluation (protocol/enabled/capability/priority/tag) is fully covered — added tests for `enabled` notEquals/unsupported-operator, `priority` equals/notEquals/lessThan/non-finite/unsupported-operator, `capability` explicit-array and derived-`search`, `tag` direct-array/settings-fallback/malformed-JSON, and nullish-value edge cases.
- [x] Add failing tests for custom-format filter evaluation. — N/A: no custom-format filter concept exists in this service; the closest analog (`validateConditionsGroup`'s structural validation) is now fully covered — added tests for non-object conditions, non-object condition entries, invalid field, invalid operator, and missing/null value.
- [x] Run tests and confirm they fail (Red). — N/A in gap-filling mode (see Phase 2 note).
- [x] Commit: `test(server): add red tests for FilterService categories` — superseded; captured in final test file diff.

## Phase 5: Green Tests — Filter Categories
- [x] Implement or adjust `FilterService` to satisfy category tests. — no source changes required; all category-path tests passed against existing implementation.
- [x] Verify full `FilterService` suite passes with ≥80% branch coverage. — Verified: `CI=true npx vitest run --coverage server/src/services/FilterService.test.ts` → 64 tests passed, `FilterService.ts` branch coverage **100%** (stmts 100%, funcs 100%, lines 100%). Starting coverage at track start was 68.48% branch / 26 tests.
- [x] Run `bun run typecheck` in the server workspace. — Ran `npx tsc -p server/tsconfig.json --noEmit` (server strict typecheck): **0 errors**, unchanged from track start.
- [x] Commit: `feat(server): satisfy FilterService category tests` — superseded; committed by orchestrator as part of this track's overall diff.

## Phase 6: Regression & Closeout
- [x] Run the full server test suite and confirm no regressions. — Out of scope for this agent per hard constraints (concurrent agents editing other service test files in the same worktree); only `FilterService.test.ts` was run, per explicit instruction. No changes were made outside `FilterService.test.ts`, so no regression risk to other files.
- [x] Update `measure/tech-debt.md` if this resolves the FilterService coverage gap. — Not performed by this agent; `tech-debt.md` is owned by the orchestrator per hard constraints.
- [x] Update `measure/tracks.md` to archive this track. — Not performed by this agent; `tracks.md` is owned by the orchestrator per hard constraints.
- [x] Commit: `docs(measure): close out FilterService test coverage track` — Not performed by this agent; git commits are owned by the orchestrator per hard constraints.

## Final Evidence Summary
- Branch coverage on `FilterService.ts`: **68.48% → 100%** (target was ≥80%).
- Test count: **26 → 64** tests, all passing.
- No real bugs were found in `FilterService.ts`; every new test passed against the existing implementation on first run, so no source-code changes were made.
- Strict server typecheck (`npx tsc -p server/tsconfig.json --noEmit`): **0 errors**, before and after.
- All spec Acceptance Criteria met (see spec.md, verified against this implementation's actual filter domain: series/indexer conditions with equals/notEquals/contains/notContains/greaterThan/lessThan operators, and/or composition, and unknown-field handling — there is no separate quality/language/size/custom-format filter type in this concrete service).
