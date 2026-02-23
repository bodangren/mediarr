import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerNotificationRoutes } from './notificationRoutes';
import type { ApiDependencies } from '../types';

function createRepositoryMock() {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    nameExists: vi.fn(),
  };
}

function createApp(mockRepo: ReturnType<typeof createRepositoryMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    notificationRepository: mockRepo,
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerNotificationRoutes(app, deps);
  return app;
}

describe('notificationRoutes', () => {
  let mockRepo: ReturnType<typeof createRepositoryMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    mockRepo = createRepositoryMock();
    app = createApp(mockRepo);
  });

  it('returns provider schema list with required providers', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/notifications/schema',
      payload: {},
    });
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body) as { data: Array<{ type: string }> };
    const types = body.data.map((item) => item.type);
    expect(types).toEqual(expect.arrayContaining(['discord', 'slack', 'telegram', 'email', 'webhook']));
  });

  it('supports notification CRUD and test endpoints', async () => {
    mockRepo.nameExists.mockResolvedValue(false);
    mockRepo.exists.mockResolvedValue(true);
    mockRepo.create.mockResolvedValue({
      id: 1,
      name: 'Discord Hook',
      type: 'discord',
      enabled: true,
      onGrab: true,
      onDownload: false,
      onUpgrade: false,
      onRename: false,
      onSeriesAdd: false,
      onEpisodeDelete: false,
      config: { webhookUrl: 'https://discord.com/api/webhooks/test' },
    });
    mockRepo.update.mockResolvedValue({
      id: 1,
      name: 'Discord Hook',
      type: 'discord',
      enabled: true,
      onGrab: true,
      onDownload: false,
      onUpgrade: false,
      onRename: false,
      onSeriesAdd: false,
      onEpisodeDelete: false,
      config: { webhookUrl: 'https://discord.com/api/webhooks/test' },
    });
    mockRepo.findById.mockResolvedValue({
      id: 1,
      name: 'Discord Hook',
      type: 'discord',
      enabled: true,
      onGrab: true,
      onDownload: false,
      onUpgrade: false,
      onRename: false,
      onSeriesAdd: false,
      onEpisodeDelete: false,
      config: { webhookUrl: 'https://discord.com/api/webhooks/test' },
    });
    mockRepo.delete.mockResolvedValue({ id: 1 });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/notifications',
      payload: {
        name: 'Discord Hook',
        type: 'discord',
        config: { webhookUrl: 'https://discord.com/api/webhooks/test' },
      },
    });
    expect(createResponse.statusCode).toBe(201);

    const updateResponse = await app.inject({
      method: 'PUT',
      url: '/api/notifications/1',
      payload: { name: 'Discord Hook' },
    });
    expect(updateResponse.statusCode).toBe(200);

    const testResponse = await app.inject({
      method: 'POST',
      url: '/api/notifications/1/test',
    });
    expect(testResponse.statusCode).toBe(200);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/notifications/1',
    });
    expect(deleteResponse.statusCode).toBe(200);
  });
});
