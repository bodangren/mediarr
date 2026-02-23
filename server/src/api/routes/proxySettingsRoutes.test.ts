import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerProxySettingsRoutes } from './proxySettingsRoutes';

function createProxyModelMock() {
  return {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createApp(proxyModel: ReturnType<typeof createProxyModelMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {
      proxy: proxyModel,
    },
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerProxySettingsRoutes(app, deps);
  return app;
}

describe('proxySettingsRoutes', () => {
  let proxyModel: ReturnType<typeof createProxyModelMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    proxyModel = createProxyModelMock();
    app = createApp(proxyModel);
  });

  it('lists proxies from database', async () => {
    proxyModel.findMany.mockResolvedValue([
      { id: 1, name: 'Main Proxy', type: 'http', hostname: 'proxy.local', port: 8080, enabled: true },
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/settings/proxies' });

    expect(response.statusCode).toBe(200);
    expect(proxyModel.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
  });

  it('creates proxy in database', async () => {
    proxyModel.create.mockResolvedValue({
      id: 2,
      name: 'SOCKS Proxy',
      type: 'socks5',
      hostname: 'proxy.example.com',
      port: 1080,
      enabled: true,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/settings/proxies',
      payload: {
        name: 'SOCKS Proxy',
        type: 'socks5',
        hostname: 'proxy.example.com',
        port: 1080,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(proxyModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'SOCKS Proxy',
        type: 'socks5',
        hostname: 'proxy.example.com',
        port: 1080,
      }),
    });
  });

  it('updates existing proxy', async () => {
    proxyModel.findUnique.mockResolvedValue({ id: 1 });
    proxyModel.update.mockResolvedValue({
      id: 1,
      name: 'Updated Proxy',
      type: 'http',
      hostname: 'updated.local',
      port: 8888,
      enabled: false,
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings/proxies/1',
      payload: {
        hostname: 'updated.local',
        port: 8888,
        enabled: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(proxyModel.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        hostname: 'updated.local',
        port: 8888,
        enabled: false,
      }),
    });
  });

  it('deletes existing proxy', async () => {
    proxyModel.findUnique.mockResolvedValue({ id: 1 });
    proxyModel.delete.mockResolvedValue({ id: 1 });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/settings/proxies/1',
    });

    expect(response.statusCode).toBe(200);
    expect(proxyModel.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
