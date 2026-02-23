import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

interface CategoryPayload {
  name: string;
  description?: string | null;
  minSize?: number | null;
  maxSize?: number | null;
}

const DEFAULT_INDEXER_CATEGORIES = [
  {
    name: 'Movies (HD)',
    description: 'High definition movies',
    minSize: 10737418240,
    maxSize: 53687091200,
  },
  {
    name: 'Movies (SD)',
    description: 'Standard definition movies',
    minSize: 734003200,
    maxSize: 10737418240,
  },
  {
    name: 'TV Episodes (HD)',
    description: 'High definition TV episodes',
    minSize: 536870912,
    maxSize: 4294967296,
  },
  {
    name: 'TV Episodes (SD)',
    description: 'Standard definition TV episodes',
    minSize: 73400320,
    maxSize: 536870912,
  },
] as const;

function getIndexerCategoryModel(deps: ApiDependencies) {
  const prisma = deps.prisma as { indexerCategory?: Record<string, unknown> };
  if (!prisma?.indexerCategory) {
    throw new ValidationError('Indexer category model is not configured');
  }

  return prisma.indexerCategory as {
    findMany: (args?: Record<string, unknown>) => Promise<unknown[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    createMany: (args: { data: Array<Record<string, unknown>> }) => Promise<unknown>;
    findUnique: (args: { where: { id: number } }) => Promise<unknown | null>;
    update: (args: { where: { id: number }; data: Record<string, unknown> }) => Promise<unknown>;
    delete: (args: { where: { id: number } }) => Promise<unknown>;
  };
}

export function registerCategorySettingsRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  app.get('/api/settings/categories', async (_request, reply) => {
    const categoryModel = getIndexerCategoryModel(deps);
    let categories = await categoryModel.findMany({
      orderBy: { id: 'asc' },
    });

    if (categories.length === 0) {
      await categoryModel.createMany({
        data: DEFAULT_INDEXER_CATEGORIES.map(category => ({
          name: category.name,
          description: category.description,
          minSize: category.minSize,
          maxSize: category.maxSize,
        })),
      });

      categories = await categoryModel.findMany({
        orderBy: { id: 'asc' },
      });
    }

    return sendSuccess(reply, categories);
  });

  app.post('/api/settings/categories', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          minSize: { type: 'number' },
          maxSize: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const categoryModel = getIndexerCategoryModel(deps);
    const body = request.body as CategoryPayload;
    const created = await categoryModel.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        minSize: body.minSize ?? null,
        maxSize: body.maxSize ?? null,
      },
    });

    return sendSuccess(reply, created, 201);
  });

  app.put('/api/settings/categories/:id', {
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
          description: { type: 'string' },
          minSize: { type: 'number' },
          maxSize: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const categoryModel = getIndexerCategoryModel(deps);
    const id = parseIdParam((request.params as { id: string }).id, 'category');
    const existing = await categoryModel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Category ${id} not found`);
    }

    const body = request.body as Partial<CategoryPayload>;
    const updated = await categoryModel.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.minSize !== undefined ? { minSize: body.minSize } : {}),
        ...(body.maxSize !== undefined ? { maxSize: body.maxSize } : {}),
      },
    });

    return sendSuccess(reply, updated);
  });

  app.delete('/api/settings/categories/:id', {
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
    const categoryModel = getIndexerCategoryModel(deps);
    const id = parseIdParam((request.params as { id: string }).id, 'category');
    const existing = await categoryModel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Category ${id} not found`);
    }

    await categoryModel.delete({ where: { id } });
    return sendSuccess(reply, { id });
  });
}
