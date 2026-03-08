# Implementation Plan: Backend Deduplication & Security Hardening

## Phase 1: Extract Shared Route Helpers
> Goal: Eliminate duplicate functions by creating shared utility modules.

### Task 1.1: Extract playback helpers
- [ ] Task: Create `server/src/api/utils/playbackHelpers.ts` with `latestPlaybackMap()` and `serializePlaybackState()`.
  - [ ] Sub-task: Move functions from movieRoutes.ts and seriesRoutes.ts to shared module.
  - [ ] Sub-task: Update imports in both route files.
  - [ ] Sub-task: Add unit tests for the extracted helpers.
- Test command: `CI=true npm test`

### Task 1.2: Extract episode status helpers
- [ ] Task: Create `server/src/api/utils/episodeStatusHelpers.ts` with unified `determineEpisodeStatus()`.
  - [ ] Sub-task: Reconcile the two implementations (seriesRoutes vs dashboardRoutes) into one canonical version.
  - [ ] Sub-task: Update imports in seriesRoutes.ts and dashboardRoutes.ts.
  - [ ] Sub-task: Add unit tests for the unified function.
- Test command: `CI=true npm test`

### Task 1.3: Extract query parsing helpers
- [ ] Task: Create `server/src/api/utils/queryHelpers.ts` with shared filter-parsing functions.
  - [ ] Sub-task: Extract `parseBoolean`, status/search/monitored parsing into shared module.
  - [ ] Sub-task: Update imports in seriesRoutes.ts and movieRoutes.ts.
- Test command: `CI=true npm test`

## Phase 2: Security Hardening
> Goal: Add path validation and replace silent error swallowing.

### Task 2.1: Add safePath utility
- [ ] Task: Create `server/src/api/utils/safePath.ts` with path traversal protection.
  - [ ] Sub-task: Implement `safePath(base, ...segments)` that resolves and validates the final path is within `base`.
  - [ ] Sub-task: Add unit tests for traversal attempts, normal paths, and edge cases.
  - [ ] Sub-task: Apply safePath in seriesRoutes.ts and movieRoutes.ts file operations.
- Test command: `CI=true npm test`

### Task 2.2: Replace silent catches with logged errors
- [ ] Task: Audit all silent catch blocks and add error logging.
  - [ ] Sub-task: Add `console.error` or `request.log.error` calls to catch blocks in seriesRoutes, releaseRoutes, indexerRoutes, qualityProfileRoutes, dashboardRoutes, filesystemRoutes.
  - [ ] Sub-task: Ensure error messages include route context for debugging.
- Test command: `CI=true npm test`

### Task 2.3: Standardize error responses
- [ ] Task: Replace raw `reply.status().send()` calls with `sendSuccess()`/`sendError()` helpers.
  - [ ] Sub-task: Ensure `sendError()` helper exists or create it.
  - [ ] Sub-task: Replace inconsistent error responses in mediaRoutes.ts and any other routes.
- Test command: `CI=true npm test`

## Phase 3: Verification
> Goal: Full test suite pass and production build.

### Task 3.1: Run full test suite and production build
- [ ] Task: Verify all changes with tests and build.
  - [ ] Sub-task: Run `CI=true npm test`.
  - [ ] Sub-task: Run `npm run build`.
  - [ ] Sub-task: Fix any regressions.
- Test command: `CI=true npm test && npm run build`
