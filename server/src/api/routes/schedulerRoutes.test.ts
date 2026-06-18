import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerSchedulerRoutes } from './schedulerRoutes';

function createSchedulerMock() {
  return {
    listJobsMeta: vi.fn(),
    runNow: vi.fn(),
    isScheduled: vi.fn(),
    reschedule: vi.fn(),
  };
}

function createSettingsServiceMock() {
  return {
    get: vi.fn(),
    update: vi.fn(),
  };
}

function createTaskExecutionsRepositoryMock() {
  return {
    create: vi.fn(),
    query: vi.fn(),
  };
}

type SchedulerMock = ReturnType<typeof createSchedulerMock>;
type SettingsServiceMock = ReturnType<typeof createSettingsServiceMock>;
type TaskExecutionsRepositoryMock = ReturnType<typeof createTaskExecutionsRepositoryMock>;

function createApp(
  scheduler: SchedulerMock,
  settingsService: SettingsServiceMock,
  taskExecutionsRepository: TaskExecutionsRepositoryMock,
): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) =>
    registerApiErrorHandler(request, reply, error),
  );
  // The Green-phase implementation will narrow the deps shape; the route must
  // accept at least these three collaborators.
  registerSchedulerRoutes(app, {
    scheduler,
    settingsService,
    taskExecutionsRepository,
  } as never);
  return app;
}

describe('GET /api/scheduler/tasks', () => {
  let scheduler: SchedulerMock;
  let settingsService: SettingsServiceMock;
  let taskExecutionsRepository: TaskExecutionsRepositoryMock;
  let app: FastifyInstance;

  beforeEach(() => {
    scheduler = createSchedulerMock();
    settingsService = createSettingsServiceMock();
    taskExecutionsRepository = createTaskExecutionsRepositoryMock();
    app = createApp(scheduler, settingsService, taskExecutionsRepository);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with the live scheduler job metadata as the data payload', async () => {
    scheduler.listJobsMeta.mockReturnValue([
      {
        name: 'rss-sync',
        cronExpression: '*/15 * * * *',
        lastRunAt: '2026-05-24T12:00:00.000Z',
        lastDurationMs: 1234,
        nextRunAt: '2026-05-24T12:15:00.000Z',
      },
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/scheduler/tasks' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      ok: boolean;
      data: Array<Record<string, unknown>>;
    };
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: 'rss-sync',
      taskName: 'rss-sync',
      cronExpression: '*/15 * * * *',
    });
    expect(scheduler.listJobsMeta).toHaveBeenCalledTimes(1);
  });

  it('returns an empty array (200) when no jobs are registered', async () => {
    scheduler.listJobsMeta.mockReturnValue([]);

    const response = await app.inject({ method: 'GET', url: '/api/scheduler/tasks' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(body.data).toEqual([]);
  });
});

describe('PUT /api/scheduler/:taskId/interval', () => {
  let scheduler: SchedulerMock;
  let settingsService: SettingsServiceMock;
  let taskExecutionsRepository: TaskExecutionsRepositoryMock;
  let app: FastifyInstance;

  beforeEach(() => {
    scheduler = createSchedulerMock();
    settingsService = createSettingsServiceMock();
    taskExecutionsRepository = createTaskExecutionsRepositoryMock();
    app = createApp(scheduler, settingsService, taskExecutionsRepository);
  });

  afterEach(async () => {
    await app.close();
  });

  it('persists the cron to AppSettings and reschedules the live job for a valid expression', async () => {
    scheduler.isScheduled.mockReturnValue(true);
    scheduler.reschedule.mockReturnValue(undefined);
    settingsService.update.mockResolvedValue({
      schedulerIntervals: {
        rssSyncMinutes: 30,
        availabilityCheckMinutes: 30,
        torrentMonitoringSeconds: 5,
        wantedSearchMinutes: 60,
      },
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/rss-sync/interval',
      payload: { cronExpression: '*/30 * * * *' },
    });

    expect(response.statusCode).toBe(200);
    expect(scheduler.reschedule).toHaveBeenCalledWith('rss-sync', '*/30 * * * *');
    expect(settingsService.update).toHaveBeenCalledTimes(1);
    expect(scheduler.isScheduled).toHaveBeenCalledWith('rss-sync');
  });

  it('returns 422 for an invalid cron expression without mutating settings or rescheduling', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/rss-sync/interval',
      payload: { cronExpression: 'not-a-cron' },
    });

    expect(response.statusCode).toBe(422);
    expect(scheduler.reschedule).not.toHaveBeenCalled();
    expect(settingsService.update).not.toHaveBeenCalled();
  });

  it('returns 422 when the body omits cronExpression', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/rss-sync/interval',
      payload: {},
    });

    expect(response.statusCode).toBe(422);
    expect(scheduler.reschedule).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown taskId without mutating settings or rescheduling', async () => {
    scheduler.isScheduled.mockReturnValue(false);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/does-not-exist/interval',
      payload: { cronExpression: '*/30 * * * *' },
    });

    expect(response.statusCode).toBe(404);
    expect(scheduler.reschedule).not.toHaveBeenCalled();
    expect(settingsService.update).not.toHaveBeenCalled();
  });
});

