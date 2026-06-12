import { HttpResponse, http } from 'msw';
import {
  createMockDataset,
  paginate,
  type FactoryMode,
  type MockIndexer,
} from './factories';

function numberQuery(url: URL, key: string, fallback: number): number {
  const value = url.searchParams.get(key);
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sendSuccess<T>(data: T, status = 200) {
  return HttpResponse.json({ ok: true, data }, { status });
}

function sendPaginated<T>(items: T[], page: number, pageSize: number) {
  const paged = paginate(items, page, pageSize);
  return HttpResponse.json({ ok: true, data: paged.items, meta: paged.meta }, { status: 200 });
}

function sendError(code: string, message: string, status: number, details?: unknown) {
  return HttpResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
        retryable: false,
      },
    },
    { status },
  );
}

export function createHandlers(mode: FactoryMode = 'deterministic') {
  const dataset = createMockDataset(mode);

  return [
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
        seasons: [],
      };
      dataset.series.unshift(created);
      return sendSuccess(created, 201);
    }),

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

    http.get('/api/subtitles/movie/:id/variants', ({ params }) => {
      return sendSuccess([{ variantId: Number(params.id) * 10, path: '/media/movie.variant.mkv' }]);
    }),

    http.get('/api/subtitles/episode/:id/variants', ({ params }) => {
      return sendSuccess([{ variantId: Number(params.id) * 10, path: '/media/episode.variant.mkv' }]);
    }),

    http.post('/api/subtitles/search', () => {
      return sendSuccess([{ languageCode: 'en', isForced: false, isHi: false, provider: 'opensubtitles', score: 97 }]);
    }),

    http.post('/api/subtitles/download', () => {
      return sendSuccess({ storedPath: '/tmp/subtitle.srt' });
    }),

    http.get('/api/activity', ({ request }) => {
      const url = new URL(request.url);
      return sendPaginated(dataset.activity, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
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

    http.get('/api/settings', () => sendSuccess(dataset.settings)),

    http.patch('/api/settings', async ({ request }) => {
      const patch = (await request.json()) as Record<string, unknown>;
      dataset.settings = {
        ...dataset.settings,
        ...patch,
      };

      return sendSuccess(dataset.settings);
    }),

    http.get('/api/settings/media', () => {
      return sendSuccess({
        movieRootFolder: '/media/movies',
        tvRootFolder: '/media/series',
        movieNamingPattern: '{Movie Title} ({Release Year})',
        seriesNamingPattern: '{Series Title}',
      });
    }),

    http.put('/api/settings/media', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({
        movieRootFolder: body.movieRootFolder ?? '/media/movies',
        tvRootFolder: body.tvRootFolder ?? '/media/series',
        movieNamingPattern: body.movieNamingPattern ?? '{Movie Title} ({Release Year})',
        seriesNamingPattern: body.seriesNamingPattern ?? '{Series Title}',
      });
    }),

    http.get('/api/settings/categories', () => {
      return sendSuccess([
        { id: 1, name: 'Movies (HD)', description: 'High definition movies', minSize: 10737418240, maxSize: 53687091200 },
        { id: 2, name: 'Movies (SD)', description: 'Standard definition movies', minSize: 734003200, maxSize: 10737418240 },
        { id: 3, name: 'TV Episodes (HD)', description: 'High definition TV episodes', minSize: 536870912, maxSize: 4294967296 },
        { id: 4, name: 'TV Episodes (SD)', description: 'Standard definition TV episodes', minSize: 73400320, maxSize: 536870912 },
      ]);
    }),

    http.post('/api/settings/categories', async ({ request }) => {
      const body = (await request.json()) as { name: string; description?: string; minSize?: number; maxSize?: number };
      return sendSuccess({
        id: Date.now(),
        name: body.name,
        description: body.description ?? null,
        minSize: body.minSize ?? null,
        maxSize: body.maxSize ?? null,
      }, 201);
    }),

    http.put('/api/settings/categories/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({
        id,
        name: body.name ?? 'Updated Category',
        description: body.description ?? null,
        minSize: body.minSize ?? null,
        maxSize: body.maxSize ?? null,
      });
    }),

    http.delete('/api/settings/categories/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id) });
    }),

    http.get('/api/settings/proxies', () => {
      return sendSuccess([
        { id: 1, name: 'Default Proxy', type: 'http', hostname: 'proxy.example', port: 8080, username: null, password: null, enabled: true },
      ]);
    }),

    http.post('/api/settings/proxies', async ({ request }) => {
      const body = (await request.json()) as { name: string; type: string; hostname: string; port: number; username?: string; password?: string; enabled?: boolean };
      return sendSuccess({
        id: Date.now(),
        name: body.name,
        type: body.type,
        hostname: body.hostname,
        port: body.port,
        username: body.username ?? null,
        password: body.password ?? null,
        enabled: body.enabled ?? true,
      }, 201);
    }),

    http.put('/api/settings/proxies/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({
        id,
        name: body.name ?? 'Updated Proxy',
        type: body.type ?? 'http',
        hostname: body.hostname ?? 'proxy.example',
        port: body.port ?? 8080,
        username: body.username ?? null,
        password: body.password ?? null,
        enabled: body.enabled ?? true,
      });
    }),

    http.delete('/api/settings/proxies/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id) });
    }),

    http.get('/api/quality-profiles', () => {
      return sendSuccess([
        { id: 1, name: 'HD-1080p', cutoff: 7, items: [{ quality: { id: 1, name: 'HDTV-720p', source: 'television', resolution: '720p' }, allowed: true }], languageProfileId: null },
        { id: 2, name: 'UHD-2160p', cutoff: 9, items: [{ quality: { id: 1, name: 'HDTV-2160p', source: 'television', resolution: '2160p' }, allowed: true }], languageProfileId: null },
      ]);
    }),

    http.get('/api/quality-profiles/:id', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess({
        id,
        name: `Profile ${id}`,
        cutoff: 7,
        items: [{ quality: { id: 1, name: 'HDTV-720p', source: 'television', resolution: '720p' }, allowed: true }],
        languageProfileId: null,
      });
    }),

    http.post('/api/quality-profiles', async ({ request }) => {
      const body = (await request.json()) as { name: string; cutoff: number; items: unknown[]; languageProfileId?: number | null };
      return sendSuccess({
        id: Date.now(),
        name: body.name,
        cutoff: body.cutoff,
        items: body.items,
        languageProfileId: body.languageProfileId ?? null,
      }, 201);
    }),

    http.put('/api/quality-profiles/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({
        id,
        name: body.name ?? `Profile ${id}`,
        cutoff: body.cutoff ?? 7,
        items: body.items ?? [],
        languageProfileId: body.languageProfileId ?? null,
      });
    }),

    http.delete('/api/quality-profiles/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), name: `Profile ${params.id}`, cutoff: 7, items: [], languageProfileId: null });
    }),

    http.get('/api/quality-definitions', () => {
      return sendSuccess([
        { id: 1, name: 'HDTV-720p', source: 'television', resolution: '720p', weight: 1 },
        { id: 2, name: 'WEBDL-720p', source: 'web', resolution: '720p', weight: 2 },
        { id: 3, name: 'Bluray-720p', source: 'bluray', resolution: '720p', weight: 3 },
        { id: 4, name: 'HDTV-1080p', source: 'television', resolution: '1080p', weight: 4 },
        { id: 5, name: 'WEBDL-1080p', source: 'web', resolution: '1080p', weight: 5 },
        { id: 6, name: 'Bluray-1080p', source: 'bluray', resolution: '1080p', weight: 6 },
        { id: 7, name: 'HDTV-2160p', source: 'television', resolution: '2160p', weight: 7 },
        { id: 8, name: 'WEBDL-2160p', source: 'web', resolution: '2160p', weight: 8 },
        { id: 9, name: 'Bluray-2160p', source: 'bluray', resolution: '2160p', weight: 9 },
      ]);
    }),

    http.get('/api/download-client', () => {
      return sendSuccess({
        maxActiveDownloads: 3,
        maxActiveSeeds: 5,
        globalDownloadLimitKbps: null,
        globalUploadLimitKbps: null,
        incompleteDirectory: '/tmp/incomplete',
        completeDirectory: '/tmp/complete',
        seedRatioLimit: 1.5,
        seedTimeLimitMinutes: 60,
        seedLimitAction: 'pause',
      });
    }),

    http.put('/api/download-client', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({
        maxActiveDownloads: body.maxActiveDownloads ?? 3,
        maxActiveSeeds: body.maxActiveSeeds ?? 5,
        globalDownloadLimitKbps: body.globalDownloadLimitKbps ?? null,
        globalUploadLimitKbps: body.globalUploadLimitKbps ?? null,
        incompleteDirectory: body.incompleteDirectory ?? '/tmp/incomplete',
        completeDirectory: body.completeDirectory ?? '/tmp/complete',
        seedRatioLimit: body.seedRatioLimit ?? 1.5,
        seedTimeLimitMinutes: body.seedTimeLimitMinutes ?? 60,
        seedLimitAction: body.seedLimitAction ?? 'pause',
      });
    }),

    // ─── Phase S3: System & operations handlers ───────────────────────────

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
      return HttpResponse.json(
        { ok: true, data: [{ id: 1, timestamp: new Date().toISOString(), level: 'info', type: 'system', message: 'Export event' }] },
        {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="system-events.json"' },
        },
      );
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

    // Operations routes (activity CRUD, health baseline already exists above)

    http.delete('/api/activity', () => {
      return sendSuccess({ deletedCount: 0 });
    }),

    http.get('/api/activity/export', () => {
      return HttpResponse.json(
        { ok: true, data: { items: [], totalCount: 0, exportedAt: new Date().toISOString() } },
        {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="activity-export.json"' },
        },
      );
    }),

    http.patch('/api/activity/:id/fail', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess({ id, success: false, eventType: 'IMPORT_COMPLETED', sourceModule: 'ImportManager', entityRef: `movie:${id}`, summary: 'Import failed', details: null, occurredAt: new Date().toISOString() });
    }),

    http.post('/api/activity/:id/retry-import', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess({ id, retried: true }, 202);
    }),

    // Stats routes

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

export const handlers = createHandlers('deterministic');
