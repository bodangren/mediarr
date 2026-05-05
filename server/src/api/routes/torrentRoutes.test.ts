import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerTorrentRoutes } from './torrentRoutes';

function createTorrentManagerMock() {
  return {
    getTorrentsStatus: vi.fn().mockResolvedValue([
      { infoHash: 'abc', name: 'Test', progress: 50, status: 'downloading' },
    ]),
    getTorrentStatus: vi.fn().mockResolvedValue({
      infoHash: 'abc',
      name: 'Test',
      progress: 50,
      status: 'downloading',
    }),
    addTorrent: vi.fn().mockResolvedValue({ infoHash: 'abc', name: 'Test' }),
    pauseTorrent: vi.fn().mockResolvedValue(undefined),
    resumeTorrent: vi.fn().mockResolvedValue(undefined),
    removeTorrent: vi.fn().mockResolvedValue(undefined),
    setPriority: vi.fn().mockResolvedValue(undefined),
    setSpeedLimits: vi.fn().mockReturnValue(undefined),
    getActiveTorrents: vi.fn().mockResolvedValue([]),
    setDownloadPaths: vi.fn().mockReturnValue(undefined),
  };
}

function createApp(torrentManager?: ReturnType<typeof createTorrentManagerMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    ...(torrentManager ? { torrentManager } : {}),
  };
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerTorrentRoutes(app, deps);
  return app;
}

describe('torrentRoutes', () => {
  let torrentManager: ReturnType<typeof createTorrentManagerMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    torrentManager = createTorrentManagerMock();
    app = createApp(torrentManager);
  });

  describe('GET /api/torrents', () => {
    it('returns paginated torrent list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/torrents',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        data: unknown[];
        meta: { page: number; pageSize: number; totalCount: number };
      };
      expect(body.data).toHaveLength(1);
      expect(body.meta.totalCount).toBe(1);
      expect(torrentManager.getTorrentsStatus).toHaveBeenCalled();
    });

    it('returns validation error when torrent manager is not configured', async () => {
      const appWithoutManager = createApp();
      const response = await appWithoutManager.inject({
        method: 'GET',
        url: '/api/torrents',
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/torrents/:infoHash', () => {
    it('returns torrent details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/torrents/abc',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: { infoHash: string } };
      expect(body.data.infoHash).toBe('abc');
      expect(torrentManager.getTorrentStatus).toHaveBeenCalledWith('abc');
    });

    it('maps missing torrent to not found', async () => {
      torrentManager.getTorrentStatus.mockRejectedValue(new Error('not found'));

      const response = await app.inject({
        method: 'GET',
        url: '/api/torrents/missing',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/torrents', () => {
    it('adds a new torrent', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/torrents',
        payload: { magnetUrl: 'magnet:?xt=urn:btih:abc' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as { data: { infoHash: string } };
      expect(body.data.infoHash).toBe('abc');
      expect(torrentManager.addTorrent).toHaveBeenCalledWith({
        magnetUrl: 'magnet:?xt=urn:btih:abc',
      });
    });
  });

  describe('PATCH /api/torrents/:infoHash/pause', () => {
    it('pauses the torrent', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/torrents/abc/pause',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: { infoHash: string; status: string } };
      expect(body.data).toEqual({ infoHash: 'abc', status: 'paused' });
      expect(torrentManager.pauseTorrent).toHaveBeenCalledWith('abc');
    });

    it('maps missing torrent to not found', async () => {
      torrentManager.pauseTorrent.mockRejectedValue(new Error('not found'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/torrents/missing/pause',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/torrents/:infoHash/resume', () => {
    it('resumes the torrent', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/torrents/abc/resume',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: { infoHash: string; status: string } };
      expect(body.data).toEqual({ infoHash: 'abc', status: 'downloading' });
      expect(torrentManager.resumeTorrent).toHaveBeenCalledWith('abc');
    });
  });

  describe('DELETE /api/torrents/:infoHash', () => {
    it('removes torrent with data deletion by default', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/torrents/abc',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: { infoHash: string; removed: boolean } };
      expect(body.data).toEqual({ infoHash: 'abc', removed: true });
      expect(torrentManager.removeTorrent).toHaveBeenCalledWith('abc', true);
    });

    it('removes torrent without data deletion when deleteData=false', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/torrents/abc?deleteData=false',
      });

      expect(response.statusCode).toBe(200);
      expect(torrentManager.removeTorrent).toHaveBeenCalledWith('abc', false);
    });

    it('maps missing torrent to not found', async () => {
      torrentManager.removeTorrent.mockRejectedValue(new Error('not found'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/torrents/missing',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/torrents/:infoHash/priority', () => {
    it('updates torrent priority', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/torrents/abc/priority',
        payload: { priority: 100 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: { infoHash: string; priority: number } };
      expect(body.data).toEqual({ infoHash: 'abc', priority: 100 });
      expect(torrentManager.setPriority).toHaveBeenCalledWith('abc', 100);
    });

    it('returns validation error when torrent manager is not configured', async () => {
      const appWithoutManager = createApp();
      const response = await appWithoutManager.inject({
        method: 'PATCH',
        url: '/api/torrents/abc/priority',
        payload: { priority: 100 },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('maps missing torrent to not found', async () => {
      torrentManager.setPriority.mockRejectedValue(new Error('not found'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/torrents/missing/priority',
        payload: { priority: 100 },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/torrents/bulk', () => {
    it('pauses multiple torrents', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/torrents/bulk',
        payload: { action: 'pause', infoHashes: ['abc', 'def'] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        data: { action: string; succeeded: unknown[]; failed: string[] };
      };
      expect(body.data.action).toBe('pause');
      expect(body.data.succeeded).toHaveLength(2);
      expect(torrentManager.pauseTorrent).toHaveBeenCalledWith('abc');
      expect(torrentManager.pauseTorrent).toHaveBeenCalledWith('def');
    });

    it('resumes multiple torrents', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/torrents/bulk',
        payload: { action: 'resume', infoHashes: ['abc', 'def'] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        data: { succeeded: unknown[] };
      };
      expect(body.data.succeeded).toHaveLength(2);
    });

    it('removes multiple torrents without data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/torrents/bulk',
        payload: { action: 'remove', infoHashes: ['abc', 'def'], deleteData: false },
      });

      expect(response.statusCode).toBe(200);
      expect(torrentManager.removeTorrent).toHaveBeenCalledWith('abc', false);
      expect(torrentManager.removeTorrent).toHaveBeenCalledWith('def', false);
    });

    it('updates priority for multiple torrents', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/torrents/bulk',
        payload: { action: 'priority', infoHashes: ['abc', 'def'], priority: 50 },
      });

      expect(response.statusCode).toBe(200);
      expect(torrentManager.setPriority).toHaveBeenCalledWith('abc', 50);
      expect(torrentManager.setPriority).toHaveBeenCalledWith('def', 50);
    });

    it('handles not-found torrents gracefully', async () => {
      torrentManager.pauseTorrent.mockRejectedValue(new Error('not found'));

      const response = await app.inject({
        method: 'POST',
        url: '/api/torrents/bulk',
        payload: { action: 'pause', infoHashes: ['abc'] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        data: { succeeded: unknown[] };
      };
      expect(body.data.succeeded).toHaveLength(1);
      expect(body.data.succeeded[0]).toEqual({ infoHash: 'abc', error: 'not found' });
    });

    it('returns validation error when torrent manager is not configured', async () => {
      const appWithoutManager = createApp();
      const response = await appWithoutManager.inject({
        method: 'POST',
        url: '/api/torrents/bulk',
        payload: { action: 'pause', infoHashes: ['abc'] },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
});
