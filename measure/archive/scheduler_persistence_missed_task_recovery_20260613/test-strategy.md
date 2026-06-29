# Test Strategy: Scheduler Persistence & Missed-Task Recovery

## 0. Build-Graph Findings That Shaped the Strategy

- `build-graph stats ./graph.db`: 7685 nodes, 11278 edges, 905 files. Graph is fresh (<24h).
- `build-graph search "Scheduler"`: `Scheduler` class at `server/src/services/Scheduler.ts` is the sole production symbol. 5 existing test files: `Scheduler.test.ts`, `.trigger.test.ts`, `.subtitle.test.ts`, `.meta.test.ts`, `.history.test.ts`.
- `build-graph callers "Scheduler"`: instantiated only in `server/src/main.ts:390`. API surface in `server/src/api/types.ts:141` picks `listJobsMeta | runNow | listJobs | isScheduled | reschedule | setTaskExecutionsRepository | triggerTask` — **no `start` or `getHealth` yet**.
- `AppSettingsRepository` (`server/src/repositories/AppSettingsRepository.ts`): single-row table, JSON columns per category. No key-value store. A **new `schedulerState` JSON column** is needed on the `appSettings` table for `Record<string, string>` (taskName → nextRunAt ISO).
- `computeNextRun` in `Scheduler.ts:95-172`: handles only `*/N`, `M * * * *`, `M */N * * *`, `M H * * *` (day/month/weekday must be `*`). Sufficient for current scheduler patterns; persistence tests should mock time, not depend on real cron parsing.
- `cron-parser` is **NOT installed**; `node-cron` ^4.2.1 is the only cron dependency. Use the existing `computeNextRun` for nextRun calculation; do not add `cron-parser`.
- `executeRecorded` (`Scheduler.ts:269-320`) is the shared execution harness for both cron-fired and manual triggers — this is where nextRun should be refreshed after execution.

## 1. Testing Pyramid Per Phase

### Phase 1 (Red-phase contract tests) — Unit only
- **Unit (100%)**: Failing tests in `Scheduler.persistence.test.ts` proving the absence of persistence, recovery, and health behavior. No integration or E2E needed.

### Phase 2 (Persist next-run) — Unit + Integration-light
- **Unit (80%)**: `schedule()` writes nextRun to mock state repository; `executeRecorded` updates it after run.
- **Integration (20%)**: Verify nextRun survives a "restart" (new Scheduler instance reading from the same mock store).

### Phase 3 (Startup recovery) — Unit + Integration-light
- **Unit (60%)**: `start()` loads stored nextRuns, fires past-due tasks, skips future ones, updates nextRun after recovery.
- **Integration (40%)**: Concurrent recovery + normal cron firing (no double execution) using fake timers and a shared mock store.

### Phase 4 (Health metrics) — Unit + Integration
- **Unit (50%)**: `getHealth()` returns correct shape with `scheduledTaskCount`, `missedTaskCount`, `lastRecoveryAt`.
- **Integration (50%)**: `/api/health` and `/api/system/status` include scheduler health fields (additive).

### Phase 5 (Verification) — Full suite regression
- `CI=true npx vitest run server/src/services/Scheduler.persistence.test.ts` + `node scripts/check-monorepo-boundaries.mjs`.

## 2. Shared Fixtures & Mocks

- **node-cron mock** (existing pattern): `vi.mock('node-cron')` with hoisted `scheduleMock` + `validateMock`. Reuse from `Scheduler.test.ts:5-21`.
- **SchedulerStateRepository mock** (NEW): The Scheduler needs a new injected dependency for persistence, mirroring `setTaskExecutionsRepository`. Define:
  ```typescript
  interface SchedulerStateRepository {
    getTaskState(taskName: string): Promise<string | null>;
    setTaskState(taskName: string, nextRunAt: string): Promise<void>;
    getAllTaskStates(): Promise<Record<string, string>>;
  }
  ```
  Test mock: in-memory `Map<string, string>` with spy functions.
- **Fake timers**: `vi.useFakeTimers()` to control `Date.now()` for deterministic nextRun assertions. Restore in `afterEach`.
- **TaskExecutionsRepository mock** (existing): reuse `createRepoMock()` pattern from `Scheduler.history.test.ts`.

## 3. Cross-Phase Edge Cases & Dependencies

