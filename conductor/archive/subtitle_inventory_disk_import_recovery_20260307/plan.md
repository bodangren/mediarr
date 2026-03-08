# Implementation Plan: Subtitle Inventory Disk Import Recovery

## Phase 1: Subtitle Disk Scan Engine
> Goal: Add a real filesystem-backed subtitle scan that can map sidecar files into variant inventory records.

### Task 1.1: Add failing tests for subtitle disk scan import
- [x] Task: Add backend tests that prove movie and series scan endpoints currently fail to import on-disk subtitle files.
  - [x] Sub-task: Add a movie scan test that starts with a variant video file plus sibling subtitle files on disk and expects `newSubtitles > 0`.
  - [x] Sub-task: Add a series scan test that imports episode sidecar subtitles across multiple variants.
  - [x] Sub-task: Add an idempotency test that re-runs scan and expects `newSubtitles: 0` without duplicate records.
- Test command: `npm test -- server/src/api/routes/subtitleRoutes.scan.test.ts`
- Expected commit message: `test(subtitles): cover disk scan subtitle import`

### Task 1.2: Implement subtitle filesystem scan and inventory sync
- [x] Task: Implement a reusable subtitle sidecar scanner and connect it to variant inventory persistence.
  - [x] Sub-task: Enumerate supported sidecar subtitle files related to each variant video file.
  - [x] Sub-task: Derive best-effort subtitle metadata from filenames and sync the resulting tracks through the existing inventory repository/indexer.
  - [x] Sub-task: Return accurate `subtitlesFound` and `newSubtitles` counts for movie and series scan flows.
  - [x] Sub-task: Ensure repeated scans are idempotent.
- Test command: `npm test -- server/src/api/routes/subtitleRoutes.scan.test.ts`
- Expected commit message: `fix(subtitles): import on-disk sidecar subtitles during scan`

## Phase 2: Regression Coverage and Track Closeout
> Goal: Prove the repair does not break existing subtitle inventory flows and prepare for deferred manual verification.

### Task 2.1: Verify subtitle inventory regressions
- [x] Task: Run targeted subtitle server tests covering scan, inventory, and playback-facing subtitle inventory reads.
  - [x] Sub-task: Execute the new scan route test file.
  - [x] Sub-task: Execute existing subtitle inventory service/route tests that exercise inventory persistence.
  - [x] Sub-task: Record any non-track failures separately without blocking this fix if they are pre-existing and unrelated.
- Test command: `npm test -- server/src/api/routes/subtitleRoutes.scan.test.ts server/src/services/SubtitleInventoryApiService.test.ts server/src/api/routes/subtitleRoutes.phase3.test.ts`
- Expected commit message: `test(subtitles): verify disk import scan repair`

### Task 2.2: Update conductor tracking
- [x] Task: Mark completed scan-repair tasks and leave only any deferred manual verification or archive follow-up outstanding.
  - [x] Sub-task: Update `plan.md` task markers after automated verification.
  - [x] Sub-task: Update metadata/tacks registry to reflect in-progress completion state.
- Test command: `git diff -- conductor/tracks/subtitle_inventory_disk_import_recovery_20260307`
- Expected commit message: `conductor(plan): update subtitle disk import recovery status`
