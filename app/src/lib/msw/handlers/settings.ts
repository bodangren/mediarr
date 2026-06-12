import { http } from 'msw';
import {
  createMockCategory,
  createMockDataset,
  createMockDownloadClientSettings,
  createMockMediaNamingSettings,
  createMockProxy,
  createMockQualityDefinitions,
  createMockQualityProfile,
  type FactoryMode,
} from '../factories';
import { sendSuccess } from './helpers';

export function createSettingsHandlers(mode: FactoryMode = 'deterministic') {
  const dataset = createMockDataset(mode);

  return [
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
      return sendSuccess(createMockMediaNamingSettings());
    }),

    http.put('/api/settings/media', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess(createMockMediaNamingSettings({
        movieRootFolder: typeof body.movieRootFolder === 'string' ? body.movieRootFolder : undefined,
        tvRootFolder: typeof body.tvRootFolder === 'string' ? body.tvRootFolder : undefined,
        movieNamingPattern: typeof body.movieNamingPattern === 'string' ? body.movieNamingPattern : undefined,
        seriesNamingPattern: typeof body.seriesNamingPattern === 'string' ? body.seriesNamingPattern : undefined,
      }));
    }),

    http.get('/api/settings/categories', () => {
      return sendSuccess([
        createMockCategory(1),
        createMockCategory(2),
        createMockCategory(3),
        createMockCategory(4),
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
      return sendSuccess([createMockProxy(1)]);
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
      return sendSuccess(createMockProxy(1, {
        id,
        name: typeof body.name === 'string' ? body.name : undefined,
        type: typeof body.type === 'string' ? body.type : undefined,
        hostname: typeof body.hostname === 'string' ? body.hostname : undefined,
        port: typeof body.port === 'number' ? body.port : undefined,
        username: typeof body.username === 'string' ? body.username : undefined,
        password: typeof body.password === 'string' ? body.password : undefined,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      }));
    }),

    http.delete('/api/settings/proxies/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id) });
    }),

    http.get('/api/quality-profiles', () => {
      return sendSuccess([
        createMockQualityProfile(1),
        createMockQualityProfile(2),
      ]);
    }),

    http.get('/api/quality-profiles/:id', ({ params }) => {
      const id = Number(params.id);
      return sendSuccess(createMockQualityProfile(id));
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
      const id = Number(params.id);
      return sendSuccess({ id, name: `Profile ${id}`, cutoff: 7, items: [], languageProfileId: null });
    }),

    http.get('/api/quality-definitions', () => {
      return sendSuccess(createMockQualityDefinitions());
    }),

    http.get('/api/download-client', () => {
      return sendSuccess(createMockDownloadClientSettings());
    }),

    http.put('/api/download-client', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess(createMockDownloadClientSettings({
        maxActiveDownloads: typeof body.maxActiveDownloads === 'number' ? body.maxActiveDownloads : undefined,
        maxActiveSeeds: typeof body.maxActiveSeeds === 'number' ? body.maxActiveSeeds : undefined,
        globalDownloadLimitKbps: typeof body.globalDownloadLimitKbps === 'number' ? body.globalDownloadLimitKbps : undefined,
        globalUploadLimitKbps: typeof body.globalUploadLimitKbps === 'number' ? body.globalUploadLimitKbps : undefined,
        incompleteDirectory: typeof body.incompleteDirectory === 'string' ? body.incompleteDirectory : undefined,
        completeDirectory: typeof body.completeDirectory === 'string' ? body.completeDirectory : undefined,
        seedRatioLimit: typeof body.seedRatioLimit === 'number' ? body.seedRatioLimit : undefined,
        seedTimeLimitMinutes: typeof body.seedTimeLimitMinutes === 'number' ? body.seedTimeLimitMinutes : undefined,
        seedLimitAction: typeof body.seedLimitAction === 'string' ? body.seedLimitAction : undefined,
      }));
    }),
  ];
}
