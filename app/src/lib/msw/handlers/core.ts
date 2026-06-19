import { http } from 'msw';
import {
  createMockDataset,
  type FactoryMode,
  type MockIndexer,
} from '../factories';
import { numberQuery, sendError, sendPaginated, sendSuccess } from './helpers';

export function createCoreHandlers(mode: FactoryMode = 'deterministic') {
  const dataset = createMockDataset(mode);

  return [
    // Series routes
    http.get('/api/series', ({ request }) => {
      const url = new URL(request.url);
      const search = url.searchParams.get('search')?.toLowerCase();
      const filtered = search
        ? dataset.series.filter(series => series.title.toLowerCase().includes(search))
        : dataset.series;

      return sendPaginated(filtered, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.get('/api/series/root-folders', () => {
      const rootFolders = [...new Set(dataset.series.map(series => {
        const firstEpisode = series.seasons.flatMap(s => s.episodes).find(e => e.path);
        if (!firstEpisode?.path) return '/media/series';
        const parts = firstEpisode.path.split('/');
        return parts.length > 2 ? `/${parts[1]}` : '/media/series';
      }))];
      return sendSuccess({ rootFolders });
    }),

    http.get('/api/series/:id', ({ params }) => {
      const id = Number(params.id);
      const found = dataset.series.find(item => item.id === id);
      return found ? sendSuccess(found) : sendError('NOT_FOUND', `Series ${id} not found`, 404);
    }),

    http.patch('/api/series/:id/monitored', async ({ params, request }) => {
      const id = Number(params.id);
      const found = dataset.series.find(item => item.id === id);
      if (!found) {
        return sendError('NOT_FOUND', `Series ${id} not found`, 404);
      }

      const body = (await request.json()) as { monitored: boolean };
      found.monitored = Boolean(body.monitored);
      return sendSuccess(found);
    }),

    http.delete('/api/series/:id', ({ params }) => {
      const id = Number(params.id);
      const index = dataset.series.findIndex(item => item.id === id);
      if (index < 0) {
        return sendError('NOT_FOUND', `Series ${id} not found`, 404);
      }

      dataset.series.splice(index, 1);
      return sendSuccess({ deleted: true, id });
    }),

    http.get('/api/episodes/missing', ({ request }) => {
      const url = new URL(request.url);
      const missing = dataset.series.flatMap(series =>
        series.seasons.flatMap(season =>
          season.episodes
            .filter(episode => episode.path === null)
            .map(episode => ({
              id: episode.id,
              seriesId: series.id,
              seriesTitle: series.title,
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
              title: episode.title,
              monitored: episode.monitored,
            })),
        ),
      );
      return sendPaginated(missing, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.post('/api/series/import/scan', async ({ request }) => {
      const body = (await request.json()) as { path: string };
      return sendSuccess({
        files: [
          { path: `${body.path}/series1.mkv`, seriesTitle: 'Scanned Series', seasonNumber: 1, episodeNumber: 1, quality: '1080p' },
        ],
      });
    }),

    http.post('/api/series/import/apply', async ({ request }) => {
      const body = (await request.json()) as { files: Array<{ path: string; seriesId: number }> };
      return sendSuccess({ imported: body.files.length, failed: 0, errors: [] });
    }),

    http.put('/api/series/bulk', async ({ request }) => {
      const body = (await request.json()) as { seriesIds: number[]; changes: Record<string, unknown> };
      return sendSuccess({ updated: body.seriesIds.length, failed: 0 });
    }),

    // Movie routes
    http.get('/api/movies', ({ request }) => {
      const url = new URL(request.url);
      const search = url.searchParams.get('search')?.toLowerCase();
      const filtered = search
        ? dataset.movies.filter(movie => movie.title.toLowerCase().includes(search))
        : dataset.movies;

      return sendPaginated(filtered, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.get('/api/movies/root-folders', () => {
      const rootFolders = [...new Set(dataset.movies.map(movie => {
        const variant = movie.fileVariants[0];
        if (!variant) return '/media/movies';
        const parts = variant.path.split('/');
        return parts.length > 2 ? `/${parts[1]}` : '/media/movies';
      }))];
      return sendSuccess({ rootFolders });
    }),

    http.post('/api/movies', async ({ request }) => {
      const body = (await request.json()) as {
        title?: string;
        year?: number;
        tmdbId?: number;
        monitored?: boolean;
        qualityProfileId?: number;
      };
      const created = {
        id: dataset.movies.length + 100,
        tmdbId: body.tmdbId ?? Date.now(),
        title: body.title ?? 'New Movie',
        year: body.year ?? 2026,
        status: 'announced',
        monitored: body.monitored ?? true,
        fileVariants: [],
      };
      dataset.movies.unshift(created);
      return sendSuccess(created, 201);
    }),

    http.get('/api/movies/:id', ({ params }) => {
      const id = Number(params.id);
      const found = dataset.movies.find(item => item.id === id);
      return found ? sendSuccess(found) : sendError('NOT_FOUND', `Movie ${id} not found`, 404);
    }),

    http.put('/api/movies/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const found = dataset.movies.find(item => item.id === id);
      if (!found) {
        return sendError('NOT_FOUND', `Movie ${id} not found`, 404);
      }

      const patch = (await request.json()) as Record<string, unknown>;
      Object.assign(found, patch);
      return sendSuccess(found);
    }),

    http.patch('/api/movies/:id/monitored', async ({ params, request }) => {
      const id = Number(params.id);
      const found = dataset.movies.find(item => item.id === id);
      if (!found) {
        return sendError('NOT_FOUND', `Movie ${id} not found`, 404);
      }

      const body = (await request.json()) as { monitored: boolean };
      found.monitored = Boolean(body.monitored);
      return sendSuccess(found);
    }),

    http.delete('/api/movies/:id', ({ params }) => {
      const id = Number(params.id);
      const index = dataset.movies.findIndex(item => item.id === id);
      if (index < 0) {
        return sendError('NOT_FOUND', `Movie ${id} not found`, 404);
      }

      dataset.movies.splice(index, 1);
      return sendSuccess({ deleted: true, id });
    }),

    http.get('/api/movies/missing', ({ request }) => {
      const url = new URL(request.url);
      const monitoredParam = url.searchParams.get('monitored');
      let filtered = [...dataset.missingMovies];

      if (monitoredParam !== null) {
        const monitored = monitoredParam === 'true';
        filtered = filtered.filter(movie => movie.monitored === monitored);
      }

      return sendPaginated(filtered, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.post('/api/movies/import/scan', async ({ request }) => {
      const body = (await request.json()) as { path: string };
      return sendSuccess({
        files: [
          { path: `${body.path}/movie1.mkv`, movieTitle: 'Scanned Movie 1', year: 2024, quality: '1080p' },
          { path: `${body.path}/movie2.mkv`, movieTitle: 'Scanned Movie 2', year: 2023, quality: '2160p' },
        ],
      });
    }),

    http.post('/api/movies/import/apply', async ({ request }) => {
      const body = (await request.json()) as { files: Array<{ path: string; movieId: number }> };
      return sendSuccess({ imported: body.files.length, failed: 0, errors: [] });
    }),

    http.put('/api/movies/bulk', async ({ request }) => {
      const body = (await request.json()) as { movieIds: number[]; changes: Record<string, unknown> };
      return sendSuccess({ updated: body.movieIds.length, failed: 0 });
    }),

    // Release routes
    http.post('/api/releases/search', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const title = String(body.title ?? body.seriesTitle ?? 'Candidate');

      return sendSuccess([
        {
          indexer: 'Indexer 1',
          title: `${title} 1080p WEB-DL`,
          size: 2_147_483_648,
          seeders: 83,
          quality: '1080p',
          age: 1,
          magnetUrl: 'magnet:?xt=urn:btih:release-1',
        },
        {
          indexer: 'Indexer 3',
          title: `${title} 2160p HDR`,
          size: 5_368_709_120,
          seeders: 21,
          quality: '2160p',
          age: 3,
          magnetUrl: 'magnet:?xt=urn:btih:release-2',
        },
      ]);
    }),

    http.post('/api/releases/grab', async ({ request }) => {
      const body = (await request.json()) as { title?: string };
      const infoHash = `hash-${Date.now()}`;

      dataset.torrents.unshift({
        infoHash,
        name: body.title ?? 'Grabbed Release',
        status: 'downloading',
        progress: 0,
        size: String(2_000_000_000),
        downloaded: '0',
        uploaded: '0',
        downloadSpeed: 1_200_000,
        uploadSpeed: 10_000,
        eta: 5000,
      });

      return sendSuccess({ infoHash, name: body.title ?? 'Grabbed Release' });
    }),

    // Torrent routes
    http.get('/api/torrents', ({ request }) => {
      const url = new URL(request.url);
      return sendPaginated(dataset.torrents, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.get('/api/torrents/:infoHash', ({ params }) => {
      const found = dataset.torrents.find(item => item.infoHash === params.infoHash);
      return found ? sendSuccess(found) : sendError('NOT_FOUND', 'Torrent not found', 404);
    }),

    http.post('/api/torrents', async ({ request }) => {
      const body = (await request.json()) as { magnetUrl?: string };
      const infoHash = `hash-${Date.now()}`;
      return sendSuccess({ infoHash, name: body.magnetUrl ?? 'Manual Torrent' }, 201);
    }),

    http.patch('/api/torrents/:infoHash/pause', ({ params }) => sendSuccess({ infoHash: params.infoHash, status: 'paused' })),
    http.patch('/api/torrents/:infoHash/resume', ({ params }) => sendSuccess({ infoHash: params.infoHash, status: 'downloading' })),
    http.delete('/api/torrents/:infoHash', ({ params }) => sendSuccess({ infoHash: params.infoHash, removed: true })),
    http.patch('/api/torrents/speed-limits', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({ updated: true, limits: body });
    }),

    http.post('/api/torrents/bulk', async ({ request }) => {
      const body = (await request.json()) as { infoHashes?: string[]; action?: string };
      return sendSuccess({ processed: body.infoHashes?.length ?? 0, action: body.action ?? 'pause' });
    }),

    http.post('/api/torrents/:infoHash/retry-import', ({ params }) => {
      return sendSuccess({ infoHash: params.infoHash, retried: true });
    }),

    http.patch('/api/torrents/:infoHash/priority', async ({ params, request }) => {
      const body = (await request.json()) as { priority?: string };
      return sendSuccess({ infoHash: params.infoHash, priority: body.priority ?? 'normal' });
    }),

    // Indexer routes
    http.get('/api/indexers', () => sendSuccess(dataset.indexers)),

    http.get('/api/indexers/catalog', () => {
      return sendSuccess(dataset.indexers.map(indexer => ({
        id: `cardigann-${indexer.id}`,
        name: indexer.name,
        implementation: indexer.implementation,
        configContract: indexer.configContract,
        protocol: indexer.protocol,
        description: `${indexer.name} indexer for ${indexer.protocol}`,
        known: true,
      })));
    }),

    http.get('/api/indexers/detect', () => {
      return sendSuccess([
        { name: 'Prowlarr', url: 'http://localhost:9696', apikey: 'detected-key', implementation: 'Torznab' },
      ]);
    }),

    http.get('/api/indexers/schema/:configContract', ({ params }) => {
      return sendSuccess({
        configContract: params.configContract,
        fields: [
          { name: 'url', label: 'URL', type: 'string', required: true },
          { name: 'apiKey', label: 'API Key', type: 'string', required: true },
        ],
      });
    }),

    http.post('/api/indexers', async ({ request }) => {
      const body = (await request.json()) as Partial<MockIndexer>;
      const created: MockIndexer = {
        id: dataset.indexers.length + 10,
        name: typeof body.name === 'string' ? body.name : `Indexer ${dataset.indexers.length + 10}`,
        implementation:
          typeof body.implementation === 'string' ? body.implementation : 'Torznab',
        configContract:
          typeof body.configContract === 'string'
            ? body.configContract
            : 'TorznabSettings',
        settings: typeof body.settings === 'string' ? body.settings : '{}',
        protocol: typeof body.protocol === 'string' ? body.protocol : 'torrent',
        enabled: body.enabled ?? true,
        supportsRss: body.supportsRss ?? true,
        supportsSearch: body.supportsSearch ?? true,
        priority: typeof body.priority === 'number' ? body.priority : 25,
        health: null,
      };

      dataset.indexers.unshift(created);
      return sendSuccess(created, 201);
    }),

    http.put('/api/indexers/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const found = dataset.indexers.find(item => item.id === id);
      if (!found) {
        return sendError('NOT_FOUND', `Indexer ${id} not found`, 404);
      }

      const patch = (await request.json()) as Record<string, unknown>;
      Object.assign(found, patch);
      return sendSuccess(found);
    }),

    http.delete('/api/indexers/:id', ({ params }) => {
      const id = Number(params.id);
      const index = dataset.indexers.findIndex(item => item.id === id);
      if (index < 0) {
        return sendError('NOT_FOUND', `Indexer ${id} not found`, 404);
      }

      dataset.indexers.splice(index, 1);
      return sendSuccess({ id });
    }),

    http.post('/api/indexers/:id/test', ({ params }) => {
      const id = Number(params.id);
      const found = dataset.indexers.find(item => item.id === id);
      if (!found) {
        return sendError('NOT_FOUND', `Indexer ${id} not found`, 404);
      }

      const success = found.health?.failureCount === 0;
      return sendSuccess({
        success,
        message: success ? 'Connectivity check succeeded.' : 'HTTP timeout contacting indexer.',
        diagnostics: {
          remediationHints: success
            ? ['No remediation needed.']
            : ['Check URL and API key.', 'Verify DNS/network access.'],
        },
        healthSnapshot: found.health,
      });
    }),

    http.get('/api/indexers/:id/health', ({ params }) => {
      const id = Number(params.id);
      const found = dataset.indexers.find(item => item.id === id);
      if (!found) {
        return sendError('NOT_FOUND', `Indexer ${id} not found`, 404);
      }

      const health = found.health;
      const snapshot = health
        ? {
            indexerId: found.id,
            failureCount: health.failureCount,
            lastErrorMessage: health.lastErrorMessage,
            lastSuccessAt: health.failureCount === 0 ? new Date().toISOString() : null,
            lastFailureAt: health.failureCount > 0 ? new Date().toISOString() : null,
          }
        : null;

      return sendSuccess({ indexerId: found.id, snapshot });
    }),

    http.put('/api/indexers/:id/reenable', ({ params }) => {
      const id = Number(params.id);
      const found = dataset.indexers.find(item => item.id === id);
      if (!found) {
        return sendError('NOT_FOUND', `Indexer ${id} not found`, 404);
      }

      found.enabled = true;
      if (found.health) {
        found.health.failureCount = 0;
        found.health.lastErrorMessage = null;
      }

      return sendSuccess({
        id: found.id,
        enabled: true,
        failureCount: found.health?.failureCount ?? 0,
      });
    }),

    http.post('/api/indexers/test', async ({ request }) => {
      const body = (await request.json()) as { name?: string; settings?: string };
      let parsedSettings: Record<string, unknown> = {};

      if (typeof body.settings === 'string') {
        try {
          parsedSettings = JSON.parse(body.settings) as Record<string, unknown>;
        } catch {
          return sendError('VALIDATION_ERROR', 'Invalid settings payload', 400);
        }
      }

      const settingsValues = Object.values(parsedSettings);
      const hasEmptyRequiredValue = settingsValues.some(value => typeof value === 'string' && value.trim().length === 0);
      if (!body.name || body.name.trim().length === 0 || hasEmptyRequiredValue) {
        return sendSuccess({
          success: false,
          message: 'Missing required connection values.',
          diagnostics: {
            remediationHints: ['Fill in all required fields before testing.'],
          },
          healthSnapshot: null,
        });
      }

      return sendSuccess({
        success: true,
        message: 'Connectivity check succeeded.',
        diagnostics: {
          remediationHints: ['No remediation needed.'],
        },
        healthSnapshot: null,
      });
    }),

    http.post('/api/indexers/:id/clone', ({ params }) => {
      const id = Number(params.id);
      const found = dataset.indexers.find(item => item.id === id);
      if (!found) {
        return sendError('NOT_FOUND', `Indexer ${id} not found`, 404);
      }

      const cloned: MockIndexer = {
        ...found,
        id: dataset.indexers.length + 10,
        name: `${found.name} (Copy)`,
      };
      dataset.indexers.unshift(cloned);
      return sendSuccess(cloned, 201);
    }),

    http.post('/api/indexers/catalog/:id/add', ({ params }) => {
      const created: MockIndexer = {
        id: dataset.indexers.length + 10,
        name: `Catalog Indexer ${params.id}`,
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: '{}',
        protocol: 'torrent',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
        health: null,
      };
      dataset.indexers.unshift(created);
      return sendSuccess(created, 201);
    }),

    http.post('/api/indexers/catalog/reload', () => {
      return sendSuccess({ reloaded: true });
    }),

    http.post('/api/indexers/import-from/:type', ({ params }) => {
      const imported = dataset.indexers.slice(0, 2).map((indexer, i) => ({
        ...indexer,
        id: dataset.indexers.length + 20 + i,
        name: `${indexer.name} (from ${params.type})`,
      }));
      return sendSuccess({ imported: imported.length, indexers: imported });
    }),
  ];
}