describe('POST /api/scheduler/:taskId/trigger', () => {
  let scheduler: SchedulerMock;
  let settingsService: SettingsServiceMock;
  let taskExecutionsRepository: TaskExecutionsRepositoryMock;
  let app: FastifyInstance;

  beforeEach(() => {
    scheduler = createSchedulerMock();
    settingsService = createSettingsServiceMock();
    taskExecutionsRepository = createTaskExecutionsRepositoryMock();
    scheduler.isScheduled.mockReturnValue(true);
    scheduler.runNow.mockResolvedValue(undefined);
    taskExecutionsRepository.create.mockResolvedValue({
      id: 42,
      taskName: 'rss-sync',
      startedAt: new Date('2026-05-24T12:00:00Z'),
      completedAt: null,
      status: 'RUNNING',
      durationMs: null,
      errorMessage: null,
    });
    app = createApp(scheduler, settingsService, taskExecutionsRepository);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 202 with the new executionId and writes a RUNNING execution record', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/scheduler/rss-sync/trigger',
    });

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body) as {
      data: { taskId: string; executionId: number };
    };
    expect(body.data.taskId).toBe('rss-sync');
    expect(body.data.executionId).toBe(42);
    expect(taskExecutionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        taskName: 'rss-sync',
        status: 'RUNNING',
      }),
    );
  });

  it('invokes scheduler.runNow with the task name', async () => {
    await app.inject({ method: 'POST', url: '/api/scheduler/rss-sync/trigger' });
    expect(scheduler.runNow).toHaveBeenCalledWith('rss-sync');
  });

  it('returns 404 for an unknown taskId and does not write an execution record', async () => {
    scheduler.isScheduled.mockReturnValue(false);

    const response = await app.inject({
      method: 'POST',
      url: '/api/scheduler/does-not-exist/trigger',
    });

    expect(response.statusCode).toBe(404);
    expect(scheduler.runNow).not.toHaveBeenCalled();
    expect(taskExecutionsRepository.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/scheduler/history', () => {
  let scheduler: SchedulerMock;
  let settingsService: SettingsServiceMock;
  let taskExecutionsRepository: TaskExecutionsRepositoryMock;
  let app: FastifyInstance;

  beforeEach(() => {
    scheduler = createSchedulerMock();
    settingsService = createSettingsServiceMock();
    taskExecutionsRepository = createTaskExecutionsRepositoryMock();
    app = createApp(scheduler, settingsService, taskExecutionsRepository);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with a paginated envelope when no executions exist', async () => {
    taskExecutionsRepository.query.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });

    const response = await app.inject({ method: 'GET', url: '/api/scheduler/history' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: unknown[];
      meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
    };
    expect(body.data).toEqual([]);
    expect(body.meta).toMatchObject({ page: 1, pageSize: 25, totalCount: 0, totalPages: 0 });
    expect(taskExecutionsRepository.query).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 25 }),
    );
  });

  it('returns the repo rows in the order the repository returns them (startedAt desc by default)', async () => {
    taskExecutionsRepository.query.mockResolvedValue({
      items: [
        {
          id: 2,
          taskName: 'rss-sync',
          status: 'SUCCESS',
          startedAt: new Date('2026-05-24T12:30:00Z'),
          completedAt: new Date('2026-05-24T12:30:01Z'),
          durationMs: 1000,
          errorMessage: null,
        },
        {
          id: 1,
          taskName: 'rss-sync',
          status: 'FAILED',
          startedAt: new Date('2026-05-24T12:00:00Z'),
          completedAt: new Date('2026-05-24T12:00:05Z'),
          durationMs: 5000,
          errorMessage: 'upstream timeout',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 25,
    });

    const response = await app.inject({ method: 'GET', url: '/api/scheduler/history' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: Array<{ id: number; status: string }>;
      meta: { totalCount: number; totalPages: number };
    };
    expect(body.data.map((d) => d.id)).toEqual([2, 1]);
    expect(body.meta.totalCount).toBe(2);
    expect(body.meta.totalPages).toBe(1);
  });

  it('forwards the status filter to the repository when ?status=success', async () => {
    taskExecutionsRepository.query.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });

    await app.inject({ method: 'GET', url: '/api/scheduler/history?status=success' });

    expect(taskExecutionsRepository.query).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' }),
    );
  });

  it('forwards pagination params (page, pageSize) to the repository', async () => {
    taskExecutionsRepository.query.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 10,
    });

    await app.inject({ method: 'GET', url: '/api/scheduler/history?page=2&pageSize=10' });

    expect(taskExecutionsRepository.query).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 10 }),
    );
  });

  it('returns 422 when status is not one of success/failed/running', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/scheduler/history?status=bogus',
    });

    expect(response.statusCode).toBe(422);
    expect(taskExecutionsRepository.query).not.toHaveBeenCalled();
  });
});
