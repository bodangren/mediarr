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

    // ─── Phase S4: Subtitle & playback handlers ──────────────────────────

    http.get('/api/subtitles/wanted/movies', () => {
      return sendSuccess(dataset.movies.filter(m => m.fileVariants.length === 0).map(m => ({
        id: m.id,
        tmdbId: m.tmdbId,
        title: m.title,
        year: m.year,
        monitored: m.monitored,
      })));
    }),

    http.get('/api/subtitles/wanted/series', () => {
      return sendSuccess(dataset.series.filter(s =>
        s.seasons.some(season => season.episodes.some(e => e.path === null)),
      ).map(s => ({
        id: s.id,
        tvdbId: s.tvdbId,
        title: s.title,
        year: s.year,
        monitored: s.monitored,
      })));
    }),

    http.get('/api/subtitles/wanted/count', () => {
      const moviesCount = dataset.movies.filter(m => m.fileVariants.length === 0).length;
      const seriesCount = dataset.series.filter(s =>
        s.seasons.some(season => season.episodes.some(e => e.path === null)),
      ).length;
      return sendSuccess({ seriesCount, moviesCount, totalCount: seriesCount + moviesCount });
    }),

    http.get('/api/subtitles/history', () => {
      return sendSuccess([
        { id: 1, subtitleId: 'sub-1', languageCode: 'en', provider: 'opensubtitles', movieId: null, seriesId: 1, seasonNumber: 1, episodeNumber: 1, downloadedAt: new Date().toISOString(), status: 'downloaded' },
      ]);
    }),

    http.get('/api/subtitles/history/stats', () => {
      return sendSuccess({
        period: '30d',
        downloads: 15,
        byProvider: [{ provider: 'opensubtitles', count: 10 }, { provider: 'addic7ed', count: 5 }],
        byLanguage: [{ languageCode: 'en', count: 12 }, { languageCode: 'fr', count: 3 }],
      });
    }),

    http.delete('/api/subtitles/history', () => {
      return sendSuccess({ deletedCount: 1 });
    }),

    http.get('/api/subtitles/providers', () => {
      return sendSuccess([
        { id: 'opensubtitles', name: 'OpenSubtitles', enabled: true, languages: ['en', 'fr'], implementation: 'OpenSubtitles' },
        { id: 'addic7ed', name: 'Addic7ed', enabled: false, languages: ['en'], implementation: 'Addic7ed' },
      ]);
    }),

    http.get('/api/subtitles/providers/opensubtitles', () => {
      return sendSuccess({ id: 'opensubtitles', name: 'OpenSubtitles', enabled: true, languages: ['en', 'fr'], implementation: 'OpenSubtitles', apiKey: '***' });
    }),

    http.put('/api/subtitles/providers/opensubtitles', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({ id: 'opensubtitles', name: 'OpenSubtitles', enabled: true, languages: ['en', 'fr'], implementation: 'OpenSubtitles', ...body });
    }),

    http.post('/api/subtitles/providers/opensubtitles/test', () => {
      return sendSuccess({ success: true, message: 'Connection successful' });
    }),

    http.post('/api/subtitles/providers/opensubtitles/reset', () => {
      return sendSuccess({ reset: true });
    }),

    http.get('/api/subtitles/blacklist/movies', () => {
      return sendSuccess([
        { id: 1, movieId: 1, languageCode: 'en', reason: 'Poor quality' },
      ]);
    }),

    http.get('/api/subtitles/blacklist/series', () => {
      return sendSuccess([
        { id: 2, seriesId: 1, seasonNumber: 1, episodeNumber: 1, languageCode: 'fr', reason: 'Wrong language' },
      ]);
    }),

    http.delete('/api/subtitles/blacklist/1', () => {
      return sendSuccess({ id: 1, deleted: true });
    }),

    http.delete('/api/subtitles/blacklist/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    http.delete('/api/subtitles/blacklist/movies', () => {
      return sendSuccess({ deletedCount: 1 });
    }),

    http.delete('/api/subtitles/blacklist/series', () => {
      return sendSuccess({ deletedCount: 1 });
    }),

    http.get('/api/playback/continue-watching', () => {
      return sendSuccess([
        { mediaType: 'movie', mediaId: 1, title: 'Continue Movie', position: 3600, duration: 7200, lastWatchedAt: new Date().toISOString() },
      ]);
    }),

    http.get('/api/playback/1', () => {
      return sendSuccess({ id: 1, mediaType: 'movie', mediaId: 1, sources: [{ url: '/api/stream/1', quality: '1080p' }] });
    }),

    http.get('/api/playback/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), mediaType: 'movie', mediaId: Number(params.id), sources: [{ url: `/api/stream/${params.id}`, quality: '1080p' }] });
    }),

    http.post('/api/playback/progress', () => {
      return sendSuccess({ saved: true });
    }),

    http.get('/api/playback/subtitles/1', () => {
      return sendSuccess({ trackId: '1', language: 'en', url: '/api/stream/subtitles/1.vtt' });
    }),

    http.get('/api/playback/subtitles/:trackId', ({ params }) => {
      return sendSuccess({ trackId: params.trackId, language: 'en', url: `/api/stream/subtitles/${params.trackId}.vtt` });
    }),

    http.get('/api/stream/1', () => {
      return new HttpResponse('stream-data', {
        status: 200,
        headers: { 'content-type': 'video/mp4' },
      });
    }),

    http.get('/api/stream/:id', ({ params }) => {
      return new HttpResponse(`stream-data-${params.id}`, {
        status: 200,
        headers: { 'content-type': 'video/mp4' },
      });
    }),

    // ─── Phase S5: Remaining domain handlers ─────────────────────────────

    // Backup routes — schedule literals BEFORE /:id catch-all
    http.get('/api/backups', () => {
      return sendSuccess([
        { id: 1, name: 'backup-2026-06-12.db', size: 1_048_576, createdAt: new Date().toISOString() },
        { id: 2, name: 'backup-2026-06-11.db', size: 1_040_000, createdAt: new Date(Date.now() - 86400000).toISOString() },
      ]);
    }),

    http.post('/api/backups', async ({ request }) => {
      const body = (await request.json()) as { name?: string };
      return sendSuccess({ id: Date.now(), name: body.name ?? `backup-${new Date().toISOString().slice(0, 10)}.db`, size: 0, createdAt: new Date().toISOString() }, 201);
    }),

    http.get('/api/backups/schedule', () => {
      return sendSuccess({ enabled: true, interval: 'daily', retentionDays: 30, lastRun: null, nextRun: new Date(Date.now() + 86400000).toISOString() });
    }),

    http.patch('/api/backups/schedule', async ({ request }) => {
      const body = (await request.json()) as { enabled?: boolean; interval?: string; retentionDays?: number };
      return sendSuccess({ enabled: body.enabled ?? true, interval: body.interval ?? 'daily', retentionDays: body.retentionDays ?? 30, lastRun: null, nextRun: new Date(Date.now() + 86400000).toISOString() });
    }),

    http.delete('/api/backups/1', () => {
      return sendSuccess({ id: 1, deleted: true });
    }),

    http.delete('/api/backups/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    http.post('/api/backups/1/restore', () => {
      return sendSuccess({ id: 1, restored: true });
    }),

    http.post('/api/backups/:id/restore', ({ params }) => {
      return sendSuccess({ id: Number(params.id), restored: true });
    }),

    http.post('/api/backups/1/download', () => {
      return HttpResponse.json(
        { ok: true, data: { id: 1, filename: 'backup-1.db' } },
        {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="backup-1.db"' },
        },
      );
    }),

    http.post('/api/backups/:id/download', ({ params }) => {
      return HttpResponse.json(
        { ok: true, data: { id: Number(params.id), filename: `backup-${params.id}.db` } },
        {
          status: 200,
          headers: { 'Content-Disposition': `attachment; filename="backup-${params.id}.db"` },
        },
      );
    }),

    // Blocklist routes — clear/remove literals BEFORE /:id catch-all
    http.get('/api/blocklist', () => {
      return sendSuccess([
        { id: 1, title: 'Bad Release', indexer: 'Indexer 1', reason: 'Poor quality', createdAt: new Date().toISOString() },
      ]);
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

    http.delete('/api/blocklist/1', () => {
      return sendSuccess({ id: 1, deleted: true });
    }),

    http.delete('/api/blocklist/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    // Calendar route
    http.get('/api/calendar', ({ request }) => {
      const url = new URL(request.url);
      const start = url.searchParams.get('start');
      const end = url.searchParams.get('end');
      return sendSuccess([
        { id: 1, seriesId: 1, seriesTitle: 'Example Series', seasonNumber: 2, episodeNumber: 1, title: 'Episode 1', airDate: start ?? new Date().toISOString(), monitored: true },
      ]);
    }),

    // Collection routes — /:id/search and /:id/sync are POST so no GET /:id collision
    http.get('/api/collections', () => {
      return sendSuccess([
        { id: 1, name: 'Marvel Cinematic Universe', type: 'movie', monitored: true, movieCount: 30 },
        { id: 2, name: 'Breaking Bad Collection', type: 'series', monitored: true, seriesCount: 1 },
      ]);
    }),

    http.get('/api/collections/1', () => {
      return sendSuccess({ id: 1, name: 'Marvel Cinematic Universe', type: 'movie', monitored: true, movieCount: 30 });
    }),

    http.get('/api/collections/:id', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess({ id, name: `Collection ${id}`, type: 'movie', monitored: true, movieCount: 10 });
    }),

    http.post('/api/collections', async ({ request }) => {
      const body = (await request.json()) as { name?: string; type?: string };
      return sendSuccess({ id: Date.now(), name: body.name ?? 'New Collection', type: body.type ?? 'movie', monitored: true, movieCount: 0 }, 201);
    }),

    http.put('/api/collections/1', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({ id: 1, name: body.name ?? 'Marvel Cinematic Universe', type: body.type ?? 'movie', monitored: body.monitored ?? true, movieCount: 30 });
    }),

    http.put('/api/collections/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({ id, name: body.name ?? `Collection ${id}`, type: body.type ?? 'movie', monitored: body.monitored ?? true, movieCount: 10 });
    }),

    http.delete('/api/collections/1', () => {
      return sendSuccess({ id: 1, deleted: true });
    }),

    http.delete('/api/collections/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    http.post('/api/collections/1/search', () => {
      return sendSuccess({ collectionId: 1, results: [{ tmdbId: 12345, title: 'Search Result', year: 2024 }] });
    }),

    http.post('/api/collections/:id/search', ({ params }) => {
      return sendSuccess({ collectionId: Number(params.id), results: [{ tmdbId: 12345, title: 'Search Result', year: 2024 }] });
    }),

    http.post('/api/collections/1/sync', () => {
      return sendSuccess({ collectionId: 1, synced: true, added: 0, removed: 0 });
    }),

    http.post('/api/collections/:id/sync', ({ params }) => {
      return sendSuccess({ collectionId: Number(params.id), synced: true, added: 0, removed: 0 });
    }),

    // Custom format routes — schema literal BEFORE /:id catch-all
    http.get('/api/custom-formats', () => {
      return sendSuccess([
        { id: 1, name: 'HDR', type: 'quality', specifications: [] },
        { id: 2, name: 'Atmos Audio', type: 'audio', specifications: [] },
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

    http.get('/api/custom-formats/1', () => {
      return sendSuccess({ id: 1, name: 'HDR', type: 'quality', specifications: [] });
    }),

    http.get('/api/custom-formats/:id', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess({ id, name: `Custom Format ${id}`, type: 'quality', specifications: [] });
    }),

    http.post('/api/custom-formats', async ({ request }) => {
      const body = (await request.json()) as { name?: string; type?: string };
      return sendSuccess({ id: Date.now(), name: body.name ?? 'New Format', type: body.type ?? 'quality', specifications: [] }, 201);
    }),

    http.put('/api/custom-formats/1', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({ id: 1, name: body.name ?? 'HDR', type: body.type ?? 'quality', specifications: body.specifications ?? [] });
    }),

    http.put('/api/custom-formats/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({ id, name: body.name ?? `Format ${id}`, type: body.type ?? 'quality', specifications: body.specifications ?? [] });
    }),

    http.delete('/api/custom-formats/1', () => {
      return sendSuccess({ id: 1, deleted: true });
    }),

    http.delete('/api/custom-formats/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    http.post('/api/custom-formats/1/test', async ({ request }) => {
      const body = (await request.json()) as { sample?: string };
      return sendSuccess({ formatId: 1, matched: true, sample: body.sample ?? '', score: 100 });
    }),

    http.post('/api/custom-formats/:id/test', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as { sample?: string };
      return sendSuccess({ formatId: id, matched: true, sample: body.sample ?? '', score: 100 });
    }),

    // Import list routes — exclusions/providers literals BEFORE /:id catch-all
    http.get('/api/import-lists', () => {
      return sendSuccess([
        { id: 1, name: 'TMDB Popular Movies', enabled: true, implementation: 'TMDbImportList' },
        { id: 2, name: 'Trakt Watchlist', enabled: false, implementation: 'TraktImportList' },
      ]);
    }),

    http.get('/api/import-lists/exclusions', () => {
      return sendSuccess([
        { id: 1, tmdbId: 99999, title: 'Excluded Movie', movieYear: 2020 },
      ]);
    }),

    http.get('/api/import-lists/providers', () => {
      return sendSuccess([
        { id: 'tmdb', name: 'TMDb', enabled: true, implementation: 'TMDbImportList' },
        { id: 'trakt', name: 'Trakt', enabled: false, implementation: 'TraktImportList' },
      ]);
    }),

    http.get('/api/import-lists/1', () => {
      return sendSuccess({ id: 1, name: 'TMDB Popular Movies', enabled: true, implementation: 'TMDbImportList' });
    }),

    http.get('/api/import-lists/:id', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess({ id, name: `Import List ${id}`, enabled: true, implementation: 'TMDbImportList' });
    }),

    http.post('/api/import-lists', async ({ request }) => {
      const body = (await request.json()) as { name?: string; implementation?: string };
      return sendSuccess({ id: Date.now(), name: body.name ?? 'New Import List', enabled: true, implementation: body.implementation ?? 'TMDbImportList' }, 201);
    }),

    http.put('/api/import-lists/1', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({ id: 1, name: body.name ?? 'TMDB Popular Movies', enabled: body.enabled ?? true, implementation: body.implementation ?? 'TMDbImportList' });
    }),

    http.put('/api/import-lists/:id', async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess({ id, name: body.name ?? `Import List ${id}`, enabled: body.enabled ?? true, implementation: body.implementation ?? 'TMDbImportList' });
    }),

    http.delete('/api/import-lists/1', () => {
      return sendSuccess({ id: 1, deleted: true });
    }),

    http.delete('/api/import-lists/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    http.post('/api/import-lists/1/sync', () => {
      return sendSuccess({ listId: 1, synced: true, added: 0, removed: 0 });
    }),

    http.post('/api/import-lists/:id/sync', ({ params }) => {
      return sendSuccess({ listId: Number(params.id), synced: true, added: 0, removed: 0 });
    }),

    http.post('/api/import-lists/exclusions', async ({ request }) => {
      const body = (await request.json()) as { tmdbId?: number; title?: string };
      return sendSuccess({ id: Date.now(), tmdbId: body.tmdbId ?? 0, title: body.title ?? 'Excluded', movieYear: null }, 201);
    }),

    http.delete('/api/import-lists/exclusions/1', () => {
      return sendSuccess({ id: 1, deleted: true });
    }),

    http.delete('/api/import-lists/exclusions/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    // Log routes — download/clear literals on :filename BEFORE /:filename catch-all
    http.get('/api/logs/files', () => {
      return sendSuccess([
        { filename: 'mediarr.log', size: 102_400, lastModified: new Date().toISOString() },
        { filename: 'mediarr.error.log', size: 51_200, lastModified: new Date().toISOString() },
      ]);
    }),

    http.get('/api/logs/files/mediarr.log/download', () => {
      return HttpResponse.json(
        { ok: true, data: { filename: 'mediarr.log', content: 'log file content' } },
        {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="mediarr.log"' },
        },
      );
    }),

    http.get('/api/logs/files/:filename/download', ({ params }) => {
      return HttpResponse.json(
        { ok: true, data: { filename: params.filename, content: 'log file content' } },
        {
          status: 200,
          headers: { 'Content-Disposition': `attachment; filename="${params.filename}"` },
        },
      );
    }),

    http.delete('/api/logs/files/mediarr.log', () => {
      return sendSuccess({ filename: 'mediarr.log', deleted: true });
    }),

    http.delete('/api/logs/files/:filename', ({ params }) => {
      return sendSuccess({ filename: params.filename, deleted: true });
    }),

    http.post('/api/logs/files/mediarr.log/clear', () => {
      return sendSuccess({ filename: 'mediarr.log', cleared: true });
    }),

    http.post('/api/logs/files/:filename/clear', ({ params }) => {
      return sendSuccess({ filename: params.filename, cleared: true });
    }),

    http.get('/api/logs/files/mediarr.log', () => {
      return sendSuccess({ filename: 'mediarr.log', content: '[2026-06-12 10:00:00] INFO: System started\n[2026-06-12 10:00:01] INFO: Indexers loaded' });
    }),

    http.get('/api/logs/files/:filename', ({ params }) => {
      return sendSuccess({ filename: params.filename, content: '[2026-06-12 10:00:00] INFO: System started\n[2026-06-12 10:00:01] INFO: Indexers loaded' });
    }),

    // Update routes
    http.get('/api/updates/current', () => {
      return sendSuccess({ version: '1.0.0', branch: 'main', commit: 'abc123', releaseDate: '2026-06-01' });
    }),

    http.get('/api/updates/available', () => {
      return sendSuccess({ available: true, version: '1.1.0', releaseDate: '2026-06-10', changelog: 'Bug fixes and improvements' });
    }),

    http.get('/api/updates/check', () => {
      return sendSuccess({ checked: true, updateAvailable: false });
    }),

    http.get('/api/updates/history', () => {
      return sendSuccess([
        { version: '1.0.0', installedAt: '2026-06-01T00:00:00Z', status: 'success' },
      ]);
    }),

    http.post('/api/updates/check', () => {
      return sendSuccess({ checked: true, updateAvailable: true, version: '1.1.0' });
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
        { path: '/media', freeBytes: 500_000_000_000, totalBytes: 1_000_000_000_000, usedPercent: 50 },
        { path: '/data', freeBytes: 100_000_000_000, totalBytes: 200_000_000_000, usedPercent: 50 },
      ]);
    }),

    http.get('/api/dashboard/upcoming', () => {
      return sendSuccess([
        { id: 1, seriesId: 1, seriesTitle: 'Example Series', seasonNumber: 2, episodeNumber: 2, title: 'Episode 2', airDate: new Date(Date.now() + 7 * 86400000).toISOString(), monitored: true },
      ]);
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

    http.get('/api/images/proxy', ({ request }) => {
      const url = new URL(request.url);
      const imageUrl = url.searchParams.get('url') ?? '';
      return HttpResponse.json(
        { ok: true, data: { url: imageUrl, contentType: 'image/jpeg' } },
        {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="image.jpg"' },
        },
      );
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

    // Torrent S5 additions — bulk, retry-import, priority
    http.post('/api/torrents/bulk', async ({ request }) => {
      const body = (await request.json()) as { infoHashes?: string[]; action?: string };
      return sendSuccess({ processed: body.infoHashes?.length ?? 0, action: body.action ?? 'pause' });
    }),

    http.post('/api/torrents/abc123/retry-import', () => {
      return sendSuccess({ infoHash: 'abc123', retried: true });
    }),

    http.post('/api/torrents/:infoHash/retry-import', ({ params }) => {
      return sendSuccess({ infoHash: params.infoHash, retried: true });
    }),

    http.patch('/api/torrents/abc123/priority', async ({ request }) => {
      const body = (await request.json()) as { priority?: string };
      return sendSuccess({ infoHash: 'abc123', priority: body.priority ?? 'normal' });
    }),

    http.patch('/api/torrents/:infoHash/priority', async ({ params, request }) => {
      const body = (await request.json()) as { priority?: string };
      return sendSuccess({ infoHash: params.infoHash, priority: body.priority ?? 'normal' });
    }),

    // ─── End Phase S5 ────────────────────────────────────────────────────

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
