# Plan: App Workspace Pre-existing Test & Typecheck Cleanup

## Phase 1: Catalog & Reproduce (TDD — Red)

- [ ] Run `cd app && bun run typecheck` and capture all errors.
- [ ] Run `cd app && bun run test` and capture all failures with file/test-name list.
- [ ] Group failures by root cause (type error, MSW drift, timer cleanup, prop drift, etc.).
- [ ] Write/update a tracking note in this plan.md with the failure inventory.
- [ ] Commit: `docs(measure): catalog app pre-existing failures (2026-06-30)`

## Phase 2: Typecheck Fixes

- [ ] Fix `app/src/lib/msw/handlers/helpers.ts` SharedArrayBuffer/ArrayBuffer mismatch.
- [ ] Fix `app/src/lib/msw/factories.ts` `qualityProfileId` shape mismatch.
- [ ] Fix `app/src/components/importlists/ImportListSettings.tsx` type mismatch.
- [ ] Run `cd app && bun run typecheck` and verify 0 errors.
- [ ] Commit: `fix(app): resolve pre-existing typecheck errors`

## Phase 3: Test Failure Fixes — MSW & Factory Drift

- [ ] Identify tests failing due to MSW handler / factory drift.
- [ ] Write Red tests where the drift is not yet covered.
- [ ] Update MSW handlers and factories to match current schemas.
- [ ] Run affected test files and verify green.
- [ ] Commit: `test(app): align MSW handlers and factories with current schemas`

## Phase 4: Test Failure Fixes — Timer & Async Cleanup

- [ ] Identify tests failing due to fake timers, unresolved promises, or missing cleanup.
- [ ] Write Red tests demonstrating the cleanup gap.
- [ ] Fix tests with proper `waitFor`, `cleanup`, or `vi.useRealTimers()` resets.
- [ ] Run affected test files and verify green.
- [ ] Commit: `test(app): fix timer and async cleanup failures`

## Phase 5: Test Failure Fixes — Component Prop Drift

- [ ] Identify tests failing because shared components changed props or behavior.
- [ ] Update tests to match current component contracts.
- [ ] Run affected test files and verify green.
- [ ] Commit: `test(app): update component tests for current prop contracts`

## Phase 6: Full App Suite Verification

- [ ] Run `cd app && bun run typecheck` — 0 errors.
- [ ] Run `cd app && bun run test` — 0 failures.
- [ ] Run root `CI=true npm test` — confirm server side unaffected.
- [ ] Commit: `test(app): verify full app suite green`

## Phase 7: Documentation & Closeout

- [ ] Update `measure/tech-debt.md` to mark the app pre-existing failures item Resolved.
- [ ] Add lessons to `measure/lessons-learned.md` for any recurring patterns.
- [ ] Update this plan.md with final evidence.
- [ ] Commit: `docs(measure): close out app pre-existing failures track`
