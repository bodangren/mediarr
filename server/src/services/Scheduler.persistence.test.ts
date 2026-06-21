import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Scheduler, type SchedulerStateRepository } from './Scheduler';

// ─── node-cron mock ──────────────────────────────────────────────────────────
// Mirrors the pattern from Scheduler.test.ts: capture every registered
// callback so we can invoke the wrapped cron tick synchronously, and stub
// validate() so all well-formed cron strings pass.
const cronSpy = vi.hoisted(() => {
  const callbacks: Array<() => Promise<void>> = [];
  return {
    scheduleMock: vi.fn((_expr: string, cb: () => Promise<void>) => {
      callbacks.push(cb);
      return { stop: vi.fn() };
    }),
    validateMock: vi.fn((expr: string) => /^\S+ \S+ \S+ \S+ \S+/.test(expr)),
    callbacks,
  };
});

vi.mock('node-cron', () => ({
  schedule: cronSpy.scheduleMock,
  validate: cronSpy.validateMock,
}));

// ─── SchedulerStateRepository mock ───────────────────────────────────────────
// Mirror of the contract described in test-strategy.md §2 — used to prove that
// Scheduler writes/updates its nextRunAt timestamps through dependency
// injection rather than direct AppSettings access (architecture guardrail #2).
interface SchedulerStateRepositoryMock extends SchedulerStateRepository {
  getTaskState: ReturnType<typeof vi.fn>;
  setTaskState: ReturnType<typeof vi.fn>;
  getAllTaskStates: ReturnType<typeof vi.fn>;
}

function createStateRepoMock(): SchedulerStateRepositoryMock {
  return {
    getTaskState: vi.fn().mockResolvedValue(null),
    setTaskState: vi.fn().mockResolvedValue(undefined),
    getAllTaskStates: vi.fn().mockResolvedValue({}),
  };
}

