import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

export function registerApplicationRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/applications', async (_request, reply) => {
    if (!deps.applicationService) {
      throw new ValidationError('Application service is not configured');
    }

    const applications = await deps.applicationService.list();
    return sendSuccess(reply, applications);
  });

  app.post('/api/applications', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type', 'baseUrl', 'apiKey'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          baseUrl: { type: 'string' },
          apiKey: { type: 'string' },
          syncCategories: {
            type: 'array',
            items: { type: 'number' },
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.applicationService) {
      throw new ValidationError('Application service is not configured');
    }

    const payload = request.body as Record<string, unknown>;
    const created = await deps.applicationService.create({
      name: payload.name as string,
      type: payload.type as 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr',
      baseUrl: payload.baseUrl as string,
      apiKey: payload.apiKey as string,
      syncCategories: payload.syncCategories as number[] | undefined,
      tags: payload.tags as string[] | undefined,
    });

    return sendSuccess(reply, created, 201);
  });

  app.put('/api/applications/:id', {
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
          type: { type: 'string' },
          baseUrl: { type: 'string' },
          apiKey: { type: 'string' },
          syncCategories: {
            type: 'array',
            items: { type: 'number' },
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.applicationService) {
      throw new ValidationError('Application service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'application');
    const payload = request.body as Record<string, unknown>;
    const updated = await deps.applicationService.update(id, {
      name: payload.name as string | undefined,
      type: payload.type as 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | undefined,
      baseUrl: payload.baseUrl as string | undefined,
      apiKey: payload.apiKey as string | undefined,
      syncCategories: payload.syncCategories as number[] | undefined,
      tags: payload.tags as string[] | undefined,
    });

    return sendSuccess(reply, updated);
  });

  app.delete('/api/applications/:id', {
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
    if (!deps.applicationService) {
      throw new ValidationError('Application service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'application');
    const deleted = await deps.applicationService.delete(id);
    return sendSuccess(reply, deleted);
  });

  app.post('/api/applications/:id/test', {
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
    if (!deps.applicationService) {
      throw new ValidationError('Application service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'application');
    const result = await deps.applicationService.test(id);
    return sendSuccess(reply, result);
  });

  app.post('/api/applications/sync', async (_request, reply) => {
    if (!deps.applicationService) {
      throw new ValidationError('Application service is not configured');
    }

    const result = await deps.applicationService.syncAll();
    return sendSuccess(reply, result);
  });

  app.post('/api/applications/:id/sync', {
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
    if (!deps.applicationService) {
      throw new ValidationError('Application service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'application');
    const result = await deps.applicationService.syncOne(id);
    return sendSuccess(reply, result);
  });

  app.post('/api/applications/sync-all', async (_request, reply) => {
    if (!deps.applicationService) {
      throw new ValidationError('Application service is not configured');
    }

    const result = await deps.applicationService.syncAll();
    return sendSuccess(reply, result);
  });
}
