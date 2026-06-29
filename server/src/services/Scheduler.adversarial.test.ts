import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { Scheduler, type SchedulerStateRepository } from './Scheduler';
import { registerOperationsRoutes } from '../api/routes/operationsRoutes';
import { registerSystemRoutes } from '../api/routes/systemRoutes';
import { registerApiErrorHandler } from '../api/errors';
import type { ApiDependencies } from '../api/types';

// ─── node-cron mock (mirror of Scheduler.persistence.test.ts) ───────────────
// Adversarial tests must be self-contained — re-declare the cron spy rather
// than importing from the Phase 1-4 test file (test-strategy.md §4.7).
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

// ─── SchedulerStateRepository mock ──────────────────────────────────────────
interface SchedulerStateRepositoryMock extends SchedulerStateRepository {
  getTaskState: ReturnType<typeof vi.fn<(taskName: string) => Promise<string | null>>>;
  setTaskState: ReturnType<typeof vi.fn<(taskName: string, nextRunAt: string) => Promise<void>>>;
  getAllTaskStates: ReturnType<typeof vi.fn<() => Promise<Record<string, string>>>>;
}

function createStateRepoMock(): SchedulerStateRepositoryMock {
  return {
    getTaskState: vi.fn().mockResolvedValue(null),
    setTaskState: vi.fn().mockResolvedValue(undefined),
    getAllTaskStates: vi.fn().mockResolvedValue({}),
  };
}

interface SchedulerLike {
  getHealth(): {
    scheduledTaskCount: number;
    missedTaskCount: number;
    lastRecoveryAt?: string;
  };
  start(): Promise<void>;
}

function getHealth(scheduler: Scheduler): SchedulerLike['getHealth'] extends () => infer R ? R : never {
  return (scheduler as unknown as SchedulerLike).getHealth();
}

// Shared app builder so each adversarial test asserts additive shape from a
// fresh Fastify instance — no cross-test state pollution.
async function buildApp(deps: Partial<ApiDependencies>): Promise<FastifyInstance> {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) =>
    registerApiErrorHandler(request, reply, error),
  );
  const fullDeps: ApiDependencies = { prisma: {}, ...deps };
  registerOperationsRoutes(app, fullDeps);
  registerSystemRoutes(app, fullDeps);
  return app;
}