// ─── Phase 1 Red tests ───────────────────────────────────────────────────────
// These tests intentionally fail at HEAD. They will go green once Phase 2
// wires Scheduler to a SchedulerStateRepository:
//   1. schedule()  → setTaskState(taskName, nextRunAt ISO)
//   2. executeRecorded (success + failure) → setTaskState with the new nextRun
//   3. stop()      → setTaskState(taskName, '')  (or equivalent clear signal)
describe('Scheduler persistence contract (Phase 1 Red)', () => {
  let scheduler: Scheduler;
  let stateRepo: SchedulerStateRepositoryMock;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.callbacks.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T12:00:00.000Z'));
    scheduler = new Scheduler();
    stateRepo = createStateRepoMock();
    scheduler.setSchedulerStateRepository(stateRepo as unknown as SchedulerStateRepository);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('schedule() persists the nextRun timestamp via SchedulerStateRepository', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    expect(stateRepo.setTaskState).toHaveBeenCalled();
    const [taskName, nextRunAt] = stateRepo.setTaskState.mock.calls[0] as [
      string,
      string,
    ];
    expect(taskName).toBe('rss-sync');
    expect(typeof nextRunAt).toBe('string');
    expect(nextRunAt.length).toBeGreaterThan(0);
    expect(() => new Date(nextRunAt)).not.toThrow();
    expect(new Date(nextRunAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('schedule() persists valid crons and skips persistence when computeNextRun returns null', () => {
    // Two schedules: one valid (persistence required) and one with weekday
    // pinned (nextRun is null, so persistence must be skipped).
    scheduler.schedule('valid-job', '*/15 * * * *', () => undefined);
    scheduler.schedule('weekday-job', '0 3 * * 1', () => undefined);

    // Both halves of the contract are asserted: the valid cron must be
    // persisted, and the null-cron must NOT be persisted. At HEAD nothing
    // is persisted, so this test fails on the 'valid-job' expectation;
    // once Phase 2 wires persistence, it must skip the null-cron case.
    const persistedTaskNames = stateRepo.setTaskState.mock.calls.map(
      (call) => call[0] as string,
    );
    expect(persistedTaskNames).toContain('valid-job');
    expect(persistedTaskNames).not.toContain('weekday-job');
  });

  it('executeRecorded advances the persisted nextRun after a successful cron tick', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', async () => undefined);
    const callsBeforeTick = stateRepo.setTaskState.mock.calls.length;

    const wrapped = cronSpy.callbacks[0];
    expect(wrapped).toBeTypeOf('function');
    await wrapped!();

    expect(stateRepo.setTaskState.mock.calls.length).toBeGreaterThan(
      callsBeforeTick,
    );
    const latestCall = stateRepo.setTaskState.mock.calls.at(-1) as [string, string];
    expect(latestCall[0]).toBe('rss-sync');
    expect(new Date(latestCall[1]).getTime()).toBeGreaterThan(Date.now());
  });

  it('executeRecorded advances the persisted nextRun after a failed cron tick', async () => {
    const boom = new Error('upstream blew up');
    scheduler.schedule('flaky-job', '*/15 * * * *', async () => {
      throw boom;
    });
    const callsBeforeTick = stateRepo.setTaskState.mock.calls.length;

    const wrapped = cronSpy.callbacks[0];
    expect(wrapped).toBeTypeOf('function');
    await wrapped!();

    // Failed ticks must still advance nextRun so the next cron tick fires —
    // swallowing errors must not freeze the task's schedule.
    expect(stateRepo.setTaskState.mock.calls.length).toBeGreaterThan(
      callsBeforeTick,
    );
    const latestCall = stateRepo.setTaskState.mock.calls.at(-1) as [string, string];
    expect(latestCall[0]).toBe('flaky-job');
    expect(new Date(latestCall[1]).getTime()).toBeGreaterThan(Date.now());
  });

  it('stop() clears the persisted nextRun for the stopped task', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    const callsBeforeStop = stateRepo.setTaskState.mock.calls.length;
    scheduler.stop('rss-sync');

    // stop() must trigger at least one more write to the state repo for the
    // stopped task — Phase 2 implements this as setTaskState(name, '') or
    // any equivalent clearing signal the Green phase introduces.
    const stopCalls = stateRepo.setTaskState.mock.calls.slice(callsBeforeStop);
    expect(stopCalls.length).toBeGreaterThan(0);
    const clearingCall = stopCalls.at(-1) as [string, string];
    expect(clearingCall[0]).toBe('rss-sync');
    expect(clearingCall[1]).toBe('');
  });

  it('reschedule() updates the persisted nextRun when the cron expression changes', () => {
    // Initial schedule at */15 — sets the first persisted nextRun.
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    const callsAfterSchedule = stateRepo.setTaskState.mock.calls.length;
    expect(callsAfterSchedule).toBeGreaterThan(0);

    // Reschedule to a different cadence. The persisted nextRun is now stale
    // (it reflects the old cron); Scheduler MUST refresh it so a restart
    // after reschedule fires at the NEW time, not the old. At HEAD,
    // Scheduler.reschedule() does not call setTaskState at all, so the
    // call count stays the same and this test fails.
    scheduler.reschedule('rss-sync', '*/30 * * * *');

    const callsAfterReschedule = stateRepo.setTaskState.mock.calls.length;
    expect(callsAfterReschedule).toBeGreaterThan(callsAfterSchedule);

    const latestCall = stateRepo.setTaskState.mock.calls.at(-1) as [string, string];
    expect(latestCall[0]).toBe('rss-sync');
    expect(typeof latestCall[1]).toBe('string');
    expect(latestCall[1].length).toBeGreaterThan(0);
    expect(() => new Date(latestCall[1])).not.toThrow();
    expect(new Date(latestCall[1]).getTime()).toBeGreaterThan(Date.now());
  });

  // ─── Phase 3 Red tests ─────────────────────────────────────────────────────
  // These tests intentionally fail at HEAD. They will go green once Phase 3
  // wires Scheduler.start() to recover missed tasks from SchedulerStateRepository:
  //   1. start() loads all stored nextRun timestamps via getAllTaskStates().
  //   2. For tasks with stored nextRun in the past, executeRecorded() is invoked
  //      exactly once and the stored nextRun is advanced.
  //   3. Tasks with future or missing nextRun are skipped.
  //   4. A per-task running guard prevents double-execution when recovery and a
  //      cron tick fire close together.
  describe('Scheduler startup missed-task recovery (Phase 3 Red)', () => {
  it('start() executes a task whose stored nextRun is in the past', async () => {
    const callback = vi.fn();
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);
    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-21T11:00:00.000Z',
    });

    await (scheduler as unknown as { start(): Promise<void> }).start();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('start() does not execute a task whose stored nextRun is in the future', async () => {
    const callback = vi.fn();
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);
    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-21T13:00:00.000Z',
    });

    await (scheduler as unknown as { start(): Promise<void> }).start();

    expect(callback).not.toHaveBeenCalled();
  });

  it('start() updates nextRun after recovering a missed task', async () => {
    const callback = vi.fn();
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);
    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-21T11:00:00.000Z',
    });

    await (scheduler as unknown as { start(): Promise<void> }).start();

    const rssCalls = stateRepo.setTaskState.mock.calls.filter(
      (call) => call[0] === 'rss-sync',
    );
    expect(rssCalls.length).toBeGreaterThan(0);
    const latestCall = rssCalls.at(-1) as [string, string];
    expect(new Date(latestCall[1]).getTime()).toBeGreaterThan(Date.now());
  });

  it('start() skips recovery for tasks with no stored nextRun', async () => {
    const callback = vi.fn();
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);
    stateRepo.getAllTaskStates.mockResolvedValue({});

    await (scheduler as unknown as { start(): Promise<void> }).start();

    expect(callback).not.toHaveBeenCalled();
  });

  it('start() does not double-execute when recovery and cron fire near-same-time', async () => {
    const callback = vi.fn();
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);
    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-21T11:00:00.000Z',
    });

    const startable = scheduler as unknown as { start(): Promise<void> };
    const startPromise = startable.start();
    const cronCallback = cronSpy.callbacks[0];
    const concurrentPromise = cronCallback ? cronCallback() : Promise.resolve();
    await Promise.all([startPromise, concurrentPromise]);

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
});
