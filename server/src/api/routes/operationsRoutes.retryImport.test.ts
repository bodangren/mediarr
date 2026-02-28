import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerOperationsRoutes } from './operationsRoutes';

function createImportManagerMock() {
  return {
    retryImportByActivityEventId: vi.fn().mockResolvedValue(undefined),
  };
}

function createApp(importManager?: ReturnType<typeof createImportManagerMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    ...(importManager ? { importManager } : {}),
  };
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerOperationsRoutes(app, deps);
  return app;
}

describe('operationsRoutes — POST /api/activity/:id/retry-import', () => {
  let importManager: ReturnType<typeof createImportManagerMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    importManager = createImportManagerMock();
    app = createApp(importManager);
  });

  it('retries import for the provided activity event id', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/activity/175/retry-import',
    });

    expect(response.statusCode).toBe(200);
    expect(importManager.retryImportByActivityEventId).toHaveBeenCalledWith(175);
    const body = JSON.parse(response.body) as { data: { id: number; retried: boolean } };
    expect(body.data).toEqual({ id: 175, retried: true });
  });

  it('returns validation error when import manager is not configured', async () => {
    const appWithoutManager = createApp();
    const response = await appWithoutManager.inject({
      method: 'POST',
      url: '/api/activity/175/retry-import',
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });
});
