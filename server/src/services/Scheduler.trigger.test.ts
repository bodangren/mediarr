import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { Scheduler, type TaskExecutionsRepository } from './Scheduler';

// Spy on node-cron so scheduled tasks don't actually fire during tests.
// Captures the callback registered for every schedule() call so trigger /
// hot-reload tests can invoke the wrapped callback synchronously and assert
// what node-cron would have done on a real tick.
const cronSpy = vi.hoisted(() => {
  const tasks: Array<{ stop: ReturnType<typeof vi.fn> }> = [];
  const callbacks: Array<() => Promise<void>> = [];
  return {
    scheduleMock: vi.fn((_expr: string, cb: () => Promise<void>) => {
      const task = { stop: vi.fn() };
      tasks.push(task);
      callbacks.push(cb);
      return task;
    }),
    validateMock: vi.fn((expr: string) => /^\S+ \S+ \S+ \S+ \S+/.test(expr)),
    tasks,
    callbacks,
  };
});

vi.mock('node-cron', () => ({
  schedule: cronSpy.scheduleMock,
  validate: cronSpy.validateMock,
}));

interface TaskExecutionsRepositoryMock {
  create: MockedFunction<TaskExecutionsRepository['create']>;
  update: MockedFunction<TaskExecutionsRepository['update']>;
  prune: MockedFunction<TaskExecutionsRepository['prune']>;
}

function createRepoMock(): TaskExecutionsRepositoryMock {
  return {
    create: vi.fn(),
    update: vi.fn(),
    prune: vi.fn(),
  };
}

function createSchedulerWithRepo(): Scheduler {
  const scheduler = new Scheduler();
  // Green-phase contract: Scheduler exposes a setter for the
  // taskExecutionsRepository collaborator. The setter is what the trigger
  // path and the wrap-with-recording path both depend on. At HEAD this
  // method does not exist, so every test below fails on this line.
  scheduler.setTaskExecutionsRepository(createRepoMock());
  return scheduler;
}

