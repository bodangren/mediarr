import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerCategorySettingsRoutes } from './categorySettingsRoutes';

function createIndexerCategoryModelMock() {
  return {
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createApp(indexerCategoryModel: ReturnType<typeof createIndexerCategoryModelMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {
      indexerCategory: indexerCategoryModel,
    },
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerCategorySettingsRoutes(app, deps);
  return app;
}

describe('categorySettingsRoutes', () => {
  let categoryModel: ReturnType<typeof createIndexerCategoryModelMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    categoryModel = createIndexerCategoryModelMock();
    app = createApp(categoryModel);
  });

  it('lists categories from database', async () => {
    categoryModel.findMany.mockResolvedValue([
      { id: 1, name: 'Movies (HD)', minSize: 100, maxSize: 200 },
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/settings/categories' });

    expect(response.statusCode).toBe(200);
    expect(categoryModel.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
  });

  it('seeds defaults when database has no categories', async () => {
    categoryModel.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, name: 'Movies (HD)' }]);

    const response = await app.inject({ method: 'GET', url: '/api/settings/categories' });

    expect(response.statusCode).toBe(200);
    expect(categoryModel.createMany).toHaveBeenCalledTimes(1);
    expect(categoryModel.findMany).toHaveBeenCalledTimes(2);
  });

  it('creates category in database', async () => {
    categoryModel.create.mockResolvedValue({
      id: 10,
      name: 'Anime',
      minSize: 104857600,
      maxSize: 2147483648,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/settings/categories',
      payload: {
        name: 'Anime',
        minSize: 104857600,
        maxSize: 2147483648,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(categoryModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Anime',
        minSize: 104857600,
        maxSize: 2147483648,
      }),
    });
  });

  it('updates existing category', async () => {
    categoryModel.findUnique.mockResolvedValue({ id: 1 });
    categoryModel.update.mockResolvedValue({
      id: 1,
      name: 'Movies (4K)',
      minSize: 2147483648,
      maxSize: 85899345920,
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings/categories/1',
      payload: {
        name: 'Movies (4K)',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(categoryModel.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        name: 'Movies (4K)',
      }),
    });
  });

  it('deletes existing category', async () => {
    categoryModel.findUnique.mockResolvedValue({ id: 1 });
    categoryModel.delete.mockResolvedValue({ id: 1 });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/settings/categories/1',
    });

    expect(response.statusCode).toBe(200);
    expect(categoryModel.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