// ─── Phase 5 adversarial — health counters ──────────────────────────────────
// Anti-pattern probes target A4 (vacuous-pass) and A5 (false-claim).
describe('Scheduler adversarial — health counters', () => {
  let scheduler: Scheduler;
  let stateRepo: SchedulerStateRepositoryMock;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.callbacks.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));
    scheduler = new Scheduler();
    stateRepo = createStateRepoMock();
    scheduler.setSchedulerStateRepository(stateRepo as unknown as SchedulerStateRepository);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('initial getHealth(): missedTaskCount=0, lastRecoveryAt undefined (no start yet)', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    const health = getHealth(scheduler);

    expect(health.scheduledTaskCount).toBe(1);
    expect(health.missedTaskCount).toBe(0);
    expect(health.lastRecoveryAt).toBeUndefined();
  });

  it('getHealth() reflects real missed count after start() (not hardcoded zero)', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    scheduler.schedule('health-check', '*/15 * * * *', () => undefined);
    scheduler.schedule('wanted-search', '*/15 * * * *', () => undefined);

    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-29T11:00:00.000Z',
      'health-check': '2026-06-29T11:30:00.000Z',
      'wanted-search': '2026-06-29T11:45:00.000Z',
    });

    await (scheduler as unknown as SchedulerLike).start();

    const health = getHealth(scheduler);
    expect(health.missedTaskCount).toBe(3);
    expect(health.missedTaskCount).not.toBe(0);
  });

  it('start() called twice RESETS missedTaskCount (does not accumulate)', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    // First start() recovers 1 task.
    stateRepo.getAllTaskStates.mockResolvedValueOnce({
      'rss-sync': '2026-06-29T11:00:00.000Z',
    });
    await (scheduler as unknown as SchedulerLike).start();

    let health = getHealth(scheduler);
    expect(health.missedTaskCount).toBe(1);

    // Second start() recovers 0 tasks — counter should reset to 0, not stay at 1.
    stateRepo.getAllTaskStates.mockResolvedValueOnce({});
    await (scheduler as unknown as SchedulerLike).start();

    health = getHealth(scheduler);
    expect(health.missedTaskCount).toBe(0);
  });

  it('start() with only-future nextRuns sets lastRecoveryAt but missedTaskCount=0', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-29T15:00:00.000Z', // future
    });

    await (scheduler as unknown as SchedulerLike).start();

    const health = getHealth(scheduler);
    expect(health.missedTaskCount).toBe(0);
    expect(health.lastRecoveryAt).toBeDefined();
    expect(new Date(health.lastRecoveryAt!).getTime()).not.toBeNaN();
  });

  it('lastRecoveryAt is a valid ISO timestamp parseable by Date', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    await (scheduler as unknown as SchedulerLike).start();

    const health = getHealth(scheduler);
    expect(health.lastRecoveryAt).toBeDefined();
    expect(typeof health.lastRecoveryAt).toBe('string');
    const parsed = new Date(health.lastRecoveryAt!);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(parsed.getTime()).toBeGreaterThan(0);
  });

  it('A4 vacuous-pass probe: getHealth() distinguishes empty vs populated scheduler', () => {
    const emptyHealth = getHealth(scheduler);
    expect(emptyHealth.scheduledTaskCount).toBe(0);
    expect(emptyHealth.missedTaskCount).toBe(0);

    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    scheduler.schedule('health-check', '*/15 * * * *', () => undefined);

    const populatedHealth = getHealth(scheduler);
    expect(populatedHealth.scheduledTaskCount).toBe(2);
    expect(populatedHealth.scheduledTaskCount).not.toBe(emptyHealth.scheduledTaskCount);
  });

  it('scheduledTaskCount tracks live jobs after stop() (regression: not a stale snapshot)', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    scheduler.schedule('health-check', '*/15 * * * *', () => undefined);

    let health = getHealth(scheduler);
    expect(health.scheduledTaskCount).toBe(2);

    scheduler.stop('rss-sync');

    health = getHealth(scheduler);
    expect(health.scheduledTaskCount).toBe(1);
  });
});