describe('Scheduler.triggerTask()', () => {
  let scheduler: Scheduler;
  let repo: TaskExecutionsRepositoryMock;
  let errorSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.tasks.length = 0;
    cronSpy.callbacks.length = 0;
    // The errorSpy is set up before the setter call so that even if the
    // setter throws (which is the entire Red contract), the afterEach hook
    // can clean up the spy without cascading a second TypeError.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    scheduler = createSchedulerWithRepo();
    repo = (scheduler as unknown as { taskExecutionsRepository: TaskExecutionsRepositoryMock })
      .taskExecutionsRepository;
  });

  afterEach(() => {
    errorSpy?.mockRestore();
  });

  it('creates a RUNNING taskExecution record before invoking the job', async () => {
    repo.create.mockResolvedValue({ id: 99 });
    repo.update.mockResolvedValue(undefined);
    const callback = vi.fn().mockResolvedValue(undefined);
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);

    await scheduler.triggerTask('rss-sync');

    expect(repo.create).toHaveBeenCalledTimes(1);
    const createArg = repo.create.mock.calls[0]?.[0] as {
      taskName: string;
      status: string;
    };
    expect(createArg.taskName).toBe('rss-sync');
    expect(createArg.status).toBe('RUNNING');
  });

  it('updates the taskExecution record to SUCCESS with duration on a successful callback', async () => {
    repo.create.mockResolvedValue({ id: 100 });
    repo.update.mockResolvedValue(undefined);
    const callback = vi.fn().mockResolvedValue(undefined);
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);

    await scheduler.triggerTask('rss-sync');

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updateArgs = repo.update.mock.calls[0] as [number, {
      status: string;
      completedAt: Date;
      durationMs: number;
      errorMessage: string | null;
    }];
    expect(updateArgs[0]).toBe(100);
    expect(updateArgs[1].status).toBe('SUCCESS');
    expect(updateArgs[1].completedAt).toBeInstanceOf(Date);
    expect(typeof updateArgs[1].durationMs).toBe('number');
    expect(updateArgs[1].durationMs).toBeGreaterThanOrEqual(0);
    expect(updateArgs[1].errorMessage).toBeNull();
  });

  it('returns false without recording when the job is disabled', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);
    await scheduler.toggleEnabled('rss-sync', false);

    await expect(scheduler.triggerTask('rss-sync')).resolves.toBe(false);

    expect(callback).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns false without double-recording when the job is already running', async () => {
    repo.create.mockResolvedValue({ id: 104 });
    repo.update.mockResolvedValue(undefined);
    let release: (() => void) | undefined;
    const callback = vi.fn().mockImplementation(() => new Promise<void>(resolve => {
      release = resolve;
    }));
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);

    const first = scheduler.triggerTask('rss-sync');
    await vi.waitFor(() => expect(callback).toHaveBeenCalledOnce());
    await expect(scheduler.triggerTask('rss-sync')).resolves.toBe(false);
    release?.();
    await expect(first).resolves.toBe(true);

    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('updates the taskExecution record to FAILED with the error message when the callback throws', async () => {
    repo.create.mockResolvedValue({ id: 101 });
    repo.update.mockResolvedValue(undefined);
    const boom = new Error('upstream 500');
    const callback = vi.fn().mockRejectedValue(boom);
    scheduler.schedule('flaky-job', '*/5 * * * *', callback);

    await expect(scheduler.triggerTask('flaky-job')).rejects.toThrow(/upstream 500/);

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updateArgs = repo.update.mock.calls[0] as [number, {
      status: string;
      completedAt: Date;
      durationMs: number;
      errorMessage: string;
    }];
    expect(updateArgs[0]).toBe(101);
    expect(updateArgs[1].status).toBe('FAILED');
    expect(updateArgs[1].errorMessage).toContain('upstream 500');
    expect(updateArgs[1].completedAt).toBeInstanceOf(Date);
  });

  it('updates job metadata so listJobsMeta reflects the manual run', async () => {
    repo.create.mockResolvedValue({ id: 102 });
    repo.update.mockResolvedValue(undefined);
    const callback = vi.fn().mockResolvedValue(undefined);
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);

    await scheduler.triggerTask('rss-sync');

    const meta = scheduler.listJobsMeta().find((m) => m.name === 'rss-sync');
    expect(meta?.lastRunAt).not.toBeNull();
    expect(typeof meta?.lastDurationMs).toBe('number');
    expect(meta?.lastDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('prunes old executions after a successful manual trigger', async () => {
    repo.create.mockResolvedValue({ id: 103 });
    repo.update.mockResolvedValue(undefined);
    repo.prune.mockResolvedValue(5);
    const callback = vi.fn().mockResolvedValue(undefined);
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);

    await scheduler.triggerTask('rss-sync');

    expect(repo.prune).toHaveBeenCalledTimes(1);
    const pruneArgs = repo.prune.mock.calls[0] as [string, number];
    expect(pruneArgs[0]).toBe('rss-sync');
    expect(pruneArgs[1]).toBe(100);
  });

  it('throws when the job is not scheduled and does not write a taskExecution record', async () => {
    await expect(scheduler.triggerTask('never-registered')).rejects.toThrow(
      /not scheduled/i,
    );
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('Scheduler.reschedule() — hot reload without restart', () => {
  let scheduler: Scheduler;
  let errorSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.tasks.length = 0;
    cronSpy.callbacks.length = 0;
    scheduler = new Scheduler();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy?.mockRestore();
  });

  it('stops the old cron task and schedules a new one with the updated expression', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    const oldTask = cronSpy.tasks[0];
    expect(oldTask).toBeDefined();
    expect(cronSpy.scheduleMock).toHaveBeenCalledTimes(1);

    scheduler.reschedule('rss-sync', '*/30 * * * *');

    expect(oldTask?.stop).toHaveBeenCalledTimes(1);
    expect(cronSpy.scheduleMock).toHaveBeenCalledTimes(2);
    const secondCall = cronSpy.scheduleMock.mock.calls[1];
    expect(secondCall?.[0]).toBe('*/30 * * * *');
    expect(typeof secondCall?.[1]).toBe('function');
  });

  it('reflects the updated expression in listJobsMeta immediately', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    scheduler.reschedule('rss-sync', '*/30 * * * *');
    const meta = scheduler.listJobsMeta().find((m) => m.name === 'rss-sync');
    expect(meta?.cronExpression).toBe('*/30 * * * *');
  });

  it('rejects an invalid cron expression without stopping the old task', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    const oldTask = cronSpy.tasks[0];
    expect(oldTask).toBeDefined();
    expect(cronSpy.scheduleMock).toHaveBeenCalledTimes(1);

    expect(() => scheduler.reschedule('rss-sync', 'not-a-cron')).toThrow(
      /Invalid cron expression/i,
    );
    expect(oldTask?.stop).not.toHaveBeenCalled();
    expect(cronSpy.scheduleMock).toHaveBeenCalledTimes(1);

    const meta = scheduler.listJobsMeta().find((m) => m.name === 'rss-sync');
    expect(meta?.cronExpression).toBe('*/15 * * * *');
  });

  it('throws when rescheduling a job that is not registered', () => {
    expect(() => scheduler.reschedule('never-registered', '*/15 * * * *')).toThrow(
      /not scheduled/i,
    );
  });

  it('preserves the wrapped callback after reschedule (the new cron tick still fires the original job)', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    scheduler.schedule('rss-sync', '*/15 * * * *', callback);
    scheduler.reschedule('rss-sync', '*/30 * * * *');

    // The most recent cronSchedule call captured the wrapped callback that
    // closes over the original job. Invoking it proves the reschedule kept
    // the job alive without a process restart.
    const newWrapped = cronSpy.callbacks[1]!;
    expect(newWrapped).toBeTypeOf('function');
    await newWrapped();
    expect(callback).toHaveBeenCalledTimes(1);
    const meta = scheduler.listJobsMeta().find((m) => m.name === 'rss-sync');
    expect(meta?.lastRunAt).not.toBeNull();
  });

  it('is a no-op when rescheduling with the same expression (no stop, no new schedule)', () => {
    // Hot-reload edge case from test-strategy.md §3: same expression must
    // not churn the underlying cron task. At HEAD the implementation always
    // calls job.task.stop() and cronSchedule() unconditionally, so this
    // assertion fails — Phase 4 Green must add an early return when the new
    // expression equals the existing one.
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    const oldTask = cronSpy.tasks[0];
    expect(oldTask).toBeDefined();
    expect(cronSpy.scheduleMock).toHaveBeenCalledTimes(1);

    scheduler.reschedule('rss-sync', '*/15 * * * *');

    expect(oldTask?.stop).not.toHaveBeenCalled();
    expect(cronSpy.scheduleMock).toHaveBeenCalledTimes(1);
    const meta = scheduler.listJobsMeta().find((m) => m.name === 'rss-sync');
    expect(meta?.cronExpression).toBe('*/15 * * * *');
  });
});
