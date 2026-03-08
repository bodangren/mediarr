# Implementation Plan: Subtitle Code Deduplication & Performance Refactor

## Phase 1: Server-side Provider Utilities
> Goal: Extract duplicated provider utility functions to a shared module.

- [x] Task: Create `server/src/services/providers/providerUtils.ts`
    - [x] Sub-task: Export `deriveReleaseName(filePath: string): string`
    - [x] Sub-task: Export `extractExtension(filename?: string): string | undefined`
    - [x] Sub-task: Export `readNumericProviderData(providerData, key): number | null`
    - [x] Sub-task: Export `ALLOWED_SUBTITLE_EXTENSIONS` constant (Set)
    - [x] Sub-task: Export `PROVIDER_IDS` constant and `ProviderId` type
- [x] Task: Update `AssrtProvider.ts` to use shared utilities
- [x] Task: Update `OpenSubtitlesProvider.ts` to use shared utilities
- [x] Task: Update `SubdlProvider.ts` to use shared utilities
- [x] Task: Update `subtitleRoutes.ts` to import `ALLOWED_SUBTITLE_EXTENSIONS`
- [x] Task: Update `SubtitleInventoryApiService.ts` to import `ALLOWED_SUBTITLE_EXTENSIONS`
- [x] Task: Write unit tests for `providerUtils.ts`

## Phase 2: Frontend Subtitle Coverage Utilities
> Goal: Consolidate duplicated subtitle status helpers into a shared lib module.

- [x] Task: Create `app/src/lib/subtitles/coverage.ts`
    - [x] Sub-task: Export `SubtitleCoverageStatus` type
    - [x] Sub-task: Export `summarizeSubtitleCoverage(available, missing)` function
    - [x] Sub-task: Export `subtitleStatusLabel(status)` function
- [x] Task: Update `App.tsx` to remove local definitions and import from coverage.ts
- [x] Task: Update `MovieOverviewView.tsx` to remove local definitions and import from coverage.ts
- [x] Task: Write unit tests for `coverage.ts`

## Phase 3: Performance — Parallel Async Loops
> Goal: Replace sequential async loops with Promise.all for parallelism.

- [x] Task: Fix `SubtitleInventoryApiService.mapVariantInventory` to use `Promise.all`
- [x] Task: Verify existing tests still pass after the change
