# Specification: System Administration Pages

## Overview
The System section (Tasks, Logs, Backup) currently renders `StaticPage` stubs in the frontend and returns hardcoded in-memory fixtures from the backend. This track replaces all three with real, production-grade implementations that reflect actual system state.

## Problem
- **Tasks page:** The `systemRoutes.ts` scheduled-task list is a static array. It does not read from the real `Scheduler` service. Running a task simulates completion with `setTimeout` and random success/failure.
- **Logs page:** No log reading infrastructure exists. The frontend is a blank stub.
- **Backup page:** The `backupRoutes.ts` creates fake backup entries in memory. No real SQLite backup (`.backup` or file copy) is performed. Restore is a no-op.

## Scope

### Tasks (System > Tasks)
- Wire `GET /api/tasks/scheduled` to the real `Scheduler` service so it returns actual cron jobs, their intervals, last/next execution times, and live status.
- Wire `POST /api/tasks/scheduled/:taskId/run` to trigger the real scheduler job (RSS sync, subtitle scan, health check, etc.) and track its progress via SSE.
- Display queued/running tasks with real progress and allow cancellation.
- Show task execution history persisted in the database (not in-memory).

### Logs (System > Logs)
- Implement a `LogReaderService` that tails or paginates the application log file(s).
- Provide `GET /api/logs` with level filtering (info, warn, error), date range, and text search.
- Build a frontend log viewer with auto-scroll, level badges, and search.

### Backup (System > Backup)
- Implement a `BackupService` that performs a real SQLite database backup (using `.backup` API or file copy with WAL checkpoint).
- Store backups in a configurable directory with timestamped filenames.
- Wire schedule CRUD to the real `Scheduler` so automated backups actually run.
- Support download (stream the zip/file to the browser) and restore (replace the DB file and restart).
- Retention policy: auto-delete backups older than the configured retention period.

## Out of Scope
- Update/version checking (the `updatesRoutes.ts` stub can remain for now — self-update is a much larger feature).
- Authentication or access control for system pages.
