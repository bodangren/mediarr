import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiDependencies } from '../types';
import { registerApiErrorHandler } from '../errors';
import { registerBlocklistRoutes } from './blocklistRoutes';

function createBlocklistDelegateMock() {
  return {
    findMany: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
  };
}

type BlocklistDelegateMock = ReturnType<typeof createBlocklistDelegateMock>;

function createApp(blocklist?: BlocklistDelegateMock): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: blocklist ? { blocklist } : {},
  };

  app.setErrorHandler((error, request, reply) =>
    registerApiErrorHandler(request, reply, error),
  );
  registerBlocklistRoutes(app, deps);
  return app;
}

const blockedRelease = {
  id: 12,
  seriesId: 7,
  seriesTitle: 'Severance',
  episodeId: 44,
  seasonNumber: 2,
  episodeNumber: 3,
  releaseTitle: 'Severance.S02E03.1080p.WEB-DL',
  quality: 'WEBDL-1080p',
  dateBlocked: new Date('2026-07-22T10:30:00.000Z'),
  reason: 'Release hash failed verification',
  indexer: 'House Indexer',
  size: 4_294_967_296,
  createdAt: new Date('2026-07-22T10:30:00.000Z'),
};

describe('blocklistRoutes', () => {
  let blocklist: BlocklistDelegateMock;
  let app: FastifyInstance;

  beforeEach(() => {
    blocklist = createBlocklistDelegateMock();
    app = createApp(blocklist);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/blocklist', () => {
    it('returns an exact paginated envelope and forwards filters, sorting, and pagination', async () => {
      blocklist.findMany.mockResolvedValue([blockedRelease]);
      blocklist.count.mockResolvedValue(5);

      const response = await app.inject({
        method: 'GET',
        url: '/api/blocklist?page=2&pageSize=2&seriesId=7&sortBy=releaseTitle&sortDir=asc',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: [{
          id: 12,
          seriesId: 7,
          seriesTitle: 'Severance',
          episodeId: 44,
          seasonNumber: 2,
          episodeNumber: 3,
          releaseTitle: 'Severance.S02E03.1080p.WEB-DL',
          quality: 'WEBDL-1080p',
          dateBlocked: '2026-07-22T10:30:00.000Z',
          reason: 'Release hash failed verification',
          indexer: 'House Indexer',
          size: 4_294_967_296,
        }],
        meta: {
          page: 2,
          pageSize: 2,
          totalCount: 5,
          totalPages: 3,
        },
      });
      expect(blocklist.findMany).toHaveBeenCalledWith({
        where: { seriesId: 7 },
        orderBy: { releaseTitle: 'asc' },
        skip: 2,
        take: 2,
      });
      expect(blocklist.count).toHaveBeenCalledWith({ where: { seriesId: 7 } });
    });

    it('omits nullable database fields so the SPA optional-field schema can parse the item', async () => {
      blocklist.findMany.mockResolvedValue([{
        ...blockedRelease,
        seriesId: null,
        episodeId: null,
        seasonNumber: null,
        episodeNumber: null,
        quality: null,
        indexer: null,
        size: null,
      }]);
      blocklist.count.mockResolvedValue(1);

      const response = await app.inject({ method: 'GET', url: '/api/blocklist' });

      expect(response.statusCode).toBe(200);
      expect(response.json().data[0]).toEqual({
        id: 12,
        seriesTitle: 'Severance',
        releaseTitle: 'Severance.S02E03.1080p.WEB-DL',
        dateBlocked: '2026-07-22T10:30:00.000Z',
        reason: 'Release hash failed verification',
      });
    });

    it('uses default pagination and ordering when no query is supplied', async () => {
      blocklist.findMany.mockResolvedValue([]);
      blocklist.count.mockResolvedValue(0);

      const response = await app.inject({ method: 'GET', url: '/api/blocklist' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: [],
        meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 },
      });
      expect(blocklist.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { dateBlocked: 'desc' },
        skip: 0,
        take: 25,
      });
    });

    it('returns an exact validation error when the repository is not configured', async () => {
      const appWithoutRepository = createApp();

      try {
        const response = await appWithoutRepository.inject({ method: 'GET', url: '/api/blocklist' });

        expect(response.statusCode).toBe(422);
        expect(response.json()).toEqual({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Blocklist repository is not configured',
            retryable: false,
            path: '/api/blocklist',
          },
        });
      } finally {
        await appWithoutRepository.close();
      }
    });

    it('propagates repository failures through the API error envelope', async () => {
      blocklist.findMany.mockRejectedValue(new Error('blocklist query failed'));

      const response = await app.inject({ method: 'GET', url: '/api/blocklist' });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'blocklist query failed',
          retryable: false,
          path: '/api/blocklist',
        },
      });
      expect(blocklist.count).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/blocklist/remove', () => {
    it('deletes the submitted ids and returns the exact count', async () => {
      blocklist.deleteMany.mockResolvedValue({ count: 2 });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/blocklist/remove',
        payload: { ids: [12, 15] },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true, data: { deletedCount: 2 } });
      expect(blocklist.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [12, 15] } } });
    });

    it('treats an empty id set as an exact no-op', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/blocklist/remove',
        payload: { ids: [] },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true, data: { deletedCount: 0 } });
      expect(blocklist.deleteMany).not.toHaveBeenCalled();
    });

    it('rejects a missing ids property before any deletion', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/blocklist/remove',
        payload: {},
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
      expect(blocklist.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/blocklist/clear', () => {
    it('clears every blocklist row and returns the exact deleted count', async () => {
      blocklist.deleteMany.mockResolvedValue({ count: 9 });

      const response = await app.inject({ method: 'DELETE', url: '/api/blocklist/clear' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true, data: { deletedCount: 9 } });
      expect(blocklist.deleteMany).toHaveBeenCalledWith();
    });
  });

  describe('DELETE /api/blocklist/:id', () => {
    it('deletes one row and returns its exact identity', async () => {
      blocklist.deleteMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({ method: 'DELETE', url: '/api/blocklist/12' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true, data: { deleted: true, id: 12 } });
      expect(blocklist.deleteMany).toHaveBeenCalledWith({ where: { id: 12 } });
    });

    it('returns not found when no row was deleted', async () => {
      blocklist.deleteMany.mockResolvedValue({ count: 0 });

      const response = await app.inject({ method: 'DELETE', url: '/api/blocklist/404' });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Blocklist item 404 not found',
          retryable: false,
          path: '/api/blocklist/404',
        },
      });
    });

    it('rejects an invalid id before any deletion', async () => {
      const response = await app.inject({ method: 'DELETE', url: '/api/blocklist/not-a-number' });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid blocklist item id' },
      });
      expect(blocklist.deleteMany).not.toHaveBeenCalled();
    });
  });
});