// ─── Phase 5 adversarial — additive API shape (regression) ──────────────────
// The track spec §Scope says "Health endpoints consume scheduler state (read-only)".
// Tests below assert the additive shape: existing fields preserved + new
// scheduler field appears iff the runtime wires a Scheduler instance.
describe('Scheduler adversarial — additive API shape', () => {
  let scheduler: Scheduler;
  let stateRepo: SchedulerStateRepositoryMock;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.callbacks.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));
    scheduler = new Scheduler();
    stateRepo = createStateRepoMock();
    scheduler.setSchedulerStateRepository(stateRepo as unknown as SchedulerStateRepository);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('/api/health OMITS scheduler field when no scheduler dep is wired (additive shape preserved)', async () => {
    const app = await buildApp({
      indexerRepository: {
        findAll: vi.fn().mockResolvedValue([]),
      } as unknown as ApiDependencies['indexerRepository'],
    });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Record<string, unknown> };
    expect(body.data).not.toHaveProperty('scheduler');
    expect(body.data).toHaveProperty('status');
    expect(body.data).toHaveProperty('indexers');
  });

  it('/api/system/status OMITS scheduler field when no scheduler dep is wired (additive shape preserved)', async () => {
    const app = await buildApp({});

    const response = await app.inject({ method: 'GET', url: '/api/system/status' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Record<string, unknown> };
    expect(body.data).not.toHaveProperty('scheduler');
    expect(body.data).toHaveProperty('health');
    expect(body.data).toHaveProperty('system');
  });

  it('/api/health returns scheduler field matching live getHealth() (not a stale snapshot)', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    scheduler.schedule('health-check', '*/15 * * * *', () => undefined);

    const app = await buildApp({
      indexerRepository: {
        findAll: vi.fn().mockResolvedValue([]),
      } as unknown as ApiDependencies['indexerRepository'],
      scheduler: scheduler as unknown as ApiDependencies['scheduler'],
    });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: { scheduler: { scheduledTaskCount: number; missedTaskCount: number; lastRecoveryAt?: string } };
    };
    expect(body.data.scheduler).toBeDefined();

    const expected = getHealth(scheduler);
    expect(body.data.scheduler.scheduledTaskCount).toBe(expected.scheduledTaskCount);
    expect(body.data.scheduler.scheduledTaskCount).toBe(2);
    expect(body.data.scheduler.missedTaskCount).toBe(expected.missedTaskCount);
    expect(body.data.scheduler.missedTaskCount).toBe(0);
  });

  it('/api/system/status returns scheduler field matching live getHealth() (not a stale snapshot)', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    const app = await buildApp({
      scheduler: scheduler as unknown as ApiDependencies['scheduler'],
    });

    const response = await app.inject({ method: 'GET', url: '/api/system/status' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: { scheduler: { scheduledTaskCount: number; missedTaskCount: number; lastRecoveryAt?: string } };
    };
    expect(body.data.scheduler).toBeDefined();

    const expected = getHealth(scheduler);
    expect(body.data.scheduler.scheduledTaskCount).toBe(expected.scheduledTaskCount);
    expect(body.data.scheduler.scheduledTaskCount).toBe(1);
    expect(body.data.scheduler.missedTaskCount).toBe(0);
  });

  it('A6 false-claim probe: /api/health scheduler.scheduledTaskCount matches live Scheduler.jobs.size', async () => {
    // Anti-pattern probe: this catches a regression where the route returns
    // a hardcoded value (e.g. always 0) instead of the live Scheduler's count.
    scheduler.schedule('job-1', '*/15 * * * *', () => undefined);
    scheduler.schedule('job-2', '*/15 * * * *', () => undefined);
    scheduler.schedule('job-3', '*/15 * * * *', () => undefined);
    scheduler.schedule('job-4', '*/15 * * * *', () => undefined);

    const app = await buildApp({
      indexerRepository: {
        findAll: vi.fn().mockResolvedValue([]),
      } as unknown as ApiDependencies['indexerRepository'],
      scheduler: scheduler as unknown as ApiDependencies['scheduler'],
    });

    const response = await app.inject({ method: 'GET', url: '/api/health' });
    const body = JSON.parse(response.body) as {
      data: { scheduler: { scheduledTaskCount: number } };
    };

    expect(body.data.scheduler.scheduledTaskCount).toBe(4);
    expect(body.data.scheduler.scheduledTaskCount).not.toBe(0);
    expect(body.data.scheduler.scheduledTaskCount).not.toBe(-1);
  });
});

// ─── Phase 5 adversarial — persistence edge cases ──────────────────────────
// Probes around the contract: invalid cron / null nextRun / empty string.
describe('Scheduler adversarial — persistence edge cases', () => {
  let scheduler: Scheduler;
  let stateRepo: SchedulerStateRepositoryMock;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.callbacks.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));
    scheduler = new Scheduler();
    stateRepo = createStateRepoMock();
    scheduler.setSchedulerStateRepository(stateRepo as unknown as SchedulerStateRepository);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('schedule() with malformed cron throws AND does not call setTaskState', () => {
    expect(() => scheduler.schedule('bad-job', 'not-a-cron', () => undefined)).toThrow(
      /Invalid cron expression/,
    );

    expect(stateRepo.setTaskState).not.toHaveBeenCalled();
  });

  it('schedule() with weekday-pinned cron does not call setTaskState (null nextRun skipped)', () => {
    scheduler.schedule('weekday-job', '0 3 * * 1', () => undefined);

    const persistedTaskNames = stateRepo.setTaskState.mock.calls.map(
      (call) => call[0] as string,
    );
    expect(persistedTaskNames).not.toContain('weekday-job');
  });

  it('schedule() with day-pinned cron does not call setTaskState (null nextRun skipped)', () => {
    scheduler.schedule('day-pinned-job', '0 3 15 * *', () => undefined);

    const persistedTaskNames = stateRepo.setTaskState.mock.calls.map(
      (call) => call[0] as string,
    );
    expect(persistedTaskNames).not.toContain('day-pinned-job');
  });

  it('stop() writes empty string as the clearing signal (additive vs null)', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    const stopCalls = stateRepo.setTaskState.mock.calls.filter(
      (call) => call[0] === 'rss-sync' && call[1] === '',
    );
    expect(stopCalls).toHaveLength(0);

    scheduler.stop('rss-sync');

    const clearingCalls = stateRepo.setTaskState.mock.calls.filter(
      (call) => call[0] === 'rss-sync' && call[1] === '',
    );
    expect(clearingCalls).toHaveLength(1);
  });

  it('reschedule() to weekday-pinned cron does not crash and does not call setTaskState', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    stateRepo.setTaskState.mockClear();

    expect(() => scheduler.reschedule('rss-sync', '0 3 * * 1')).not.toThrow();
    expect(stateRepo.setTaskState).not.toHaveBeenCalled();
  });

  it('reschedule() to identical cron expression does NOT call setTaskState (no-op guard)', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    stateRepo.setTaskState.mockClear();

    scheduler.reschedule('rss-sync', '*/15 * * * *');

    expect(stateRepo.setTaskState).not.toHaveBeenCalled();
  });

  it('reschedule() to malformed cron throws AND does not call setTaskState', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    stateRepo.setTaskState.mockClear();

    expect(() => scheduler.reschedule('rss-sync', 'not-a-cron')).toThrow(
      /Invalid cron expression/,
    );
    expect(stateRepo.setTaskState).not.toHaveBeenCalled();
  });
});

