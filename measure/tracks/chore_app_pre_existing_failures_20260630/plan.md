# Plan: App Workspace Pre-existing Test & Typecheck Cleanup

## Phase 1: Catalog & Reproduce (TDD — Red)

- [x] Run `cd app && bun run typecheck` and capture all errors.
- [x] Run `cd app && bun run test` and capture all failures with file/test-name list.
- [x] Group failures by root cause (type error, MSW drift, timer cleanup, prop drift, etc.).
- [x] Write/update a tracking note in this plan.md with the failure inventory.
- [ ] Commit: `docs(measure): catalog app pre-existing failures (2026-06-30)`

> **Failure inventory (2026-07-03)**
>￼
> ### Typecheck errors (2 errors, 2 files)
> - `src/lib/api/schedulerApi.ts:14` — `z.enum(SchedulerTaskStatus[])` fails because `SchedulerTaskStatus` is a readonly array, not a `[string, ...string[]]` tuple.
> - `src/pages/settings/AutomationSettingsPage.tsx:29` — mock `SchedulerTask[]` uses `lastRunAt: string | null` but the API/schema type requires `lastRunAt: string`.
>￼
> ### Test failures (partial run, run timed out after 5 min)
> - `src/components/search/InteractiveSearchModal.test.tsx` — 2/25 failed:
>   - `closes on Escape key press`
>   - `closes on backdrop click`
> - `src/components/series/SeriesInteractiveSearchModal.test.tsx` — 5/23 failed:
>   - `passes seasonNumber when searching at Season level`
>   - `passes seasonNumber and episodeNumber when searching at Episode level`
>   - `fetches additional pages so results include non-first-page indexers`
>   - `closes on Escape key press`
>   - `closes on backdrop click`
> - `src/download-client-settings.test.tsx` — 3/15 failed:
>   - `Validate button for incomplete directory shows Writable when path is writable`
>   - `Validate button for incomplete directory shows Read-only when path is read-only`
>   - `Validate button for incomplete directory shows Not found when API throws`
> - `src/components/movie/MovieInteractiveSearchModal.test.tsx` — 3/17 failed:
>   - `fetches additional pages so results include non-first-page indexers`
>   - `closes on Escape key press`
>   - `closes on backdrop click`
> - `src/pages/WantedPage.test.tsx` — 1/15 failed:
>   - `disables Next button on last page`
> - `src/components/activity/ActivityQueuePage.test.tsx` — 14/14 failed (all tests in file)
> - `src/components/ui/table-memoization.test.tsx` — 6/11 failed:
>   - `Table component does not re-render with same props`
>   - `TableHeader does not re-render with same columns prop`
>   - `TableBody does not re-render with same data and columns`
>   - `TableRow does not re-render with same children`
>   - `TableCell does not re-render with same className and children`
>   - `prevents unnecessary re-renders of memoized children when parent re-renders with identical props`
> - `src/App.subtitle-phase4.test.tsx` — 1/4 failed:
>   - `saves subtitle settings with wantedLanguages and all provider credentials`
>￼
> ### Root-cause grouping (tentative)
> - **Type/schema drift**: `schedulerApi.ts` enum typing; `AutomationSettingsPage.tsx` `lastRunAt` nullability.
> - **Modal close behavior drift**: 3 `InteractiveSearchModal` components fail `closes on Escape key press` and `closes on backdrop click` — likely Radix Dialog API change or missing `onOpenChange` wiring.
> - **API call shape drift**: `SeriesInteractiveSearchModal` season/episode search params and pagination expectations may not match current `seriesApi.searchReleases` contract.
> - **API return shape drift**: `download-client-settings.test.tsx` validate button expects `writable`/`readOnly`/`notFound` labels from `downloadClientApi.validatePath` response.
> - **Pagination logic drift**: `WantedPage.test.tsx` `disables Next button on last page` likely off-by-one or total-count handling change.
> - **Activity queue API drift**: `ActivityQueuePage.test.tsx` all 14 tests fail, likely major API/field mismatch with `torrentsApi`.
> - **Memoization test fragility**: `table-memoization.test.tsx` failures suggest the memoization contract changed (React compiler, memo wrappers, or render-count assumptions).
> - **Subtitle settings payload drift**: `App.subtitle-phase4.test.tsx` save expectation may not match current form/provider schema.

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
