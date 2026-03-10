import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerNotificationRoutes } from './notificationRoutes';
import type { ApiDependencies } from '../types';
import type { ApiEventHub } from '../eventHub';

function createApp(hub?: Partial<ApiEventHub>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    eventHub: hub as ApiEventHub | undefined,
  };

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
      const appWithHub = createApp(mockHub);

      const response = await appWithHub.inject({
        method: 'GET',
        url: '/api/notifications/push-status',
      });

      const body = JSON.parse(response.body) as { data: { connectedClients: number } };
      expect(body.data.connectedClients).toBe(3);
    });
  });
});
