import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerCustomFormatRoutes } from './customFormatRoutes';

function createCustomFormatRepositoryMock() {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    nameExists: vi.fn(),
    findByQualityProfileId: vi.fn(),
  };
}

function createApp(customFormatRepository: ReturnType<typeof createCustomFormatRepositoryMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    customFormatRepository,
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerCustomFormatRoutes(app, deps);
  return app;
}

const mockFormat = {
  id: 1,
  name: 'HDR10',
  includeCustomFormatWhenRenaming: false,
  conditions: [
    { type: 'regex', field: 'title', operator: 'contains', value: 'HDR10', negate: false, required: false },
  ],
  scores: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockFormatWithScore = {
  ...mockFormat,
  scores: [{ id: 1, qualityProfileId: 1, score: 100 }],
};

describe('customFormatRoutes', () => {
  let customFormatRepository: ReturnType<typeof createCustomFormatRepositoryMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    customFormatRepository = createCustomFormatRepositoryMock();
    app = createApp(customFormatRepository);
  });

  describe('GET /api/custom-formats', () => {
    it('returns all custom formats', async () => {
      customFormatRepository.findAll.mockResolvedValue([mockFormat]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/custom-formats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(1);
      expect(body.data[0].name).toBe('HDR10');
    });

    it('returns empty array when no formats exist', async () => {
      customFormatRepository.findAll.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/custom-formats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(0);
    });
  });

  describe('GET /api/custom-formats/:id', () => {
    it('returns a single custom format', async () => {
      customFormatRepository.findById.mockResolvedValue(mockFormat);

      const response = await app.inject({
        method: 'GET',
        url: '/api/custom-formats/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(1);
      expect(body.data.name).toBe('HDR10');
    });

    it('returns 404 when format not found', async () => {
      customFormatRepository.findById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/custom-formats/999',
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 for invalid id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/custom-formats/invalid',
      });

      expect(response.statusCode).toBe(422);
    });

    it('returns 400 for invalid conditions', async () => {
      customFormatRepository.findById.mockResolvedValue(mockFormat);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/custom-formats/1',
        payload: { conditions: [{ type: 'invalid', value: 'test' }] },
      });

      expect(response.statusCode).toBe(422);
    });
  });

  describe('DELETE /api/custom-formats/:id', () => {
    it('deletes a custom format', async () => {
      customFormatRepository.exists.mockResolvedValue(true);
      customFormatRepository.delete.mockResolvedValue(mockFormat);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/custom-formats/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(1);
    });

    it('returns 404 when format not found', async () => {
      customFormatRepository.exists.mockResolvedValue(false);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/custom-formats/999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/custom-formats/:id/test', () => {
    it('tests a format against a release title', async () => {
      customFormatRepository.findById.mockResolvedValue(mockFormat);

      const response = await app.inject({
        method: 'POST',
        url: '/api/custom-formats/1/test',
        payload: { title: 'Movie.2024.1080p.HDR10.BluRay.x264' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.formatId).toBe(1);
      expect(body.data.formatName).toBe('HDR10');
      expect(body.data.matches).toBe(true);
      expect(body.data.conditionResults).toHaveLength(1);
      expect(body.data.conditionResults[0].matches).toBe(true);
    });

    it('returns no match when title does not match', async () => {
      customFormatRepository.findById.mockResolvedValue(mockFormat);

      const response = await app.inject({
        method: 'POST',
        url: '/api/custom-formats/1/test',
        payload: { title: 'Movie.2024.1080p.BluRay.x264' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.matches).toBe(false);
      expect(body.data.conditionResults[0].matches).toBe(false);
    });

    it('returns 404 when format not found', async () => {
      customFormatRepository.findById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/custom-formats/999/test',
        payload: { title: 'test' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 when title is missing', async () => {
      customFormatRepository.findById.mockResolvedValue(mockFormat);

      const response = await app.inject({
        method: 'POST',
        url: '/api/custom-formats/1/test',
        payload: {},
      });

      expect(response.statusCode).toBe(422);
    });
  });

  describe('GET /api/custom-formats/schema', () => {
    it('returns schema information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/custom-formats/schema',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.conditionTypes).toContain('regex');
      expect(body.data.operators).toContain('contains');
      expect(body.data.fields).toContain('title');
    });
  });
});