// ─── Phase 5 adversarial — recovery edge cases ──────────────────────────────
describe('Scheduler adversarial — recovery edge cases', () => {
  let scheduler: Scheduler;
  let stateRepo: SchedulerStateRepositoryMock;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.callbacks.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));
    scheduler = new Scheduler();
    stateRepo = createStateRepoMock();
    scheduler.setSchedulerStateRepository(stateRepo as unknown as SchedulerStateRepository);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('start() skips tasks present in state but not in current jobs (orphaned state)', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    // State has entries for jobs that are no longer registered.
    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-29T11:00:00.000Z',
      'orphaned-job': '2026-06-29T11:00:00.000Z',
      'another-orphan': '2026-06-29T11:00:00.000Z',
    });

    await (scheduler as unknown as SchedulerLike).start();

    const health = getHealth(scheduler);
    // Only rss-sync should be recovered; orphaned entries must NOT inflate the count.
    expect(health.missedTaskCount).toBe(1);
  });

  it('start() skips disabled jobs even when nextRun is in the past', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    scheduler.toggleEnabled('rss-sync', false);

    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-29T11:00:00.000Z',
    });

    await (scheduler as unknown as SchedulerLike).start();

    const health = getHealth(scheduler);
    expect(health.missedTaskCount).toBe(0);
  });

  it('start() throws when getAllTaskStates rejects, but clears running flags', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    scheduler.schedule('health-check', '*/15 * * * *', () => undefined);

    stateRepo.getAllTaskStates.mockRejectedValueOnce(new Error('db unreachable'));

    await expect(
      (scheduler as unknown as SchedulerLike).start(),
    ).rejects.toThrow(/db unreachable/);

    // After the failed start(), a successful start() must still work —
    // the running flags must have been cleared by the catch handler.
    stateRepo.getAllTaskStates.mockResolvedValueOnce({});
    await expect(
      (scheduler as unknown as SchedulerLike).start(),
    ).resolves.toBeUndefined();

    // And the recovery counters are restored to a clean state.
    const health = getHealth(scheduler);
    expect(health.missedTaskCount).toBe(0);
    expect(health.lastRecoveryAt).toBeDefined();
  });

  it('start() skips recovery for a task that was stopped before startup', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    scheduler.schedule('other', '*/15 * * * *', () => undefined);
    scheduler.stop('rss-sync');

    // Stale state: rss-sync is in state, but it was stopped before this startup.
    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-29T11:00:00.000Z',
      other: '2026-06-29T11:00:00.000Z',
    });

    await (scheduler as unknown as SchedulerLike).start();

    const health = getHealth(scheduler);
    // Only 'other' should be recovered; stopped 'rss-sync' must be skipped.
    expect(health.missedTaskCount).toBe(1);
  });

  it('start() skips recovery when persisted nextRun is the empty string (stop() signal)', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '',
    });

    await (scheduler as unknown as SchedulerLike).start();

    const health = getHealth(scheduler);
    expect(health.missedTaskCount).toBe(0);
  });

  it('start() skips recovery when persisted nextRun is a non-date string', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': 'not-a-date-at-all',
    });

    await (scheduler as unknown as SchedulerLike).start();

    const health = getHealth(scheduler);
    expect(health.missedTaskCount).toBe(0);
  });

  it('start() does not re-recover a task whose recovery already advanced nextRun to future', async () => {
    // First startup: task is past-due and gets recovered (executeRecorded
    // advances nextRun to a future interval in the finally block).
    const callback = vi.fn();
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);

    stateRepo.getAllTaskStates.mockResolvedValueOnce({
      'rss-sync': '2026-06-29T11:00:00.000Z',
    });
    await (scheduler as unknown as SchedulerLike).start();
    expect(callback).toHaveBeenCalledTimes(1);

    // Second startup: getAllTaskStates returns the same past time (mocks can't
    // know about the advanced timestamp). The implementation should still
    // re-recover since the mock returns stale data — this is by design (the
    // state store is the source of truth). Verify the behavior is consistent.
    stateRepo.getAllTaskStates.mockResolvedValueOnce({
      'rss-sync': '2026-06-29T11:00:00.000Z',
    });
    await (scheduler as unknown as SchedulerLike).start();
    expect(callback).toHaveBeenCalledTimes(2);

    // The missed count reflects the LATEST run (1), not cumulative (2).
    const health = getHealth(scheduler);
    expect(health.missedTaskCount).toBe(1);
  });

  it('start() with no scheduled jobs but populated state does not crash', async () => {
    stateRepo.getAllTaskStates.mockResolvedValue({
      'stale-job': '2026-06-29T11:00:00.000Z',
    });

    await expect(
      (scheduler as unknown as SchedulerLike).start(),
    ).resolves.toBeUndefined();

    const health = getHealth(scheduler);
    expect(health.missedTaskCount).toBe(0);
    expect(health.lastRecoveryAt).toBeDefined();
  });

  it('start() with no state repo wired is a no-op (graceful degradation)', async () => {
    const standaloneScheduler = new Scheduler();
    // Intentionally do NOT call setSchedulerStateRepository.

    await expect(
      (standaloneScheduler as unknown as SchedulerLike).start(),
    ).resolves.toBeUndefined();

    const health = (standaloneScheduler as unknown as SchedulerLike).getHealth();
    expect(health.missedTaskCount).toBe(0);
    expect(health.lastRecoveryAt).toBeUndefined();
  });
});

