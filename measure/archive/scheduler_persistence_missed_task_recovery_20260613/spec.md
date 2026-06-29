# Spec: Scheduler Persistence & Missed-Task Recovery

## Problem

`Scheduler.ts` uses an in-memory `node-cron` registry. When the Bun process restarts, all scheduled next-run timestamps are lost and tasks that should have run while the process was down are silently dropped. This breaks the automated lifecycle (RSS syncs, availability checks, torrent monitoring) for any restart, deployment, or crash.

Tech-debt reference: `measure/tech-debt.md` line 42 — *"Scheduler.ts uses in-memory node-cron with no persistence or 'run missed tasks' logic; missed tasks on restart are silently dropped."*

## Goal

Make the scheduler durable without changing its public API or task semantics:

1. Persist the next-run timestamp for every registered scheduled task.
2. On startup, detect tasks whose next-run timestamp is in the past and execute them (missed-task recovery).
3. Prevent duplicate execution of recovered tasks and of tasks that run normally around the same time.
4. Expose scheduler health via the existing `/api/health` and `/api/system/status` endpoints.

## Non-Goals

- Distributed scheduling or multi-process coordination.
- Sub-second precision or complex cron backfills (recover at most one missed invocation per task per startup).
- Changing the cron expression format or the task registry structure.

## Acceptance Criteria

- [ ] Every registered scheduled task writes/updates its next-run timestamp to `AppSettings` whenever it is scheduled or after it executes.
- [ ] On `Scheduler.start()`, any task whose stored next-run is in the past is executed once and its next-run is recalculated from the current time using the cron expression.
- [ ] Concurrent startup recovery and normal cron execution are safe (idempotent per task).
- [ ] A new `/server/src/services/Scheduler.persistence.test.ts` suite covers:
  - persisted next-run after schedule
  - missed-task execution after restart
  - no double execution when a task is recovered and its cron fires near the same time
  - health metric shape
- [ ] `CI=true npm test` passes for the new suite; pre-existing failures remain unchanged.
- [ ] `measure/tech-debt.md` Scheduler row is updated to `Resolved`.
- [ ] `measure/lessons-learned.md` captures the persistence pattern used.

## Scope

- `server/src/services/Scheduler.ts`
- `server/src/db/schema.ts` (if a new AppSettings key is needed)
- `server/src/services/Scheduler.persistence.test.ts` (new)
- Health endpoints consume scheduler state (read-only).

## Related Work

- `chore_core_integrity_20260610` identified this gap and documented FR-5.4.
- `chore_untested_server_services_20260526` overlaps on Scheduler test coverage; this track focuses specifically on persistence/restart behavior.
