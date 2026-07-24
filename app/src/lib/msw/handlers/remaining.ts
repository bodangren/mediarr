import { http } from 'msw';
import {
  createMockBackup,
  createMockBackupSchedule,
  createMockBlocklist,
  createMockCollection,
  createMockCustomFormat,
  createMockDashboardCalendarItem,
  createMockDashboardDiskSpace,
  createMockDataset,
  createMockImportList,
  createMockImportListExclusion,
  createMockImportListProvider,
  createMockLogFile,
  createMockUpdate,
  type FactoryMode,
} from '../factories';
import { numberQuery, sendBlob, sendError, sendPaginated, sendSuccess } from './helpers';

export function createRemainingHandlers(mode: FactoryMode = 'deterministic') {
  const dataset = createMockDataset(mode);

  return [
    // Backup routes — schedule literals BEFORE /:id catch-all
    http.get('/api/backups', () => {
      return sendSuccess([
        createMockBackup(1),
        createMockBackup(2),
      ]);
    }),

    http.post('/api/backups', () => {
      return sendSuccess(createMockBackup('created', { size: 0, type: 'manual' }), 201);
    }),

    http.get('/api/backups/schedule', () => {
      return sendSuccess(createMockBackupSchedule());
    }),

    http.patch('/api/backups/schedule', async ({ request }) => {
      const body = (await request.json()) as { enabled?: boolean; interval?: string; retentionDays?: number };
      return sendSuccess(createMockBackupSchedule({
        supported: false,
        enabled: false,
        interval: body.interval === 'hourly'
          || body.interval === 'daily'
          || body.interval === 'weekly'
          || body.interval === 'monthly'
          ? body.interval
          : 'daily',
        retentionDays: body.retentionDays ?? 30,
      }));
    }),

    http.delete('/api/backups/:id', ({ params }) => {
      return sendSuccess({ id: String(params.id), deleted: true });
    }),

    http.post('/api/backups/:id/restore', ({ params }) => {
      const id = String(params.id);
      return sendSuccess({
        id,
        name: id,
        restoredAt: '2026-06-12T00:00:00.000Z',
        restartRequired: true,
        safetyBackupId: 'manual_backup_safety.db',
      });
    }),

    http.post('/api/backups/:id/download', ({ params }) => {
      const id = String(params.id);
      return sendSuccess({ downloadUrl: `/api/backups/${encodeURIComponent(id)}/file` });
    }),

    http.get('/api/backups/:id/file', ({ params }) => {
      const id = String(params.id);
      return sendBlob(`backup-db-${id}`, id, 'application/vnd.sqlite3');
    }),

    // Blocklist routes — clear/remove literals BEFORE /:id catch-all
    http.get('/api/blocklist', () => {
      return sendSuccess([createMockBlocklist(1)]);
    }),

    http.delete('/api/blocklist/clear', () => {
      return sendSuccess({ deletedCount: 0 });
    }),

    http.delete('/api/blocklist/remove', async ({ request }) => {
      try {
        const body = (await request.json()) as { ids?: number[] };
        return sendSuccess({ deletedCount: body.ids?.length ?? 0 });
      } catch {
        return sendSuccess({ deletedCount: 0 });
      }
    }),

    http.delete('/api/blocklist/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    // Calendar route
    http.get('/api/calendar', ({ request }) => {
      const url = new URL(request.url);
      const start = url.searchParams.get('start');
      return sendSuccess([
        createMockDashboardCalendarItem(1, { airDate: start ?? undefined }),
      ]);
    }),

    // Collection routes — /:id/search and /:id/sync are POST so no GET /:id collision
    http.get('/api/collections', () => {
      return sendSuccess([
        createMockCollection(1),
        createMockCollection(2),
      ]);
    }),

    http.get('/api/collections/:id', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess(createMockCollection(id));
    }),

    http.post('/api/collections', async ({ request }) => {
      const body = (await request.json()) as { name?: string; type?: string };
      return sendSuccess({
        id: Date.now(),
        name: body.name ?? 'New Collection',
        type: body.type ?? 'movie',
        monitored: true,
        movieCount: 0,
      }, 201);
    }),

    http.put('/api/collections/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess(createMockCollection(id, {
        name: typeof body.name === 'string' ? body.name : undefined,
        type: typeof body.type === 'string' ? body.type : undefined,
        monitored: typeof body.monitored === 'boolean' ? body.monitored : undefined,
      }));
    }),

    http.delete('/api/collections/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    http.post('/api/collections/:id/search', ({ params }) => {
      return sendSuccess({ collectionId: Number(params.id), results: [{ tmdbId: 12345, title: 'Search Result', year: 2024 }] });
    }),

    http.post('/api/collections/:id/sync', ({ params }) => {
      return sendSuccess({ collectionId: Number(params.id), synced: true, added: 0, removed: 0 });
    }),

    // Custom format routes — schema literal BEFORE /:id catch-all
    http.get('/api/custom-formats', () => {
      return sendSuccess([
        createMockCustomFormat(1),
        createMockCustomFormat(2),
      ]);
    }),

    http.get('/api/custom-formats/schema', () => {
      return sendSuccess({
        fields: [
          { name: 'name', label: 'Name', type: 'string', required: true },
          { name: 'type', label: 'Type', type: 'select', options: ['quality', 'audio', 'language'], required: true },
        ],
      });
    }),

    http.get('/api/custom-formats/:id', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess(createMockCustomFormat(id));
    }),

    http.post('/api/custom-formats', async ({ request }) => {
      const body = (await request.json()) as { name?: string; type?: string };
      return sendSuccess({
        id: Date.now(),
        name: body.name ?? 'New Format',
        type: body.type ?? 'quality',
        specifications: [],
      }, 201);
    }),

    http.put('/api/custom-formats/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess(createMockCustomFormat(id, {
        name: typeof body.name === 'string' ? body.name : undefined,
        type: typeof body.type === 'string' ? body.type : undefined,
        specifications: Array.isArray(body.specifications) ? body.specifications : undefined,
      }));
    }),

    http.delete('/api/custom-formats/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    http.post('/api/custom-formats/:id/test', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as { sample?: string };
      return sendSuccess({ formatId: id, matched: true, sample: body.sample ?? '', score: 100 });
    }),

    // Import list routes — exclusions/providers literals BEFORE /:id catch-all
    http.get('/api/import-lists', () => {
      return sendSuccess([
        createMockImportList(1),
        createMockImportList(2),
      ]);
    }),

    http.get('/api/import-lists/exclusions', () => {
      return sendSuccess([createMockImportListExclusion(1)]);
    }),

    http.get('/api/import-lists/providers', () => {
      return sendSuccess([
        createMockImportListProvider('tmdb'),
        createMockImportListProvider('trakt'),
      ]);
    }),

    http.get('/api/import-lists/:id', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess(createMockImportList(id));
    }),

    http.post('/api/import-lists', async ({ request }) => {
      const body = (await request.json()) as { name?: string; implementation?: string };
      return sendSuccess({
        id: Date.now(),
        name: body.name ?? 'New Import List',
        enabled: true,
        implementation: body.implementation ?? 'TMDbImportList',
      }, 201);
    }),

    http.put('/api/import-lists/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess(createMockImportList(id, {
        name: typeof body.name === 'string' ? body.name : undefined,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        implementation: typeof body.implementation === 'string' ? body.implementation : undefined,
      }));
    }),

    http.delete('/api/import-lists/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    http.post('/api/import-lists/:id/sync', ({ params }) => {
      return sendSuccess({ listId: Number(params.id), synced: true, added: 0, removed: 0 });
    }),

    http.post('/api/import-lists/exclusions', async ({ request }) => {
      const body = (await request.json()) as { tmdbId?: number; title?: string };
      return sendSuccess({
        id: Date.now(),
        tmdbId: body.tmdbId ?? 0,
        title: body.title ?? 'Excluded',
        movieYear: null,
      }, 201);
    }),

    http.delete('/api/import-lists/exclusions/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    // Log routes — download/clear literals on :filename BEFORE /:filename catch-all
    http.get('/api/logs/files', () => {
      return sendSuccess([
        createMockLogFile('mediarr.log'),
        createMockLogFile('mediarr.error.log'),
      ]);
    }),

    http.get('/api/logs/files/:filename/download', ({ params }) => {
      return sendBlob(createMockLogFile(String(params.filename)).content, String(params.filename), 'text/plain');
    }),

    http.delete('/api/logs/files/:filename', ({ params }) => {
      return sendSuccess({ filename: params.filename, deleted: true });
    }),

    http.post('/api/logs/files/:filename/clear', ({ params }) => {
      return sendSuccess({ filename: params.filename, cleared: true });
    }),

    http.get('/api/logs/files/:filename', ({ params }) => {
      return sendSuccess({ filename: params.filename, content: createMockLogFile(String(params.filename)).content });
    }),

    // Update routes
    http.get('/api/updates/current', () => {
      return sendSuccess(createMockUpdate('1.0.0'));
    }),

    http.get('/api/updates/available', () => {
      return sendSuccess({ available: true, ...createMockUpdate('1.1.0') });
    }),

    http.get('/api/updates/check', () => {
      return sendSuccess({ checked: true, updateAvailable: false });
    }),

    http.get('/api/updates/history', () => {
      return sendSuccess([createMockUpdate('1.0.0')]);
    }),

    http.post('/api/updates/check', () => {
      return sendSuccess({ checked: true, updateAvailable: true, ...createMockUpdate('1.1.0') });
    }),

    http.post('/api/updates/download', () => {
      return sendSuccess({ downloading: true, progress: 0 });
    }),

    http.post('/api/updates/install', () => {
      return sendSuccess({ installing: true, restartRequired: true });
    }),

    // Dashboard routes
    http.get('/api/dashboard/disk-space', () => {
      return sendSuccess([
        createMockDashboardDiskSpace('/media'),
        createMockDashboardDiskSpace('/data'),
      ]);
    }),

    http.get('/api/dashboard/upcoming', () => {
      return sendSuccess([createMockDashboardCalendarItem(2)]);
    }),

    // Misc routes
    http.get('/api/notifications/push-status', () => {
      return sendSuccess({ enabled: false, configured: false, token: null });
    }),

    http.get('/api/setup/status', () => {
      return sendSuccess({ completed: true, step: 'done', rootFoldersConfigured: true, indexersConfigured: true, downloadClientConfigured: true });
    }),

    http.post('/api/setup/complete', async ({ request }) => {
      try {
        const body = (await request.json()) as Record<string, unknown>;
        return sendSuccess({ completed: true, ...body });
      } catch {
        return sendSuccess({ completed: true });
      }
    }),

    http.get('/api/filesystem', ({ request }) => {
      const url = new URL(request.url);
      const path = url.searchParams.get('path') ?? '/';
      return sendSuccess([
        { name: 'media', path: `${path}/media`, type: 'directory', writable: true },
        { name: 'data', path: `${path}/data`, type: 'directory', writable: true },
        { name: 'config.json', path: `${path}/config.json`, type: 'file', size: 1024 },
      ]);
    }),

    http.get('/api/images/proxy', () => {
      // Minimal JPEG byte sequence (SOI + APP0 marker) as a real binary body.
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      return sendBlob(bytes, 'image.jpg', 'image/jpeg');
    }),

    http.get('/api/search', ({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get('q') ?? '';
      return sendSuccess([
        { mediaType: 'MOVIE', tmdbId: 12345, title: `Search Result for "${query}"`, year: 2024, status: 'released' },
      ]);
    }),

    http.get('/api/media/library', ({ request }) => {
      const url = new URL(request.url);
      const typeFilter = url.searchParams.get('type');
      const items = [
        ...dataset.movies.map(m => ({ type: 'movie', id: m.id, title: m.title, year: m.year, monitored: m.monitored })),
        ...dataset.series.map(s => ({ type: 'series', id: s.id, title: s.title, year: s.year, monitored: s.monitored })),
      ];
      const filtered = typeFilter ? items.filter(item => item.type === typeFilter) : items;
      return sendPaginated(filtered, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.post('/api/wanted', async ({ request }) => {
      const body = (await request.json()) as { mediaType?: string; tmdbId?: number; tvdbId?: number };
      return sendSuccess({ queued: true, mediaType: body.mediaType, tmdbId: body.tmdbId, tvdbId: body.tvdbId });
    }),

    http.post('/api/wanted/search-all', () => {
      return sendSuccess({ queued: true, message: 'Wanted search queued' }, 202);
    }),

    http.post('/api/library/scan', () => {
      return sendSuccess({ queued: true, message: 'Library scan queued' }, 202);
    }),

    // Media add / search / wanted
    http.get('/api/media/wanted', ({ request }) => {
      const url = new URL(request.url);
      const typeFilter = url.searchParams.get('type');

      const combined = [
        ...dataset.series.flatMap(series => series.seasons.flatMap(season => season.episodes.filter(episode => episode.path === null).map(episode => ({
          type: 'episode',
          id: episode.id,
          title: episode.title,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          seriesId: series.id,
          seriesTitle: series.title,
        })))),
        ...dataset.movies.filter(movie => movie.fileVariants.length === 0).map(movie => ({
          type: 'movie',
          id: movie.id,
          tmdbId: movie.tmdbId,
          title: movie.title,
          year: movie.year,
        })),
      ];

      const filtered = typeFilter ? combined.filter(item => item.type === typeFilter) : combined;
      return sendPaginated(filtered, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.post('/api/media/search', async ({ request }) => {
      const body = (await request.json()) as { term: string; mediaType: string };
      const term = body.term.toLowerCase();

      if (body.mediaType.toUpperCase() === 'MOVIE') {
        return sendSuccess(
          dataset.movies
            .filter(movie => movie.title.toLowerCase().includes(term))
            .map(movie => ({
              mediaType: 'MOVIE',
              tmdbId: movie.tmdbId,
              title: movie.title,
              year: movie.year,
              status: movie.status,
              overview: `${movie.title} overview`,
            })),
        );
      }

      return sendSuccess(
        dataset.series
          .filter(series => series.title.toLowerCase().includes(term))
          .map(series => ({
            mediaType: 'TV',
            tvdbId: series.tvdbId,
            title: series.title,
            year: series.year,
            status: series.status,
            overview: `${series.title} overview`,
            network: 'Mediarr Network',
          })),
      );
    }),

    http.post('/api/media', async ({ request }) => {
      const body = (await request.json()) as {
        mediaType: 'TV' | 'MOVIE';
        tmdbId?: number;
        tvdbId?: number;
        title?: string;
        year?: number;
      };

      if (body.mediaType === 'MOVIE') {
        const duplicate = dataset.movies.find(movie => movie.tmdbId === body.tmdbId);
        if (duplicate) {
          return sendError('CONFLICT', 'Movie already exists', 409, { existingId: duplicate.id, tmdbId: duplicate.tmdbId });
        }

        const created = {
          id: dataset.movies.length + 100,
          tmdbId: body.tmdbId ?? Date.now(),
          title: body.title ?? 'New Movie',
          year: body.year ?? 2026,
          status: 'announced',
          monitored: true,
          fileVariants: [],
        };
        dataset.movies.unshift(created);
        return sendSuccess(created, 201);
      }

      const duplicate = dataset.series.find(series => series.tvdbId === body.tvdbId);
      if (duplicate) {
        return sendError('CONFLICT', 'Series already exists', 409, { existingId: duplicate.id, tvdbId: duplicate.tvdbId });
      }

      const created = {
        id: dataset.series.length + 100,
        tvdbId: body.tvdbId ?? Date.now(),
        title: body.title ?? 'New Series',
        year: body.year ?? 2026,
        status: 'continuing',
        monitored: true,
        qualityProfileId: 1,
        seasons: [],
      };
      dataset.series.unshift(created);
      return sendSuccess(created, 201);
    }),

    // Import routes
    http.post('/api/import/scan', async ({ request }) => {
      const body = (await request.json()) as { path?: string };
      return sendSuccess({
        path: body.path ?? '/media',
        files: [
          { path: '/media/movie1.mkv', movieTitle: 'Imported Movie', year: 2024, quality: '1080p' },
        ],
      });
    }),

    http.post('/api/import/execute', async ({ request }) => {
      const body = (await request.json()) as { files?: Array<{ path: string; movieId?: number; seriesId?: number }> };
      return sendSuccess({ imported: body.files?.length ?? 0, failed: 0, errors: [] });
    }),

    http.post('/api/import/search', async ({ request }) => {
      const body = (await request.json()) as { term?: string };
      return sendSuccess([
        { tmdbId: 12345, title: body.term ?? 'Search Result', year: 2024, status: 'released' },
      ]);
    }),

    http.post('/api/import/backfill-posters', () => {
      return sendSuccess({ updated: 0, failed: 0 });
    }),
  ];
}
