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

    http.get('/api/movies', ({ request }) => {
      const url = new URL(request.url);
      const search = url.searchParams.get('search')?.toLowerCase();
      const filtered = search
        ? dataset.movies.filter(movie => movie.title.toLowerCase().includes(search))
        : dataset.movies;

      return sendPaginated(filtered, numberQuery(url, 'page', 1), numberQuery(url, 'pageSize', 25));
    }),

    http.get('/api/movies/:id', ({ params }) => {
      const id = Number(params.id);
      const found = dataset.movies.find(item => item.id === id);
      return found ? sendSuccess(found) : sendError('NOT_FOUND', `Movie ${id} not found`, 404);
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
