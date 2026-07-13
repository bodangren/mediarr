import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerSchedulerRoutes } from './schedulerRoutes';

function createSchedulerMock() {
  return {
    listJobsMeta: vi.fn(),
    runNow: vi.fn(),
    triggerTask: vi.fn(),
    isScheduled: vi.fn(),
    reschedule: vi.fn(),
    toggleEnabled: vi.fn(),
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
    update: vi.fn(),
    prune: vi.fn(),
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
  // accept at least these three collaborators plus a `toggleEnabled` method
  // on the scheduler mock.
  registerSchedulerRoutes(app, {
    scheduler,
    settingsService,
    taskExecutionsRepository,
  } as never);
  return app;
}

interface ToggleResponseBody {
  ok?: boolean;
  data?: { taskId?: string; enabled?: boolean; status?: string };
  error?: { code?: string; message?: string; retryable?: boolean };
}

describe('PUT /api/scheduler/:taskId/toggle', () => {
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

  it('is registered in Fastify (returns the route-handler 404 envelope, not the framework-default 404, for an unknown taskId)', async () => {
    scheduler.isScheduled.mockReturnValue(false);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/does-not-exist/toggle',
      payload: { enabled: true },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body) as ToggleResponseBody;
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('NOT_FOUND');
    expect(body.error?.retryable).toBe(false);
    // Critical: this is the assertion that proves the route handler ran (vs.
    // Fastify's framework-default 404 producing the same envelope via the
    // global error handler). When the route is not registered, isScheduled
    // is never called.
    expect(scheduler.isScheduled).toHaveBeenCalledWith('does-not-exist');
  });

  it('returns 200 and delegates to scheduler.toggleEnabled for a known task with enabled=true', async () => {
    scheduler.isScheduled.mockReturnValue(true);
    scheduler.toggleEnabled.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/rss-sync/toggle',
      payload: { enabled: true },
    });

    expect(response.statusCode).toBe(200);
    expect(scheduler.toggleEnabled).toHaveBeenCalledWith('rss-sync', true);
    const body = JSON.parse(response.body) as ToggleResponseBody;
    expect(body.ok).toBe(true);
    expect(body.data?.taskId).toBe('rss-sync');
    expect(body.data?.enabled).toBe(true);
  });

  it('returns 200 and emits the disabled status when enabled=false is persisted', async () => {
    scheduler.isScheduled.mockReturnValue(true);
    scheduler.toggleEnabled.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/wanted-search/toggle',
      payload: { enabled: false },
    });

    expect(response.statusCode).toBe(200);
    expect(scheduler.toggleEnabled).toHaveBeenCalledWith('wanted-search', false);
    const body = JSON.parse(response.body) as ToggleResponseBody;
    expect(body.ok).toBe(true);
    expect(body.data?.enabled).toBe(false);
    expect(body.data?.status).toBe('disabled');
  });

  it('does not return success when enabled-state persistence fails', async () => {
    scheduler.isScheduled.mockReturnValue(true);
    scheduler.toggleEnabled.mockRejectedValue(new Error('database is read-only'));

    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/rss-sync/toggle',
      payload: { enabled: false },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body) as ToggleResponseBody;
    expect(body.ok).toBe(false);
    expect(body.error?.message).toContain('database is read-only');
  });

  it('returns 422 for an empty body (missing enabled field) and does not invoke the scheduler', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/rss-sync/toggle',
      payload: {},
    });

    expect(response.statusCode).toBe(422);
    expect(scheduler.toggleEnabled).not.toHaveBeenCalled();
    const body = JSON.parse(response.body) as ToggleResponseBody;
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for a non-boolean enabled field and does not invoke the scheduler', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/rss-sync/toggle',
      payload: { enabled: 'not-a-boolean' },
    });

    expect(response.statusCode).toBe(422);
    expect(scheduler.toggleEnabled).not.toHaveBeenCalled();
  });

  it('does not invoke scheduler.toggleEnabled for an unknown taskId (404 short-circuits before persistence)', async () => {
    scheduler.isScheduled.mockReturnValue(false);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/scheduler/never-registered/toggle',
      payload: { enabled: true },
    });

    expect(response.statusCode).toBe(404);
    expect(scheduler.toggleEnabled).not.toHaveBeenCalled();
    // Critical: this proves the route handler ran. When the route is not
    // registered, isScheduled is never called.
    expect(scheduler.isScheduled).toHaveBeenCalledWith('never-registered');
  });
});
