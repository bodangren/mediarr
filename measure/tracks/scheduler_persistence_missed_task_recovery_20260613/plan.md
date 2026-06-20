# Plan: Scheduler Persistence & Missed-Task Recovery

## Phase 1 — Red-phase contract tests

Write failing tests before modifying `Scheduler.ts`.

**Phase 1 scope (per `test-strategy.md` §5 + §7):** persistence only. Recovery
and health Red tests are added in Phase 3 and Phase 4 respectively — not in
Phase 1 — so the aggregate test suite never carries persistently-failing
recovery/health tests between phases.

- [x] Read current `server/src/services/Scheduler.ts` and `server/src/db/schema.ts` to understand task registration and AppSettings schema.
- [x] Create `server/src/services/Scheduler.persistence.test.ts` with 5 Red tests (persistence scope per `test-strategy.md` §5).
- [x] `schedule() persists the nextRun timestamp via SchedulerStateRepository`  ← Phase 2 Green complete (ef8ec174).
- [x] `schedule() persists valid crons and skips persistence when computeNextRun returns null`  ← Phase 2 Green complete (ef8ec174).
- [x] `executeRecorded advances the persisted nextRun after a successful cron tick`  ← Phase 2 Green complete (ef8ec174).
- [x] `executeRecorded advances the persisted nextRun after a failed cron tick`  ← Phase 2 Green complete (ef8ec174).
- [x] `stop() clears the persisted nextRun for the stopped task`  ← Phase 2 Green complete (ef8ec174).
- [x] Run the new suite and confirm it fails for the expected reasons.

**Phase 1 Red results (committed by `ba1cd27f` — Red-phase commit):**
- Command: `CI=true npx vitest run server/src/services/Scheduler.persistence.test.ts`
- Outcome: **5 failed / 0 passed / 5 total**
- Failures are for the expected missing behavior — `Scheduler` does not call
  `SchedulerStateRepository.setTaskState` during `schedule()`, `executeRecorded`,
  or `stop()` because the dependency is not wired yet. No vacuous-green tests.

**Phase 1 items re-scoped to later phases (per `test-strategy.md` §7):**
The following plan items were originally drafted under Phase 1 but belong to
later phases. They are intentionally NOT written in this Red-phase commit.
- [ ] `start() executes a task whose stored nextRun is in the past` → Phase 3 Red
- [ ] `start() does not execute a task whose stored nextRun is in the future` → Phase 3 Red
- [ ] `start() updates nextRun after recovering a missed task` → Phase 3 Red
- [ ] `runTask() is idempotent when called twice within the same minute` → Phase 3 Red
- [ ] `getHealth() returns scheduledTaskCount and missedTaskCount` → Phase 4 Red

- [x] Commit: `test(scheduler): add Red-phase persistence contract tests` (`ba1cd27f`)

**Phase 1 verification at MID handoff (this session):**
- Targeted command: `CI=true npx vitest run server/src/services/Scheduler.persistence.test.ts`
- Result: **5 passed / 0 failed / 5 total** in 1.38s.
- Phase 1 Red work is already satisfied by `ba1cd27f` (Red commit) and the subsequent Phase 2 Green commit `ef8ec174`. No new Red tests are required — writing additional tests now would create a false Red phase since the contract is already enforced by the existing 5 passing tests.
- Dirty worktree context at this MID start: `conductor/archive/cardigann_runtime_parity_20260223/artifacts/final-phase5-compatibility-matrix.json` (generatedAt timestamp only). Classified as **unrelated user work** (different archived track) and preserved as-is, not folded into this commit.

## Phase 2 — Persist next-run on schedule and execution

- [x] Add `getNextRun(cronExpression: string, after?: Date): Date` helper using `cron-parser` or existing cron utility.  → Existing `computeNextRun()` fulfills this role; no new helper required.
- [x] Modify `Scheduler.schedule()` to write `scheduler:<taskId>:nextRun` to `AppSettings` after registering the cron job.  → Calls `schedulerStateRepository.setTaskState(name, nextRun)`.
- [x] Modify `Scheduler.runTask()` to update the stored nextRun after successful execution.  → `executeRecorded()` updates nextRun in the `finally` block (both success and failure).
- [x] Run the Phase 1 Red suite; the persistence tests should now pass.  → 5/5 passed.
- [x] Commit: `feat(scheduler): persist next-run timestamps to AppSettings`  → `ef8ec174`

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
