# Plan: Scheduler Persistence & Missed-Task Recovery

## Phase 1 — Red-phase contract tests

Write failing tests before modifying `Scheduler.ts`.

- [ ] Read current `server/src/services/Scheduler.ts` and `server/src/db/schema.ts` to understand task registration and AppSettings schema.
- [ ] Create `server/src/services/Scheduler.persistence.test.ts` with Red tests:
  - [ ] `schedule() persists nextRun timestamp in AppSettings`
  - [ ] `start() executes a task whose stored nextRun is in the past`
  - [ ] `start() does not execute a task whose stored nextRun is in the future`
  - [ ] `start() updates nextRun after recovering a missed task`
  - [ ] `runTask() is idempotent when called twice within the same minute`
  - [ ] `getHealth() returns scheduledTaskCount and missedTaskCount`
- [ ] Run the new suite and confirm it fails for the expected reasons.
- [ ] Commit: `test(scheduler): add Red-phase persistence/recovery contract tests`

## Phase 2 — Persist next-run on schedule and execution

- [ ] Add `getNextRun(cronExpression: string, after?: Date): Date` helper using `cron-parser` or existing cron utility.
- [ ] Modify `Scheduler.schedule()` to write `scheduler:<taskId>:nextRun` to `AppSettings` after registering the cron job.
- [ ] Modify `Scheduler.runTask()` to update the stored nextRun after successful execution.
- [ ] Run the Phase 1 Red suite; the persistence tests should now pass.
- [ ] Commit: `feat(scheduler): persist next-run timestamps to AppSettings`

## Phase 3 — Startup missed-task recovery

- [ ] Modify `Scheduler.start()` to:
  - [ ] Load all `scheduler:*:nextRun` entries from `AppSettings`.
  - [ ] For each task with a stored nextRun in the past, run it once and update the stored nextRun.
  - [ ] Skip recovery if the task is already running or was executed very recently (within the same interval window).
- [ ] Add tests for concurrent recovery + normal cron firing (no double execution).
- [ ] Commit: `feat(scheduler): recover missed tasks on startup`

## Phase 4 — Health metrics and API surface

- [ ] Add `Scheduler.getHealth(): { scheduledTaskCount: number; missedTaskCount: number; lastRecoveryAt?: string }`.
- [ ] Wire health data into existing `/api/health` and `/api/system/status` responses (additive fields only).
- [ ] Add tests for health metric shape.
- [ ] Commit: `feat(scheduler): expose scheduler health metrics`

## Phase 5 — Verification and closeout

- [ ] Run `bun x vitest run server/src/services/Scheduler.persistence.test.ts` — all tests pass.
- [ ] Run `node scripts/check-monorepo-boundaries.mjs` — clean.
- [ ] Update `measure/tech-debt.md`: change Scheduler row Status to `Resolved` and add closeout note.
- [ ] Update `measure/lessons-learned.md` with the persistence pattern (≤2 lines).
- [ ] Update `measure/tracks.md`: mark this track `[x]` and move link to archive.
- [ ] Move this track directory to `measure/archive/scheduler_persistence_missed_task_recovery_20260613/`.
- [ ] Commit: `docs(measure): archive scheduler persistence track`
- [ ] Push to remote.

## Risks & Mitigations

- **Risk:** Writing to `AppSettings` on every execution adds DB writes.
  - *Mitigation:* Only persist nextRun on schedule and after execution; use a single settings row per task.
- **Risk:** Recovery runs tasks out of order during startup.
  - *Mitigation:* Document that recovery runs tasks in registration order; do not guarantee cross-task ordering.
- **Risk:** Long-running recovery blocks scheduler startup.
  - *Mitigation:* Run recovery synchronously but bounded; tasks are expected to be fast. Document if a task is slow.
