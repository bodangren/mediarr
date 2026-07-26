# Plan: Subtitle Services Test Coverage

> NOTE (2026-07-26): This plan was written assuming a greenfield start. In reality,
> `SubtitleNamingService`, `SubtitleRequirementEngine`, and `SubtitleProviderFactory`
> plus their `.test.ts` files already existed at track start. Actual work performed
> was gap-filling/verification, not TDD from scratch. Checkboxes below reflect what
> was actually found/done, not a literal Red→Green history.

## Phase 1: Discovery & Contract Mapping
- [x] Locate `SubtitleNamingService`, `SubtitleRequirementEngine`, and `SubtitleProviderFactory` source files. — already satisfied at track start: all three exist in `server/src/services/`.
- [x] Document public method signatures, dependencies, and external I/O (DB, filesystem, other services). — All three are pure logic classes with no DB/filesystem I/O: `SubtitleNamingService.buildSubtitlePath()` (uses only `node:path`); `SubtitleRequirementEngine.compute()` / `computeByVariant()` (pure functions over plain data); `SubtitleProviderFactory` (constructor-injected `providers` map + `readConfig` callback + `unavailableProviders` map — no direct I/O, all deps passed in).
- [x] Identify existing test helpers and mock factories to reuse. — No `vi.hoisted()` mocking needed; these services take all deps via constructor/plain args, so tests instantiate directly with in-memory fixtures. `SubtitleProviderFactory.test.ts` already had a `makeProvider()` helper reused as-is.
- [x] Commit: `docs(measure): map subtitle service contracts for test coverage` — mapping recorded here in plan.md; no separate contract doc needed since this was verification of pre-existing code, not a new design.

## Phase 2: Red Tests — SubtitleNamingService
- [x] Add `SubtitleNamingService.test.ts` with failing tests for filename construction. — already satisfied at track start: file existed with 18 tests covering standard path construction.
- [x] Add failing tests for language ordering and tag sanitization. — already satisfied at track start: tests for forced/HI suffix ordering, lowercasing, variant-token sanitization (special chars, whitespace, leading/trailing dashes, empty-after-sanitize fallback to `variant`) all present.
- [x] Run tests and confirm they fail (Red). — N/A (code and tests pre-existed and already passed); verified via coverage run instead — see Phase 3.
- [x] Commit: `test(server): add red tests for SubtitleNamingService` — N/A, no new commit needed for this obsolete step.

## Phase 3: Green Tests — SubtitleNamingService
- [x] Implement or adjust `SubtitleNamingService` to satisfy the Red tests. — already satisfied at track start; no source changes needed (no bugs found).
- [x] Verify tests pass and coverage ≥80%. — Verified: 18/18 tests pass. Branch coverage: **100%** (start: 100%, end: 100% — no gap existed).
- [x] Commit: `feat(server): satisfy SubtitleNamingService tests` — N/A, no source changes required.

## Phase 4: Red Tests — SubtitleRequirementEngine
- [x] Add `SubtitleRequirementEngine.test.ts` with failing tests for requirement rules. — already satisfied at track start: file existed with 21 tests covering `compute`/`computeByVariant`, audio_exclude/audio_only_include rules, cutoff logic (null/specific-id/ANY_CUTOFF_ID), HI-satisfies-non-HI fallback, language normalization.
- [x] Add failing tests for language matching and empty/unknown metadata. — Existing tests covered normalized language matching, commentary-track skip, and null audio languageCode. Gap found during this track: empty profile-item language (`''`) and two `isCutoffMet` branches (audio_only_include skip during cutoff evaluation; audio_exclude causing cutoff to be met) were untested. Added 3 new tests to close these.
- [x] Run tests and confirm they fail (Red). — N/A for pre-existing tests; new tests added this track were verified to pass against the existing (unmodified) implementation — no bug present, so no Red phase was applicable.
- [x] Commit: `test(server): add red tests for SubtitleRequirementEngine` — superseded; new tests committed together with gap-closure work (see track commit).

## Phase 5: Green Tests — SubtitleRequirementEngine & ProviderFactory
- [x] Implement or adjust `SubtitleRequirementEngine` to satisfy tests. — No source changes required; all new/existing tests pass against the current implementation. No bugs found.
- [x] Add `SubtitleProviderFactory.test.ts` with Red tests for provider resolution. — already satisfied at track start: file existed with 12 tests covering `getProviderNames`, `resolveAllManualProviders`, `resolveManualProvider` (explicit name, config fallback, case-insensitivity, missing config error, unregistered-provider error, unavailable-provider rejection). Gap found: no direct test for `isProviderAvailable(true case)` or `getProviderUnavailableReason` returning `null` for a registered/available provider — added 2 new tests to close these.
- [x] Implement/adjust `SubtitleProviderFactory` to satisfy tests. — No source changes required; no bugs found.
- [x] Verify all three suites pass with ≥80% branch coverage. — **Verified: all three suites pass at 100% branch coverage** (see exact numbers below).
- [x] Run `bun run typecheck` in the server workspace. — Ran `npx tsc -p server/tsconfig.json --noEmit`: **zero errors**.
- [x] Commit: `feat(server): satisfy subtitle requirement and provider tests` — covered by this track's commit adding the 5 new gap-closure tests.

## Phase 6: Regression & Closeout
- [x] Run the full server test suite and confirm no regressions. — Out of scope per orchestrator instructions for this track (other agents concurrently editing other service test files in the same worktree); only the three target test files were run, per explicit constraint. Those three files: 56/56 tests pass.
- [x] Update `measure/tech-debt.md` to reflect resolved deferred coverage. — Not performed by this agent; `tech-debt.md` is explicitly owned by the orchestrator per track constraints.
- [x] Update `measure/tracks.md` to archive this track. — Not performed by this agent; `tracks.md` is explicitly owned by the orchestrator per track constraints.
- [x] Commit: `docs(measure): close out subtitle services test coverage track` — Not performed by this agent; git commits are explicitly owned by the orchestrator per track constraints.

## Final Coverage Evidence (measured via `CI=true npx vitest run --coverage` on the three target test files)

| Service | Tests (start) | Tests (end) | Branch coverage (start) | Branch coverage (end) |
|---|---|---|---|---|
| SubtitleNamingService | 18 | 18 | 100% | 100% |
| SubtitleRequirementEngine | 21 | 24 | 89.13% (uncovered: lines 155, 159, 203) | 100% |
| SubtitleProviderFactory | 12 | 14 | 90.9% (uncovered: line 31) | 100% |
| **Total** | **51** | **56** | **92% (all files)** | **100% (all files)** |

No real bugs were found in any of the three services during this track — all added tests passed against the unmodified source on first run. `npx tsc -p server/tsconfig.json --noEmit` reports zero errors.
