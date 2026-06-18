import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Scheduler } from './Scheduler';

// Spy on node-cron so scheduled tasks don't actually fire during tests.
// The captured callbacks let the wrap-with-recording tests invoke the
// scheduler-installed wrapper synchronously, which is what node-cron would
// have done on a real tick.
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
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  prune: ReturnType<typeof vi.fn>;
}

function createRepoMock(): TaskExecutionsRepositoryMock {
  return {
    create: vi.fn(),
    update: vi.fn(),
    prune: vi.fn(),
  };
}

function createSchedulerWithRepo() {
  const scheduler = new Scheduler();
  // Green-phase contract: Scheduler exposes a setter for the
  // taskExecutionsRepository collaborator. The wrap-with-recording path
  // depends on the repository being wired before any job is scheduled. At
  // HEAD this method does not exist, so every test below fails on this line.
  scheduler.setTaskExecutionsRepository(createRepoMock());
  return scheduler;
}

describe('Scheduler wrap-with-recording (cron fire path)', () => {
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

  it('writes a RUNNING taskExecution record when the cron tick fires the wrapped callback', async () => {
    repo.create.mockResolvedValue({ id: 1 });
    repo.update.mockResolvedValue(undefined);
    scheduler.schedule('rss-sync', '*/15 * * * *', async () => undefined);

    const wrapped = cronSpy.callbacks[0];
    expect(wrapped).toBeTypeOf('function');
    await wrapped();

    expect(repo.create).toHaveBeenCalledTimes(1);
    const createArg = repo.create.mock.calls[0]?.[0] as {
      taskName: string;
      status: string;
      startedAt: Date;
    };
    expect(createArg.taskName).toBe('rss-sync');
    expect(createArg.status).toBe('RUNNING');
    expect(createArg.startedAt).toBeInstanceOf(Date);
  });

  it('updates the taskExecution record to SUCCESS with duration when the cron callback resolves', async () => {
    repo.create.mockResolvedValue({ id: 2 });
    repo.update.mockResolvedValue(undefined);
    scheduler.schedule('rss-sync', '*/15 * * * *', async () => undefined);

    const wrapped = cronSpy.callbacks[0]!;
    await wrapped();

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updateArgs = repo.update.mock.calls[0] as [number, {
      status: string;
      completedAt: Date;
      durationMs: number;
      errorMessage: string | null;
    }];
    expect(updateArgs[0]).toBe(2);
    expect(updateArgs[1].status).toBe('SUCCESS');
    expect(updateArgs[1].completedAt).toBeInstanceOf(Date);
    expect(typeof updateArgs[1].durationMs).toBe('number');
    expect(updateArgs[1].durationMs).toBeGreaterThanOrEqual(0);
    expect(updateArgs[1].errorMessage).toBeNull();
  });

  it('updates the taskExecution record to FAILED with errorMessage when the cron callback throws', async () => {
    repo.create.mockResolvedValue({ id: 3 });
    repo.update.mockResolvedValue(undefined);
    const boom = new Error('rss parse failed');
    scheduler.schedule('rss-sync', '*/15 * * * *', async () => {
      throw boom;
    });

    const wrapped = cronSpy.callbacks[0]!;
    await wrapped();

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updateArgs = repo.update.mock.calls[0] as [number, {
      status: string;
      completedAt: Date;
      durationMs: number;
      errorMessage: string;
    }];
    expect(updateArgs[0]).toBe(3);
    expect(updateArgs[1].status).toBe('FAILED');
    expect(updateArgs[1].errorMessage).toContain('rss parse failed');
    expect(updateArgs[1].completedAt).toBeInstanceOf(Date);
  });
});

describe('Scheduler.pruneTaskExecutions() — retain last 100 records per task', () => {
  let scheduler: Scheduler;
  let repo: TaskExecutionsRepositoryMock;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.tasks.length = 0;
    cronSpy.callbacks.length = 0;
    scheduler = createSchedulerWithRepo();
    repo = (scheduler as unknown as { taskExecutionsRepository: TaskExecutionsRepositoryMock })
      .taskExecutionsRepository;
  });

  it('calls the repository prune method with the task name and default retain count of 100', async () => {
    repo.prune.mockResolvedValue(7);

    const deleted = await scheduler.pruneTaskExecutions('rss-sync');

    expect(repo.prune).toHaveBeenCalledTimes(1);
    const pruneArgs = repo.prune.mock.calls[0] as [string, number];
    expect(pruneArgs[0]).toBe('rss-sync');
    expect(pruneArgs[1]).toBe(100);
    expect(deleted).toBe(7);
  });

  it('forwards a custom retain count to the repository prune method', async () => {
    repo.prune.mockResolvedValue(0);

    await scheduler.pruneTaskExecutions('wanted-search', 50);

    const pruneArgs = repo.prune.mock.calls[0] as [string, number];
    expect(pruneArgs[0]).toBe('wanted-search');
    expect(pruneArgs[1]).toBe(50);
  });

  it('returns the number of records the repository reports as deleted', async () => {
    repo.prune.mockResolvedValue(42);

    const deleted = await scheduler.pruneTaskExecutions('rss-sync');

    expect(deleted).toBe(42);
  });
});
