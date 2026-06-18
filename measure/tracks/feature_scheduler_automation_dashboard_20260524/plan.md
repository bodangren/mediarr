# Plan: Scheduler & Automation Dashboard

## Phase 1: Backend Schema & API Contracts (TDD)

- [~] Write Drizzle schema tests for `taskExecutions` table (columns: id, taskName, startedAt, completedAt, status, durationMs, errorMessage)
- [~] Write migration test verifying table creation with drizzle-kit
- [~] Write tests for `GET /api/scheduler/tasks` — returns task metadata array
- [~] Write tests for `PUT /api/scheduler/:taskId/interval` — validates cron, rejects invalid expressions, persists to AppSettings
- [~] Write tests for `POST /api/scheduler/:taskId/trigger` — queues task, returns 202, writes execution record
- [~] Write tests for `GET /api/scheduler/history` — pagination, filtering by status, default sort descending
- [ ] Implement schema, routes, and scheduler service extensions
- [ ] Run tests — expect GREEN

> Red phase (mid role, 2026-06-18): Two test files added — `server/src/db/__tests__/taskExecutions.test.ts` (schema + migration behaviour) and `server/src/api/routes/schedulerRoutes.test.ts` (4 routes × N paths). Both fail at HEAD because the symbols under test (`schema.taskExecutions`, `TaskExecutionStatusEnum`, `registerSchedulerRoutes`) are not yet exported / defined. Targeted Red command: `vitest run server/src/db/__tests__/taskExecutions.test.ts server/src/api/routes/schedulerRoutes.test.ts`. See commit history for the Red-phase commit. Green phase is owned by the Implementer (JR role).
>
> **Red command (Node 22.22.3 + vitest 4.0.18):** `./node_modules/.bin/vitest run server/src/db/__tests__/taskExecutions.test.ts server/src/api/routes/schedulerRoutes.test.ts` — exit code 1, **10 failures / 9 tests + 1 failed suite**:
> - `taskExecutions.test.ts` (9/9 fail): `schema.taskExecutions is undefined` (2), `PRAGMA table_info("TaskExecution")` returns `[]` because the table is not created by the migration (5), `Cannot read properties of undefined (reading 'Symbol(drizzle:Columns)')` on insert because the table symbol is missing (2). All caused by missing schema/table — no test-infrastructure noise.
> - `schedulerRoutes.test.ts` (1 failed suite, 0 tests loaded): `Cannot find module './schedulerRoutes' from server/src/api/routes/schedulerRoutes.test.ts` — the route module under test does not exist yet.
> Failure summary proves new behavior is missing, not stale-data. Green phase will be reached when both files exist with the contracts asserted above.

## Phase 2: Shared UI Components (TDD)

- [ ] Write component tests for `TaskStatusBadge` — renders correct color and label for each status variant
- [ ] Write component tests for `CronIntervalPicker` — preset buttons update value, custom cron validates, rejects invalid
- [ ] Write component tests for `TaskHistoryPanel` — renders paginated rows, date filter works, empty state
- [ ] Write component tests for `TaskSchedulerTable` — row rendering, sort by lastRun, disable toggle fires callback
- [ ] Implement components with shadcn/ui Table, Switch, and Dialog primitives
- [ ] Run component tests — expect GREEN

## Phase 3: Automation Settings Page (TDD)

- [ ] Write integration tests for AutomationSettingsPage — loads tasks on mount, displays scheduler table
- [ ] Write integration tests for interval update flow — user selects preset, saves, sees optimistic update
- [ ] Write integration tests for manual trigger flow — click run-now, see loading state, then success toast
- [ ] Write integration tests for task history — expand history panel, verify pagination controls
- [ ] Implement AutomationSettingsPage with TanStack Query for server-state
- [ ] Wire page into Settings sidebar and React Router
- [ ] Run integration tests — expect GREEN

## Phase 4: Scheduler Service Integration & Manual Trigger

- [ ] Write unit tests for scheduler service `triggerTask()` — executes job, records execution, handles errors
- [ ] Write unit tests for interval hot-reload — updating cron expression reschedules without restart
- [ ] Integrate trigger endpoint with existing node-cron jobs; wrap each job with execution recording
- [ ] Add execution cleanup (retain last 100 records per task) to prevent unbounded growth
- [ ] Run unit + integration tests — expect GREEN

## Phase 5: Verification & Handoff

- [ ] Manual smoke test: open Automation settings → change RSS sync interval → verify next-run updates
- [ ] Manual smoke test: trigger Wanted Search manually → verify execution appears in history
- [ ] Run `CI=true npm test` — full suite green
- [ ] Run `npm run build` — SPA build clean
- [ ] Run `npm run typecheck` — zero errors
- [ ] Update `tech-debt.md` if any scheduler-related items are resolved
- [ ] Update `lessons-learned.md` with cron validation and hot-reload patterns
- [ ] Commit and push
