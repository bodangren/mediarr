import { describe, expect, it, vi } from 'vitest';
import { ApiHttpClient } from './httpClient';
import { createSystemApi } from './systemApi';

describe('SystemApi', () => {
  describe('getStatus', () => {
    it('should fetch system status', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        health: {
          overall: 'ok' as const,
          checks: [
            {
              type: 'Indexer Proxies',
              source: 'System',
              message: 'All indexer proxies are healthy',
              status: 'ok' as const,
              lastChecked: '2026-02-15T04:13:00Z',
            },
          ],
        },
        system: {
          version: '1.0.0',
          branch: 'main',
          commit: 'abc123',
          startTime: '2026-02-15T00:00:00Z',
          uptime: 12345,
          dotNetVersion: '8.0.0',
          os: 'Linux',
          osVersion: 'Ubuntu 22.04',
          isMono: false,
          isLinux: true,
          isWindows: false,
          isDocker: true,
        },
        database: {
          type: 'SQLite',
          version: '3.40.0',
          migration: '123',
          location: '/config/mediarr.db',
        },
        diskSpace: [
          {
            path: '/data',
            label: 'Data',
            free: 500000000000,
            total: 1000000000000,
          },
        ],
        dependencies: {
          required: [
            {
              name: 'Node.js',
              version: '20.10.0',
              status: 'ok' as const,
            },
          ],
          optional: [
            {
              name: 'FFmpeg',
              version: '6.0.0',
              status: 'ok' as const,
            },
          ],
        },
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createSystemApi(client);

      const result = await api.getStatus();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/system/status',
        },
        expect.any(Object),
      );
      expect(result.health.overall).toBe('ok');
      expect(result.system.version).toBe('1.0.0');
      expect(result.database.type).toBe('SQLite');
      expect(result.diskSpace).toHaveLength(1);
      expect(result.dependencies.required).toHaveLength(1);
    });
  });

  describe('getHealth', () => {
    it('should fetch health snapshot', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        status: 'ok' as const,
        indexers: [
          {
            indexerId: 1,
            indexerName: 'Test Indexer',
            severity: 'ok' as const,
            snapshot: null,
          },
        ],
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createSystemApi(client);

      const result = await api.getHealth();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/health',
        },
        expect.any(Object),
      );
      expect(result.status).toBe('ok');
      expect(result.indexers).toHaveLength(1);
    });
  });

  describe('isHealthy', () => {
    it('should check if system is healthy', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        ok: true,
        uptime: 12345,
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createSystemApi(client);

      const result = await api.isHealthy();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/health',
        },
        expect.any(Object),
      );
      expect(result.ok).toBe(true);
      expect(result.uptime).toBe(12345);
    });
  });

  describe('Tasks API', () => {
    describe('getScheduledTasks', () => {
      it('should fetch scheduled tasks', async () => {
        const mockRequest = vi.fn().mockResolvedValue([
          {
            id: 'rss-sync',
            taskName: 'RSS Sync',
            interval: '15m',
            lastExecution: '2026-02-15T10:00:00.000Z',
            lastDuration: 2.5,
            nextExecution: '2026-02-15T10:15:00.000Z',
            status: 'pending' as const,
          },
          {
            id: 'check-availability',
            taskName: 'Availability Check',
            interval: '1h',
            lastExecution: '2026-02-15T09:00:00.000Z',
            lastDuration: 15.2,
            nextExecution: '2026-02-15T10:00:00.000Z',
            status: 'pending' as const,
          },
        ]);

        const client = new ApiHttpClient({});
        client.request = mockRequest;
        const api = createSystemApi(client);

        const result = await api.getScheduledTasks();

        expect(mockRequest).toHaveBeenCalledWith(
          {
            path: '/api/tasks/scheduled',
          },
          expect.any(Object),
        );
        expect(result).toHaveLength(2);
        expect(result[0].taskName).toBe('RSS Sync');
      });
    });

    describe('getQueuedTasks', () => {
      it('should fetch queued tasks', async () => {
        const mockRequest = vi.fn().mockResolvedValue([
          {
            id: 1,
            taskName: 'Media Scan',
            started: '2026-02-15T10:05:00.000Z',
            duration: null,
            progress: 45,
            status: 'running' as const,
          },
          {
            id: 2,
            taskName: 'Subtitle Search',
            started: '2026-02-15T10:10:00.000Z',
            duration: null,
            progress: 0,
            status: 'queued' as const,
          },
        ]);

        const client = new ApiHttpClient({});
        client.request = mockRequest;
        const api = createSystemApi(client);

        const result = await api.getQueuedTasks();

        expect(mockRequest).toHaveBeenCalledWith(
          {
            path: '/api/tasks/queued',
          },
          expect.any(Object),
        );
        expect(result).toHaveLength(2);
        expect(result[0].progress).toBe(45);
      });
    });

    describe('getTaskHistory', () => {
      it('should fetch task history with pagination', async () => {
        const mockRequestPaginated = vi.fn().mockResolvedValue({
          items: [
            {
              id: 1,
              taskName: 'RSS Sync',
              started: '2026-02-15T10:00:00.000Z',
              duration: 2.5,
              status: 'success' as const,
              output: null,
            },
            {
              id: 2,
              taskName: 'Media Scan',
              started: '2026-02-15T09:30:00.000Z',
              duration: 30.0,
              status: 'failed' as const,
              output: 'Error: Connection timeout',
            },
          ],
          meta: {
            page: 1,
            pageSize: 25,
            totalCount: 2,
            totalPages: 1,
          },
        });

        const client = new ApiHttpClient({});
        client.requestPaginated = mockRequestPaginated;
        const api = createSystemApi(client);

        const result = await api.getTaskHistory({ page: 1, pageSize: 25 });

        expect(mockRequestPaginated).toHaveBeenCalledWith(
          {
            path: '/api/tasks/history',
            query: { page: 1, pageSize: 25 },
          },
          expect.any(Object),
        );
        expect(result.items).toHaveLength(2);
        expect(result.meta.totalCount).toBe(2);
      });

      it('should support filtering by status', async () => {
        const mockRequestPaginated = vi.fn().mockResolvedValue({
          items: [],
          meta: {
            page: 1,
            pageSize: 25,
            totalCount: 0,
            totalPages: 1,
          },
        });

        const client = new ApiHttpClient({});
        client.requestPaginated = mockRequestPaginated;
        const api = createSystemApi(client);

        const query = { page: 1, pageSize: 25, status: 'failed' as const };
        await api.getTaskHistory(query);

        expect(mockRequestPaginated).toHaveBeenCalledWith(
          {
            path: '/api/tasks/history',
            query,
          },
          expect.any(Object),
        );
      });
    });

    describe('getTaskDetails', () => {
      it('should fetch task details including output', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
          id: 1,
          taskName: 'RSS Sync',
          started: '2026-02-15T10:00:00.000Z',
          duration: 2.5,
          status: 'success' as const,
          output: 'Scanned 15 indexers\nFound 42 releases\nNo new items grabbed',
        });

        const client = new ApiHttpClient({});
        client.request = mockRequest;
        const api = createSystemApi(client);

        const result = await api.getTaskDetails(1);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            path: '/api/tasks/history/1',
          },
          expect.any(Object),
        );
        expect(result.output).toContain('Scanned 15 indexers');
      });
    });

    describe('runTask', () => {
      it('should trigger execution of a scheduled task', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
          taskId: 'rss-sync',
          taskName: 'RSS Sync',
          queuedAt: '2026-02-15T10:30:00.000Z',
        });

        const client = new ApiHttpClient({});
        client.request = mockRequest;
        const api = createSystemApi(client);

        const result = await api.runTask('rss-sync');

        expect(mockRequest).toHaveBeenCalledWith(
          {
            path: '/api/tasks/scheduled/rss-sync/run',
            method: 'POST',
          },
          expect.any(Object),
        );
        expect(result.taskName).toBe('RSS Sync');
      });
    });

    describe('cancelTask', () => {
      it('should cancel a queued or running task', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
          id: 1,
          taskName: 'Media Scan',
          cancelled: true,
        });

        const client = new ApiHttpClient({});
        client.request = mockRequest;
        const api = createSystemApi(client);

        const result = await api.cancelTask(1);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            path: '/api/tasks/queued/1',
            method: 'DELETE',
          },
          expect.any(Object),
        );
      expect(result.cancelled).toBe(true);
    });
  });

  describe('Events API', () => {
    describe('getEvents', () => {
      it('should fetch system events with pagination', async () => {
        const mockRequestPaginated = vi.fn().mockResolvedValue({
          items: [
            {
              id: 1,
              timestamp: '2026-02-15T10:00:00.000Z',
              level: 'info' as const,
              type: 'system' as const,
              message: 'Application started',
              source: 'Mediarr',
            },
            {
              id: 2,
              timestamp: '2026-02-15T10:05:00.000Z',
              level: 'warning' as const,
              type: 'indexer' as const,
              message: 'Indexer connection slow',
              source: 'NZBGeek',
            },
            {
              id: 3,
              timestamp: '2026-02-15T10:10:00.000Z',
              level: 'error' as const,
              type: 'download' as const,
              message: 'Download failed: timeout',
              source: 'Transmission',
              details: { infoHash: 'abc123', error: 'Connection timeout' },
            },
          ],
          meta: {
            page: 1,
            pageSize: 25,
            totalCount: 3,
            totalPages: 1,
          },
        });

        const client = new ApiHttpClient({});
        client.requestPaginated = mockRequestPaginated;
        const api = createSystemApi(client);

        const result = await api.getEvents({ page: 1, pageSize: 25 });

        expect(mockRequestPaginated).toHaveBeenCalledWith(
          {
            path: '/api/system/events',
            query: { page: 1, pageSize: 25 },
          },
          expect.any(Object),
        );
        expect(result.items).toHaveLength(3);
        expect(result.meta.totalCount).toBe(3);
        expect(result.items[0].level).toBe('info');
        expect(result.items[1].level).toBe('warning');
        expect(result.items[2].level).toBe('error');
      });

      it('should support filtering by level', async () => {
        const mockRequestPaginated = vi.fn().mockResolvedValue({
          items: [
            {
              id: 2,
              timestamp: '2026-02-15T10:05:00.000Z',
              level: 'error' as const,
              type: 'indexer' as const,
              message: 'Indexer test failed',
              source: 'NZBGeek',
            },
          ],
          meta: {
            page: 1,
            pageSize: 25,
            totalCount: 1,
            totalPages: 1,
          },
        });

        const client = new ApiHttpClient({});
        client.requestPaginated = mockRequestPaginated;
        const api = createSystemApi(client);

        const query = { page: 1, pageSize: 25, level: 'error' as const };
        await api.getEvents(query);

        expect(mockRequestPaginated).toHaveBeenCalledWith(
          {
            path: '/api/system/events',
            query,
          },
          expect.any(Object),
        );
      });

      it('should support filtering by type', async () => {
        const mockRequestPaginated = vi.fn().mockResolvedValue({
          items: [
            {
              id: 1,
              timestamp: '2026-02-15T10:00:00.000Z',
              level: 'info' as const,
              type: 'indexer' as const,
              message: 'Indexer synced',
              source: 'NZBGeek',
            },
          ],
          meta: {
            page: 1,
            pageSize: 25,
            totalCount: 1,
            totalPages: 1,
          },
        });

        const client = new ApiHttpClient({});
        client.requestPaginated = mockRequestPaginated;
        const api = createSystemApi(client);

        const query = { page: 1, pageSize: 25, type: 'indexer' as const };
        await api.getEvents(query);

        expect(mockRequestPaginated).toHaveBeenCalledWith(
          {
            path: '/api/system/events',
            query,
          },
          expect.any(Object),
        );
      });

      it('should support filtering by date range', async () => {
        const mockRequestPaginated = vi.fn().mockResolvedValue({
          items: [],
          meta: {
            page: 1,
            pageSize: 25,
            totalCount: 0,
            totalPages: 1,
          },
        });

        const client = new ApiHttpClient({});
        client.requestPaginated = mockRequestPaginated;
        const api = createSystemApi(client);

        const query = {
          page: 1,
          pageSize: 25,
          startDate: '2026-02-01T00:00:00.000Z',
          endDate: '2026-02-15T23:59:59.999Z',
        };
        await api.getEvents(query);

        expect(mockRequestPaginated).toHaveBeenCalledWith(
          {
            path: '/api/system/events',
            query,
          },
          expect.any(Object),
        );
      });
    });

    describe('clearEvents', () => {
      it('should clear all events', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
          cleared: 100,
        });

        const client = new ApiHttpClient({});
        client.request = mockRequest;
        const api = createSystemApi(client);

        const result = await api.clearEvents();

        expect(mockRequest).toHaveBeenCalledWith(
          {
            path: '/api/system/events/clear',
            method: 'DELETE',
            query: {},
          },
          expect.any(Object),
        );
        expect(result.cleared).toBe(100);
      });

      it('should clear events by level', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
          cleared: 25,
          level: 'info' as const,
        });

        const client = new ApiHttpClient({});
        client.request = mockRequest;
        const api = createSystemApi(client);

        const result = await api.clearEvents({ level: 'info' });

        expect(mockRequest).toHaveBeenCalledWith(
          {
            path: '/api/system/events/clear',
            method: 'DELETE',
            query: { level: 'info' },
          },
          expect.any(Object),
        );
        expect(result.cleared).toBe(25);
        expect(result.level).toBe('info');
      });

      it('should clear events before a date', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
          cleared: 50,
          before: '2026-02-01T00:00:00.000Z',
        });

        const client = new ApiHttpClient({});
        client.request = mockRequest;
        const api = createSystemApi(client);

        const result = await api.clearEvents({
          before: '2026-02-01T00:00:00.000Z',
        });

        expect(mockRequest).toHaveBeenCalledWith(
          {
            path: '/api/system/events/clear',
            method: 'DELETE',
            query: { before: '2026-02-01T00:00:00.000Z' },
          },
          expect.any(Object),
        );
        expect(result.cleared).toBe(50);
      });
    });

    describe('exportEvents', () => {
      it('should export events as CSV', async () => {
        const mockBlob = new Blob(['id,timestamp,level,type,message\n1,2026-02-15T10:00:00.000Z,info,system,Application started'], {
          type: 'text/csv',
        });
        const mockRequestBlob = vi.fn().mockResolvedValue(mockBlob);

        const client = new ApiHttpClient({});
        client.requestBlob = mockRequestBlob;
        const api = createSystemApi(client);

        const result = await api.exportEvents({ format: 'csv', page: 1, pageSize: 100 });

        expect(mockRequestBlob).toHaveBeenCalledWith(
          {
            path: '/api/system/events/export',
            query: { format: 'csv', page: 1, pageSize: 100 },
            method: 'GET',
          },
        );
        expect(result.type).toBe('text/csv');
      });

      it('should export events as JSON', async () => {
        const mockBlob = new Blob(['[{"id":1,"timestamp":"2026-02-15T10:00:00.000Z","level":"info","type":"system","message":"Application started"}]'], {
          type: 'application/json',
        });
        const mockRequestBlob = vi.fn().mockResolvedValue(mockBlob);

        const client = new ApiHttpClient({});
        client.requestBlob = mockRequestBlob;
        const api = createSystemApi(client);

        const result = await api.exportEvents({
          format: 'json',
          page: 1,
          pageSize: 100,
          level: 'error',
        });

        expect(mockRequestBlob).toHaveBeenCalledWith(
          {
            path: '/api/system/events/export',
            query: { format: 'json', page: 1, pageSize: 100, level: 'error' },
            method: 'GET',
          },
        );
        expect(result.type).toBe('application/json');
      });
    });
  });
});

});
