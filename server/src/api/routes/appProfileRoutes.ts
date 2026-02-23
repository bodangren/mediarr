import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

export function registerAppProfileRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/profiles/app', async (_request, reply) => {
    if (!deps.appProfileService) {
      throw new ValidationError('App profile service is not configured');
    }

    const profiles = await deps.appProfileService.list();
    return sendSuccess(reply, profiles);
  });

  app.post('/api/profiles/app', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          enableRss: { type: 'boolean' },
          enableInteractiveSearch: { type: 'boolean' },
          enableAutomaticSearch: { type: 'boolean' },
          minimumSeeders: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.appProfileService) {
      throw new ValidationError('App profile service is not configured');
    }

    const payload = request.body as Record<string, unknown>;
    const created = await deps.appProfileService.create({
      name: payload.name as string,
      enableRss: payload.enableRss as boolean | undefined,
      enableInteractiveSearch: payload.enableInteractiveSearch as boolean | undefined,
      enableAutomaticSearch: payload.enableAutomaticSearch as boolean | undefined,
      minimumSeeders: payload.minimumSeeders as number | undefined,
    });

    return sendSuccess(reply, created, 201);
  });

  app.put('/api/profiles/app/:id', {
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
          enableRss: { type: 'boolean' },
          enableInteractiveSearch: { type: 'boolean' },
          enableAutomaticSearch: { type: 'boolean' },
          minimumSeeders: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.appProfileService) {
      throw new ValidationError('App profile service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'app profile');
    const payload = request.body as Record<string, unknown>;
    const updated = await deps.appProfileService.update(id, {
      name: payload.name as string | undefined,
      enableRss: payload.enableRss as boolean | undefined,
      enableInteractiveSearch: payload.enableInteractiveSearch as boolean | undefined,
      enableAutomaticSearch: payload.enableAutomaticSearch as boolean | undefined,
      minimumSeeders: payload.minimumSeeders as number | undefined,
    });

    return sendSuccess(reply, updated);
  });

  app.delete('/api/profiles/app/:id', {
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
    if (!deps.appProfileService) {
      throw new ValidationError('App profile service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'app profile');
    const deleted = await deps.appProfileService.delete(id);
    return sendSuccess(reply, deleted);
  });

  app.post('/api/profiles/app/:id/clone', {
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
    if (!deps.appProfileService) {
      throw new ValidationError('App profile service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'app profile');
    const cloned = await deps.appProfileService.clone(id);
    return sendSuccess(reply, cloned, 201);
  });
}