| Edge Case | Phases | Risk | Mitigation |
|-----------|--------|------|------------|
| **Phase 1 writes ALL tests but Phases 2-4 implement progressively** | P1→P4 | JR gate runs full suite; failing recovery/health tests in P2/P3 would block the gate | **Phase 1 writes ONLY persistence tests.** Recovery tests are added in Phase 3's Red sub-task; health tests in Phase 4's Red sub-task. See §7. |
| New `schedulerState` column requires Drizzle migration | P2 | Migration must be additive (nullable/default `{}`) to avoid breaking existing rows | Add column as `text("schedulerState", { mode: "json" }).notNull().default('{}')` |
| `start()` is a NEW method (plan says "Modify" but it doesn't exist) | P3 | API types Pick in `api/types.ts:141` must be extended with `start` and `getHealth` | Add to the Pick type; wire `scheduler.start()` in `main.ts` after all `schedule()` calls |
| Concurrency: recovery runs task while cron also fires | P3 | Double execution of same task | Add per-task `running: boolean` flag in `ScheduledJob`; `executeRecorded` skips if already running |
| `computeNextRun` returns null for non-standard crons | P2-P3 | Tasks with day/month/weekday restrictions can't persist/recover nextRun | Document as known limitation; persistence tests use standard cron patterns only |
| AppSettings single-row pattern: concurrent writes | P2 | `setTaskState` must not clobber other settings | Use targeted JSON merge, not full-row replace |

## 4. Architecture Guardrails

1. **No new tables.** Add a `schedulerState` JSON column to the existing `appSettings` table. One migration, one column.
2. **Dependency injection, not import.** Scheduler must not import `AppSettingsRepository` directly. Use the `SchedulerStateRepository` interface injected via `setSchedulerStateRepository(repo)`.
3. **Additive API surface.** `start()` and `getHealth()` are new methods. Existing methods keep their signatures. The `api/types.ts` Pick type grows but never shrinks.
4. **Additive health fields.** `/api/health` and `/api/system/status` responses gain optional `scheduler` fields. Existing consumers must not break.
5. **No `cron-parser` dependency.** Use the existing `computeNextRun` for nextRun calculation. If a cron pattern returns null, skip persistence for that task.
6. **Recovery is bounded.** At most one missed invocation per task per startup (per spec Non-Goals). Do not backfill multiple missed intervals.
7. **Test file isolation.** `Scheduler.persistence.test.ts` must not import or depend on other Scheduler test files. Shared mocks are re-declared, not imported.

## 5. Per-Phase Test Approach Notes

### Phase 1 — Red tests (persistence only)
Write `Scheduler.persistence.test.ts` with tests ONLY for persistence behavior (Phase 2's scope):
- `schedule() persists nextRun timestamp via SchedulerStateRepository`
- `schedule() does not persist when computeNextRun returns null`
- `executeRecorded updates nextRun after successful execution`
- `executeRecorded updates nextRun after failed execution (still advances)`
- `stop() clears persisted nextRun`
These tests fail because `setSchedulerStateRepository` and persistence calls don't exist yet.

### Phase 2 — Implement persistence
Implement `setSchedulerStateRepository`, write nextRun in `schedule()`, update in `executeRecorded`, clear in `stop()`. Phase 1 tests go green.

### Phase 3 — Red + Green for recovery
**Red:** Add recovery tests to the same file:
- `start() executes a task whose stored nextRun is in the past`
- `start() does not execute a task whose stored nextRun is in the future`
- `start() updates nextRun after recovering a missed task`
- `start() skips recovery for tasks with no stored nextRun`
- `start() does not double-execute when recovery and cron fire near-same-time`
**Green:** Implement `start()` with recovery logic and per-task `running` flag.

### Phase 4 — Red + Green for health
**Red:** Add health tests:
- `getHealth() returns scheduledTaskCount matching registered jobs`
- `getHealth() returns missedTaskCount from last recovery`
- `getHealth() returns lastRecoveryAt timestamp after start()`
- `/api/health` response includes `scheduler` health object
**Green:** Implement `getHealth()`, wire into health endpoints.

### Phase 5 — Verification
Run targeted suite + boundary check. Update `tech-debt.md`, `lessons-learned.md`, archive track.

## 6. Build-Graph Findings (supplement to §0)

- `build-graph inspect "Scheduler"`: 14 public methods, 0 callers outside `main.ts` and test files. Adding `start()` and `getHealth()` has **zero blast radius** on existing callers.
- `build-graph inspect "AppSettingsRepository"`: `get()` and `update()` are the only methods. The new `schedulerState` column read/write can be added as internal helpers without changing the public `AppSettingsPayload` interface — the `SchedulerStateRepository` implementation wraps `AppSettingsRepository.get()` + `update({ schedulerState: ... })`.
- `build-graph search "health"`: `/api/health` is in `operationsRoutes.ts:259`, `/api/system/status` in `systemRoutes.ts:247`. Both already accept `deps` with optional services — scheduler health fits as an optional dep.

## 7. Live-Proof Plan (Targeted Red + Green/Closeout Gates)

| Phase | Targeted Red Command (expected FAIL) | Green/Closeout Gate (expected PASS) |
|-------|--------------------------------------|--------------------------------------|
| **P1** | `CI=true npx vitest run server/src/services/Scheduler.persistence.test.ts` → 5 tests FAIL (no `setSchedulerStateRepository`, no persistence calls) | N/A (Red phase only) |
| **P2** | N/A (no new Red tests) | `CI=true npx vitest run server/src/services/Scheduler.persistence.test.ts` → 5 persistence tests PASS |
| **P3** | `CI=true npx vitest run server/src/services/Scheduler.persistence.test.ts` → 5 new recovery tests FAIL (no `start()` method) | `CI=true npx vitest run server/src/services/Scheduler.persistence.test.ts` → ALL 10 tests PASS |
| **P4** | `CI=true npx vitest run server/src/services/Scheduler.persistence.test.ts` → 4 new health tests FAIL (no `getHealth()`) | `CI=true npx vitest run server/src/services/Scheduler.persistence.test.ts` → ALL 14 tests PASS. Plus: `CI=true npx vitest run server/src/api/routes/systemRoutes.test.ts` and `operationsRoutes` health tests PASS |
| **P5** | N/A | `CI=true npx vitest run server/src/services/Scheduler.persistence.test.ts` → ALL PASS. `node scripts/check-monorepo-boundaries.mjs` → clean. `measure/tech-debt.md` Scheduler row → Resolved |

**Artifact vs. live-behavior distinction:** All tests in this strategy are live-behavior tests — they instantiate a real `Scheduler` with mocked dependencies and assert runtime behavior. No markdown/artifact-only assertions.

**Intentionally-red test files:** None. By writing Red tests per-phase (not all upfront), no test file has persistently-failing tests discovered by the aggregate suite between phases.
