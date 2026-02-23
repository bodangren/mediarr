import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import { ValidationError } from '../../errors/domainErrors';
import type { ApiDependencies } from '../types';
import { FilterService, type FilterConditionsGroup, type FilterTargetType } from '../../services/FilterService';

const FILTER_COLLECTION_PATHS = ['/api/filters', '/api/filters/custom'] as const;
const FILTER_DETAIL_PATHS = ['/api/filters/:id', '/api/filters/custom/:id'] as const;

function parseFilterType(query: Record<string, unknown>): FilterTargetType {
  return query.type === 'indexer' ? 'indexer' : 'series';
}

export function registerFilterRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  FILTER_COLLECTION_PATHS.forEach(path => {
    app.get(path, {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
          },
        },
      },
    }, async (request, reply) => {
      const query = request.query as Record<string, unknown>;
      const type = parseFilterType(query);

      if (!(deps.prisma as any).customFilter?.findMany) {
        throw new ValidationError('Custom filter data source is not configured');
      }

      const filterService = new FilterService(deps.prisma as any);
      const filters = await filterService.list(type);
      return sendSuccess(reply, filters);
    });

    app.post(path, {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'type', 'conditions'],
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['series', 'indexer'] },
            conditions: { type: 'object' },
          },
        },
      },
    }, async (request, reply) => {
      const body = request.body as {
        name: string;
        type: FilterTargetType;
        conditions: FilterConditionsGroup;
      };

      const filterService = new FilterService(deps.prisma as any);
      const created = await filterService.create(body);
      return sendSuccess(reply, created, 201);
    });
  });

  FILTER_DETAIL_PATHS.forEach(path => {
    app.put(path, {
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
            conditions: { type: 'object' },
          },
        },
      },
    }, async (request, reply) => {
      const id = parseIdParam((request.params as { id: string }).id, 'filter');
      const body = request.body as {
        name?: string;
        conditions?: FilterConditionsGroup;
      };

      const filterService = new FilterService(deps.prisma as any);
      const updated = await filterService.update(id, body);
      return sendSuccess(reply, updated);
    });

    app.delete(path, {
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
      const id = parseIdParam((request.params as { id: string }).id, 'filter');
      const filterService = new FilterService(deps.prisma as any);
      const deleted = await filterService.delete(id);
      return sendSuccess(reply, deleted);
    });
  });
}