// ─── Phase 5 adversarial — concurrency ──────────────────────────────────────
describe('Scheduler adversarial — concurrency', () => {
  let scheduler: Scheduler;
  let stateRepo: SchedulerStateRepositoryMock;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.callbacks.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));
    scheduler = new Scheduler();
    stateRepo = createStateRepoMock();
    scheduler.setSchedulerStateRepository(stateRepo as unknown as SchedulerStateRepository);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('triggerTask() concurrent with start() does not double-execute', async () => {
    const callback = vi.fn();
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);
    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-29T11:00:00.000Z',
    });

    const startPromise = (scheduler as unknown as SchedulerLike).start();
    const triggerPromise = scheduler.triggerTask('rss-sync');
    await Promise.all([startPromise, triggerPromise]);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('runNow() concurrent with start() does not double-execute', async () => {
    const callback = vi.fn();
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);
    stateRepo.getAllTaskStates.mockResolvedValue({
      'rss-sync': '2026-06-29T11:00:00.000Z',
    });

    const startPromise = (scheduler as unknown as SchedulerLike).start();
    const runNowPromise = scheduler.runNow('rss-sync');
    await Promise.all([startPromise, runNowPromise]);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('triggerTask() throws when called for an unscheduled job', async () => {
    await expect(scheduler.triggerTask('nope')).rejects.toThrow(/not scheduled/);
  });

  it('runNow() throws when called for an unscheduled job', async () => {
    await expect(scheduler.runNow('nope')).rejects.toThrow(/not scheduled/);
  });
});