# Spec: System Routes Test Coverage & Dynamic Disk Space from AppSettings

## Problem Statement

`server/src/api/routes/systemRoutes.ts` is a 643-line critical module that handles:
- System health status (`GET /api/system/status`)
- Scheduled task management (`GET /api/tasks/scheduled`, `POST /api/tasks/scheduled/:taskId/run`)
- Queued task management (`GET /api/tasks/queued`, `DELETE /api/tasks/queued/:taskId`)
- Task history (`GET /api/tasks/history`, `GET /api/tasks/history/:id`)
- System event log (`GET /api/system/events`, `DELETE /api/system/events/clear`, `GET /api/system/events/export`)

Despite this breadth, **there is zero test coverage** for this module. Additionally, the disk-space monitoring in `GET /api/system/status` hardcodes paths to `/data` and `/data/downloads`, ignoring the user-configured root folders from AppSettings — a known open tech debt item.

## Goals

1. **Test coverage ≥ 80%** for `systemRoutes.ts` via a new `systemRoutes.test.ts` file.
2. **Resolve open tech debt**: `GET /api/system/status` disk-space paths read from `settingsService` (movieRootFolder, tvRootFolder, and torrent incomplete/complete directories) instead of being hardcoded.
3. **No regressions** — all existing tests continue to pass.

## Acceptance Criteria

### Phase 1 — Test Coverage

- [ ] `systemRoutes.test.ts` exists with `describe` blocks for each route group.
- [ ] `GET /api/system/status` is tested with and without `systemHealthService`.
- [ ] `GET /api/tasks/scheduled` is tested with and without `scheduler` (live jobs vs. fixture list).
- [ ] `POST /api/tasks/scheduled/:taskId/run` is tested for: success with scheduler, success without scheduler, not-found 404.
- [ ] `GET /api/tasks/queued` returns empty array initially.
- [ ] `DELETE /api/tasks/queued/:taskId` returns 404 for unknown id.
- [ ] `GET /api/tasks/history` supports pagination and status/taskName filtering.
- [ ] `GET /api/tasks/history/:id` returns 404 for unknown id.
- [ ] `GET /api/system/events` supports filtering by level, type, startDate, endDate.
- [ ] `DELETE /api/system/events/clear` correctly removes matching events.
- [ ] `GET /api/system/events/export` returns JSON by default and CSV when `?format=csv`.
- [ ] All tests use `beforeEach` to reset module state (via `systemState` export) to prevent cross-test pollution.

### Phase 2 — Dynamic Disk Space

- [ ] `GET /api/system/status` calls `settingsService.get()` when `settingsService` is present in deps.
- [ ] Disk-space check paths derive from: `movieRootFolder`, `tvRootFolder`, `torrentLimits.incompleteDirectory`, `torrentLimits.completeDirectory`.
- [ ] When `settingsService` is absent, the endpoint gracefully falls back to empty disk-space array (not crash).
- [ ] Root folder health checks (`checkRootFolders`) also use the same dynamic paths.
- [ ] Tests verify that the mocked `settingsService.get()` result influences the paths passed to `systemHealthService.getDiskSpace()`.

## Out of Scope

- Persisting task history or system events to SQLite (in-memory store is acceptable for now).
- Adding new API endpoints.
- Frontend changes.
