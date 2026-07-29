import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerNotificationRoutes } from './notificationRoutes';
import type { ApiDependencies } from '../types';
import type { ApiEventHub } from '../eventHub';

const notification = {
  id: 7,
  name: 'Household Telegram',
  type: 'telegram',
  enabled: true,
  onGrab: true,
  onDownload: false,
  onUpgrade: false,
  onRename: false,
  onSeriesAdd: false,
  onEpisodeDelete: false,
  config: { botToken: 'real-secret-token', chatId: 'household-chat' },
  createdAt: new Date('2026-07-29T00:00:00.000Z'),
  updatedAt: new Date('2026-07-29T00:00:00.000Z'),
};

function createApp(overrides: Record<string, unknown> = {}): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    ...overrides,
  } as ApiDependencies;

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerNotificationRoutes(app, deps);
  return app;
}

describe('notificationRoutes', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = createApp();
  });

  describe('GET /api/notifications/push-status', () => {
    it('returns push status with enabled=true and transport=sse', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/notifications/push-status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: { enabled: boolean; transport: string; connectedClients: number } };
      expect(body.data.enabled).toBe(true);
      expect(body.data.transport).toBe('sse');
      expect(typeof body.data.connectedClients).toBe('number');
    });

    it('returns connectedClients=0 when no eventHub is configured', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/notifications/push-status',
      });

      const body = JSON.parse(response.body) as { data: { connectedClients: number } };
      expect(body.data.connectedClients).toBe(0);
    });

    it('returns connectedClients from eventHub.clientCount when hub is provided', async () => {
      const mockHub = { clientCount: 3 } as Partial<ApiEventHub>;
      const appWithHub = createApp({ eventHub: mockHub });

      const response = await appWithHub.inject({
        method: 'GET',
        url: '/api/notifications/push-status',
      });

      const body = JSON.parse(response.body) as { data: { connectedClients: number } };
      expect(body.data.connectedClients).toBe(3);
    });
  });

  it('lists persisted notifications without exposing stored secrets', async () => {
    const findAll = vi.fn().mockResolvedValue([notification]);
    const appWithRepository = createApp({ notificationRepository: { findAll } });
    const response = await appWithRepository.inject({ method: 'GET', url: '/api/notifications' });

    expect(response.statusCode).toBe(200);
    expect(findAll).toHaveBeenCalledTimes(1);
    expect(response.json().data).toEqual([
      expect.objectContaining({
        id: 7,
        name: 'Household Telegram',
        config: { botToken: '********', chatId: 'household-chat' },
      }),
    ]);
  });

  it('creates a validated notification through the repository', async () => {
    const create = vi.fn().mockResolvedValue({
      ...notification,
      id: 8,
      name: 'Local Webhook',
      type: 'webhook',
      config: { url: 'http://127.0.0.1:9876/notify' },
    });
    const nameExists = vi.fn().mockResolvedValue(false);
    const appWithRepository = createApp({ notificationRepository: { create, nameExists } });
    const response = await appWithRepository.inject({
      method: 'POST',
      url: '/api/notifications',
      payload: {
        name: 'Local Webhook',
        type: 'webhook',
        enabled: true,
        onGrab: true,
        onDownload: false,
        onUpgrade: false,
        onRename: false,
        onSeriesAdd: false,
        onEpisodeDelete: false,
        config: { url: 'http://127.0.0.1:9876/notify' },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Local Webhook',
      type: 'webhook',
      config: { url: 'http://127.0.0.1:9876/notify' },
    }));
  });

  it('preserves a masked secret while updating other Telegram settings', async () => {
    const findById = vi.fn().mockResolvedValue(notification);
    const update = vi.fn().mockResolvedValue({
      ...notification,
      config: { botToken: 'real-secret-token', chatId: 'new-chat' },
    });
    const nameExists = vi.fn().mockResolvedValue(false);
    const appWithRepository = createApp({ notificationRepository: { findById, update, nameExists } });
    const response = await appWithRepository.inject({
      method: 'PUT',
      url: '/api/notifications/7',
      payload: {
        name: notification.name,
        type: 'telegram',
        enabled: true,
        config: { botToken: '********', chatId: 'new-chat' },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(update).toHaveBeenCalledWith(7, expect.objectContaining({
      config: { botToken: 'real-secret-token', chatId: 'new-chat' },
    }));
    expect(response.json().data.config.botToken).toBe('********');
  });

  it('deletes an existing notification', async () => {
    const findById = vi.fn().mockResolvedValue(notification);
    const remove = vi.fn().mockResolvedValue(notification);
    const appWithRepository = createApp({ notificationRepository: { findById, delete: remove } });
    const response = await appWithRepository.inject({ method: 'DELETE', url: '/api/notifications/7' });

    expect(response.statusCode).toBe(200);
    expect(remove).toHaveBeenCalledWith(7);
    expect(response.json().data).toEqual({ id: 7 });
  });

  it('tests a saved notification through the production transport registry', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const getTransport = vi.fn().mockReturnValue({ send });
    const findById = vi.fn().mockResolvedValue(notification);
    const appWithRepository = createApp({
      notificationRepository: { findById },
      notificationTransportRegistry: { getTransport },
    });
    const response = await appWithRepository.inject({ method: 'POST', url: '/api/notifications/7/test' });

    expect(response.statusCode).toBe(200);
    expect(getTransport).toHaveBeenCalledWith('telegram');
    expect(send).toHaveBeenCalledWith(
      notification,
      expect.objectContaining({ type: 'health', title: 'Mediarr notification test' }),
    );
    expect(response.json().data).toEqual({
      success: true,
      message: 'Test notification sent successfully.',
    });
  });

  it('returns the real transport failure from a draft test', async () => {
    const send = vi.fn().mockRejectedValue(new Error('Local receiver returned HTTP 503'));
    const getTransport = vi.fn().mockReturnValue({ send });
    const appWithRegistry = createApp({ notificationTransportRegistry: { getTransport } });
    const response = await appWithRegistry.inject({
      method: 'POST',
      url: '/api/notifications/test',
      payload: {
        type: 'webhook',
        config: { url: 'http://127.0.0.1:9876/notify' },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      success: false,
      message: 'Local receiver returned HTTP 503',
    });
  });
});
