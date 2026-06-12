import { HttpResponse, http } from 'msw';
import { createMockDataset, type FactoryMode } from '../factories';
import { numberQuery, sendBlob, sendPaginated, sendSuccess } from './helpers';

export function createSystemHandlers(mode: FactoryMode = 'deterministic') {
  const dataset = createMockDataset(mode);

  return [
    http.get('/api/system/status', () => {
      return sendSuccess({
        health: { overall: 'ok', checks: [] },
        system: { version: '1.0.0', branch: 'main', commit: 'abc123', startTime: new Date().toISOString(), uptime: 3600, os: 'linux', isLinux: true, isWindows: false, isDocker: false },
        database: { type: 'SQLite', version: '3.40.0', migration: '0001', location: '/data/mediarr.db' },
        diskSpace: [],
        dependencies: { required: [], optional: [] },
      });
    }),

    http.get('/api/system/events', ({ request }) => {
      const url = new URL(request.url);
      const events = [
        { id: 1, timestamp: new Date().toISOString(), level: 'info', type: 'system', message: 'System started', source: 'main' },
        { id: 2, timestamp: new Date().toISOString(), level: 'warning', type: 'indexer', message: 'Indexer slow', source: 'HttpClient' },
      ];
      return sendPaginated(events, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.get('/api/system/events/export', () => {
      const body = JSON.stringify([{ id: 1, timestamp: new Date().toISOString(), level: 'info', type: 'system', message: 'Export event' }]);
      return sendBlob(body, 'system-events.json', 'application/json');
    }),

    http.delete('/api/system/events/clear', () => {
      return sendSuccess({ cleared: 0, level: undefined, before: undefined });
    }),

    http.get('/api/tasks/queued', () => {
      return sendSuccess([]);
    }),

    http.get('/api/tasks/scheduled', () => {
      return sendSuccess([
        { id: 'rss-sync', taskName: 'RSS Sync', interval: '*/15 * * * *', lastExecution: null, lastDuration: null, nextExecution: new Date(Date.now() + 900000).toISOString(), status: 'pending' },
      ]);
    }),

    http.get('/api/tasks/history', ({ request }) => {
      const url = new URL(request.url);
      const history = [
        { id: 1, taskName: 'RSS Sync', started: new Date().toISOString(), duration: 2345, status: 'success', output: 'Processed 42 releases' },
        { id: 2, taskName: 'Health Check', started: new Date().toISOString(), duration: 1234, status: 'success', output: 'All indexers healthy' },
      ];
      return sendPaginated(history, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.get('/api/tasks/history/:id', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess({ id, taskName: 'RSS Sync', started: new Date().toISOString(), duration: 2345, status: 'success', output: 'Processed 42 releases' });
    }),

    http.post('/api/tasks/scheduled/:taskId/run', ({ params }) => {
      return sendSuccess({ taskId: params.taskId, taskName: 'RSS Sync', queuedAt: new Date().toISOString() }, 202);
    }),

    http.delete('/api/tasks/queued/:taskId', ({ params }) => {
      return sendSuccess({ id: Number(params.taskId), taskName: 'Queued Task', cancelled: true });
    }),

    http.get('/api/activity', ({ request }) => {
      const url = new URL(request.url);
      return sendPaginated(dataset.activity, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.delete('/api/activity', () => {
      return sendSuccess({ deletedCount: 0 });
    }),

    http.get('/api/activity/export', () => {
      const body = JSON.stringify({ items: [], totalCount: 0, exportedAt: new Date().toISOString() });
      return sendBlob(body, 'activity-export.json', 'application/json');
    }),

    http.get('/api/health', () => {
      return sendSuccess({
        status: dataset.indexers.some(indexer => (indexer.health?.failureCount ?? 0) >= 3) ? 'critical' : 'ok',
        indexers: dataset.indexers.map(indexer => ({
          indexerId: indexer.id,
          indexerName: indexer.name,
          severity: (indexer.health?.failureCount ?? 0) >= 3 ? 'critical' : 'ok',
          snapshot: indexer.health,
        })),
      });
    }),

    http.patch('/api/activity/:id/fail', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess({ id, success: false, eventType: 'IMPORT_COMPLETED', sourceModule: 'ImportManager', entityRef: `movie:${id}`, summary: 'Import failed', details: null, occurredAt: new Date().toISOString() });
    }),

    http.post('/api/activity/:id/retry-import', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess({ id, retried: true }, 202);
    }),

    http.get('/api/system/stats', () => {
      return sendSuccess({
        library: { totalMovies: 10, totalSeries: 5, totalEpisodes: 100, monitoredMovies: 8, monitoredSeries: 4, monitoredEpisodes: 80 },
        files: { totalFiles: 50, totalSizeBytes: 500_000_000_000, movieFiles: 10, movieSizeBytes: 100_000_000_000, episodeFiles: 40, episodeSizeBytes: 400_000_000_000 },
        quality: { movies: { uhd4k: 2, hd1080p: 5, hd720p: 2, sd: 1, unknown: 0 }, episodes: { uhd4k: 5, hd1080p: 20, hd720p: 10, sd: 3, unknown: 2 } },
        missing: { movies: 2, episodes: 20 },
        activity: { downloadsThisWeek: 5, downloadsThisMonth: 15, searchesThisWeek: 30, subtitlesThisWeek: 10 },
      });
    }),

    http.get('/api/stats/downloads', () => {
      return sendSuccess({
        totalTorrents: 3,
        activeDownloads: 1,
        completedDownloads: 2,
        failedDownloads: 0,
        totalDownloadedBytes: 4_000_000_000,
        totalUploadedBytes: 500_000_000,
        averageDownloadSpeed: 1_200_000,
      });
    }),

    http.get('/api/stats/system', () => {
      return sendSuccess({
        dbSizeBytes: 1_048_576,
        uptimeSeconds: 3600,
        diskSpace: [{ path: '/media', freeBytes: 500_000_000_000, totalBytes: 1_000_000_000_000, usedPercent: 50 }],
      });
    }),

    http.get('/api/events/stream', () => {
      return new HttpResponse('', {
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
        },
      });
    }),
  ];
}
