import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

interface ProxyPayload {
  name: string;
  type: string;
  hostname: string;
  port: number;
  username?: string | null;
  password?: string | null;
  enabled?: boolean;
}

function getProxyModel(deps: ApiDependencies) {
  const prisma = deps.prisma as { proxy?: Record<string, unknown> };
  if (!prisma?.proxy) {
    throw new ValidationError('Proxy model is not configured');
  }

  return prisma.proxy as {
    findMany: (args?: Record<string, unknown>) => Promise<unknown[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findUnique: (args: { where: { id: number } }) => Promise<unknown | null>;
    update: (args: { where: { id: number }; data: Record<string, unknown> }) => Promise<unknown>;
    delete: (args: { where: { id: number } }) => Promise<unknown>;
  };
}

export function registerProxySettingsRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  app.get('/api/settings/proxies', async (_request, reply) => {
    const proxyModel = getProxyModel(deps);
    const proxies = await proxyModel.findMany({
      orderBy: { id: 'asc' },
    });
    return sendSuccess(reply, proxies);
  });

  app.post('/api/settings/proxies', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type', 'hostname', 'port'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['http', 'socks4', 'socks5'] },
          hostname: { type: 'string' },
          port: { type: 'number', minimum: 1, maximum: 65535 },
          username: { type: 'string' },
          password: { type: 'string' },
          enabled: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const proxyModel = getProxyModel(deps);
    const body = request.body as ProxyPayload;
    const created = await proxyModel.create({
      data: {
        name: body.name,
        type: body.type,
        hostname: body.hostname,
        port: body.port,
        username: body.username ?? null,
        password: body.password ?? null,
        enabled: body.enabled ?? true,
      },
    });

    return sendSuccess(reply, created, 201);
  });

  app.put('/api/settings/proxies/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['http', 'socks4', 'socks5'] },
          hostname: { type: 'string' },
          port: { type: 'number', minimum: 1, maximum: 65535 },
          username: { type: 'string' },
          password: { type: 'string' },
          enabled: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const proxyModel = getProxyModel(deps);
    const id = parseIdParam((request.params as { id: string }).id, 'proxy');
    const existing = await proxyModel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Proxy ${id} not found`);
    }

    const body = request.body as Partial<ProxyPayload>;
    const updated = await proxyModel.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.hostname !== undefined ? { hostname: body.hostname } : {}),
        ...(body.port !== undefined ? { port: body.port } : {}),
        ...(body.username !== undefined ? { username: body.username } : {}),
        ...(body.password !== undefined ? { password: body.password } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      },
    });

    return sendSuccess(reply, updated);
  });

  app.delete('/api/settings/proxies/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const proxyModel = getProxyModel(deps);
    const id = parseIdParam((request.params as { id: string }).id, 'proxy');
    const existing = await proxyModel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Proxy ${id} not found`);
    }

    await proxyModel.delete({ where: { id } });
    return sendSuccess(reply, { id });
  });
}
