# Implementation Plan: System Administration Pages

## Phase 1: Wire Tasks to Real Scheduler
> Goal: Replace static task fixtures with data from the live Scheduler service.

- [x] Task: Enhance `Scheduler` to track job metadata
    - [x] Sub-task: Store `cronExpression` per job in the internal `jobs` Map
    - [x] Sub-task: Add `listJobsMeta()` method returning name, cron expression, and last/next execution times
    - [x] Sub-task: Track `lastRunAt` and `lastDurationMs` per job (updated after each run)
- [x] Task: Add `scheduler` to `ApiDependencies` (optional)
- [x] Task: Pass `scheduler` to `createApiServer` in `main.ts`
- [x] Task: Update `systemRoutes.ts` to read `GET /api/tasks/scheduled` from `deps.scheduler` when present
- [x] Task: Update `POST /api/tasks/scheduled/:taskId/run` to call `deps.scheduler.runNow()` when present
- [x] Task: Write unit tests for Scheduler metadata methods

## Phase 2: Real Log Reader Service
> Goal: Implement a `LogReaderService` that reads actual process log lines.

- [x] Task: Create `server/src/services/LogReaderService.ts`
    - [x] Sub-task: Implement an in-process ring buffer (max 2000 entries) that captures structured log entries
    - [x] Sub-task: Export `globalLogBuffer` singleton
    - [x] Sub-task: Expose `getEntries(filter, pagination)` method
- [x] Task: Hook `LogReaderService` into the server startup (intercept console output)
- [x] Task: Add `logReaderService` to `ApiDependencies`
- [x] Task: Update `logsRoutes.ts` to read from the real `LogReaderService` when present
- [x] Task: Write unit tests for `LogReaderService`

## Phase 3: Real SQLite Backup Service
> Goal: Implement a `BackupService` that creates real filesystem backup files.

- [x] Task: Create `server/src/services/BackupService.ts`
    - [x] Sub-task: Implement `create()` — copy the SQLite DB file to a timestamped file in the backup directory
    - [x] Sub-task: Implement `list()` — list actual backup files on disk
    - [x] Sub-task: Implement `delete(id)` — delete a backup file by name
    - [x] Sub-task: Implement `getFilePath(name)` — resolve and validate the backup file path
- [x] Task: Add `backupService` to `ApiDependencies`
- [x] Task: Pass `backupService` to `createApiServer` in `main.ts`
- [x] Task: Update `backupRoutes.ts` to use the real `BackupService` when present
- [x] Task: Write unit tests for `BackupService`
