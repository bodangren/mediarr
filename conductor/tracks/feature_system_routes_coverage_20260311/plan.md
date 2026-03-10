# Plan: System Routes Test Coverage & Dynamic Disk Space from AppSettings

## Phase 1 — Comprehensive Test Suite for systemRoutes.ts

### Task 1.1 — Scaffold test file with app factory helper
- [x] Create `server/src/api/routes/systemRoutes.test.ts`
- [x] Implement `createApp(deps?)` factory that builds a minimal Fastify instance, registers error handler, and calls `registerSystemRoutes`
- [x] Import and use `systemState` to reset in-memory state in `beforeEach`

### Task 1.2 — Test `GET /api/system/status`
- [x] Test without deps → returns status 200 with stub values (no systemHealthService)
- [x] Test with mock `systemHealthService` → disk space, processInfo, db check, folder checks, ffmpeg are all called
- [x] Verify response shape: `health`, `system`, `database`, `diskSpace`, `dependencies`

### Task 1.3 — Test task scheduled routes
- [x] `GET /api/tasks/scheduled` without scheduler → returns fixture list with 4 tasks
- [x] `GET /api/tasks/scheduled` with scheduler mock → calls `listJobsMeta()`, returns live jobs
- [x] `POST /api/tasks/scheduled/:taskId/run` without scheduler, known task → returns 202 with taskId
- [x] `POST /api/tasks/scheduled/:taskId/run` without scheduler, unknown task → returns 404
- [x] `POST /api/tasks/scheduled/:taskId/run` with scheduler, known job → returns 202, calls `runNow()`
- [x] `POST /api/tasks/scheduled/:taskId/run` with scheduler, unknown job → returns 404

### Task 1.4 — Test task queued routes
- [x] `GET /api/tasks/queued` → returns empty array initially
- [x] `DELETE /api/tasks/queued/999` → returns 404

### Task 1.5 — Test task history routes
- [x] `GET /api/tasks/history` → returns paginated list of 3 fixture items
- [x] `GET /api/tasks/history?status=success` → filters correctly
- [x] `GET /api/tasks/history?taskName=RSS` → filters correctly
- [x] `GET /api/tasks/history?page=1&pageSize=2` → paginates correctly
- [x] `GET /api/tasks/history/:id` with valid id → returns single entry
- [x] `GET /api/tasks/history/9999` → returns 404

### Task 1.6 — Test system event routes
- [x] `GET /api/system/events` → returns paginated list
- [x] `GET /api/system/events?level=info` → only info events returned
- [x] `GET /api/system/events?type=indexer` → only indexer events returned
- [x] `DELETE /api/system/events/clear` (no filters) → clears all events
- [x] `DELETE /api/system/events/clear?level=warning` → clears only warning events
- [x] `GET /api/system/events/export` → returns JSON content-type with data
- [x] `GET /api/system/events/export?format=csv` → returns CSV content-type

## Phase 2 — Dynamic Disk Space from AppSettings

### Task 2.1 — Update systemRoutes.ts to read paths from settingsService
- [x] In `GET /api/system/status`: when `deps.settingsService` is present, call `settingsService.get()`
- [x] Build `diskPaths` from `movieRootFolder`, `tvRootFolder`, `torrentLimits.incompleteDirectory`, `torrentLimits.completeDirectory` (deduplicated by path)
- [x] Build `folderPaths` from the same set (movieRootFolder, tvRootFolder)
- [x] When `settingsService` is absent, fall back to empty `diskPaths` / `folderPaths` arrays (no crash)
- [x] Remove hardcoded `/data` and `/data/downloads` paths
- [x] Fix bug: `DELETE /api/system/events/clear` level-filter logic cleared 0 events instead of matching events

### Task 2.2 — Add tests for dynamic disk space behavior
- [x] Test: with `settingsService` mock returning specific root folders → `getDiskSpace` is called with those paths
- [x] Test: with `settingsService` mock returning empty strings → gracefully produces no disk entries (or deduplicates empty strings)
- [x] Test: without `settingsService` → endpoint still returns 200 with empty diskSpace array

### Task 2.3 — Update tech debt registry
- [x] Mark tech debt item `feature_system_health_20260310` as Resolved in `conductor/tech-debt.md`
