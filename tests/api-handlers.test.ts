import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiServer } from '../server/src/api/createApiServer';

function buildMultipartPayload(input: {
  fields: Record<string, string>;
  file: {
    fieldName: string;
    filename: string;
    contentType: string;
    content: string;
  };
}): { body: string; boundary: string } {
  const boundary = `----mediarr-${Date.now()}`;
  const lines: string[] = [];

  for (const [key, value] of Object.entries(input.fields)) {
    lines.push(`--${boundary}`);
    lines.push(`Content-Disposition: form-data; name="${key}"`);
    lines.push('');
    lines.push(value);
  }

  lines.push(`--${boundary}`);
  lines.push(
    `Content-Disposition: form-data; name="${input.file.fieldName}"; filename="${input.file.filename}"`,
  );
  lines.push(`Content-Type: ${input.file.contentType}`);
  lines.push('');
  lines.push(input.file.content);
  lines.push(`--${boundary}--`);
  lines.push('');

  return {
    body: lines.join('\r\n'),
    boundary,
  };
}

function createDependencies() {
  const seriesRows = [
    {
      id: 1,
      title: 'Andor',
      year: 2022,
      status: 'continuing',
      monitored: true,
      seasons: [],
      qualityProfile: { id: 1, name: 'HD-1080p' },
    },
  ];
  const movieRows = [
    {
      id: 2,
      tmdbId: 603,
      title: 'The Matrix',
      year: 1999,
      status: 'released',
      monitored: true,
      fileVariants: [],
      qualityProfile: { id: 1, name: 'HD-1080p' },
    },
  ];

  const prisma = {
    series: {
      findMany: vi.fn().mockResolvedValue(seriesRows),
      findUnique: vi.fn().mockImplementation(async ({ where }) => seriesRows.find(item => item.id === where.id) ?? null),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data })),
      delete: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: 22, ...data })),
    },
    movie: {
      findMany: vi.fn().mockResolvedValue(movieRows),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id !== undefined) {
          return movieRows.find(item => item.id === where.id) ?? null;
        }
        if (where.tmdbId !== undefined) {
          return movieRows.find(item => item.tmdbId === where.tmdbId) ?? null;
        }
        return null;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data })),
      delete: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: 33, ...data })),
    },
    torrent: {
      count: vi.fn().mockResolvedValue(0),
    },
    episode: {
      update: vi.fn().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data })),
    },
  };

  const deps = {
    prisma,
    mediaService: {
      setMonitored: vi.fn().mockImplementation(async (id: number, monitored: boolean) => ({ id, monitored })),
      setEpisodeMonitored: vi.fn().mockImplementation(async (id: number, monitored: boolean) => ({ id, monitored })),
      deleteMedia: vi.fn().mockResolvedValue(undefined),
      getMovieCandidatesForSearch: vi.fn().mockResolvedValue([
        { id: 2, tmdbId: 603, title: 'The Matrix', year: 1999, monitored: true, status: 'released' },
      ]),
    },
    mediaSearchService: {
      getSearchCandidates: vi.fn().mockResolvedValue([
        { indexer: 'IndexerA', title: 'Result', size: 1000, seeders: 20, magnetUrl: 'magnet:?xt=urn:btih:abc' },
      ]),
      grabRelease: vi.fn().mockResolvedValue({ infoHash: 'abc123', name: 'Result' }),
      grabReleaseByGuid: vi.fn().mockResolvedValue({ infoHash: 'abc123', name: 'Result' }),
      searchAllIndexers: vi.fn().mockResolvedValue({
        releases: [
          {
            guid: 'release-guid',
            indexerId: 1,
            title: 'Result',
            size: 1000,
            seeders: 20,
            leechers: 1,
            indexer: 'IndexerA',
          },
        ],
      }),
      searchMovie: vi.fn().mockResolvedValue({ infoHash: 'abc123' }),
    },
    wantedService: {
      getMissingEpisodes: vi.fn().mockResolvedValue([
        {
          id: 11,
          seriesId: 1,
          seasonNumber: 1,
          episodeNumber: 2,
          title: 'Episode 2',
          monitored: true,
          airDateUtc: new Date('2024-01-01T00:00:00.000Z'),
          series: { title: 'Andor' },
        },
      ]),
    },
    torrentManager: {
      getTorrentsStatus: vi.fn().mockResolvedValue([
        {
          infoHash: 'abc123',
          name: 'Result',
          status: 'downloading',
          size: '1000',
          downloaded: '500',
          uploaded: '50',
        },
      ]),
      getTorrentStatus: vi.fn().mockResolvedValue({
        infoHash: 'abc123',
        name: 'Result',
        status: 'downloading',
        size: '1000',
        downloaded: '500',
        uploaded: '50',
      }),
      addTorrent: vi.fn().mockResolvedValue({
        infoHash: 'abc123',
        name: 'Result',
      }),
      pauseTorrent: vi.fn().mockResolvedValue(undefined),
      resumeTorrent: vi.fn().mockResolvedValue(undefined),
      removeTorrent: vi.fn().mockResolvedValue(undefined),
      setSpeedLimits: vi.fn(),
    },
    indexerRepository: {
      findAll: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Indexer One',
          implementation: 'Torznab',
          configContract: 'TorznabSettings',
          settings: '{}',
          protocol: 'torrent',
          enabled: true,
          supportsRss: true,
          supportsSearch: true,
          priority: 25,
          added: new Date('2026-02-11T00:00:00.000Z'),
        },
      ]),
      findById: vi.fn().mockResolvedValue({
        id: 1,
        name: 'Indexer One',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: '{}',
        protocol: 'torrent',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
        added: new Date('2026-02-11T00:00:00.000Z'),
      }),
      create: vi.fn().mockImplementation(async data => ({ id: 9, ...data })),
      update: vi.fn().mockImplementation(async (id, data) => ({ id, ...data })),
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    },
    indexerTester: {
      test: vi.fn().mockResolvedValue({ success: false, message: 'HTTP timeout' }),
    },
    indexerFactory: {
      fromDatabaseRecord: vi.fn().mockImplementation(record => record),
    },
    indexerHealthRepository: {
      getByIndexerId: vi.fn().mockResolvedValue({
        indexerId: 1,
        failureCount: 4,
        lastErrorMessage: 'timeout',
        lastSuccessAt: null,
        lastFailureAt: new Date('2026-02-11T11:00:00.000Z'),
      }),
    },
    subtitleInventoryApiService: {
      listMovieVariantInventory: vi.fn().mockResolvedValue([{ variantId: 7, path: '/tmp/a.mkv' }]),
      listEpisodeVariantInventory: vi.fn().mockResolvedValue([{ variantId: 8, path: '/tmp/b.mkv' }]),
      manualSearch: vi.fn().mockResolvedValue([
        { languageCode: 'en', isForced: false, isHi: false, provider: 'opensubtitles', score: 99 },
      ]),
      manualDownload: vi.fn().mockResolvedValue({ storedPath: '/tmp/movie.en.srt' }),
      uploadSubtitle: vi.fn().mockResolvedValue({
        id: 99,
        mediaId: 2,
        mediaType: 'movie',
        filePath: '/data/subtitles/The.Matrix.en.srt',
        language: 'en',
        forced: false,
        hearingImpaired: false,
      }),
    },
    settingsService: {
      get: vi.fn().mockResolvedValue({
        torrentLimits: { maxActiveDownloads: 3, maxActiveSeeds: 3, globalDownloadLimitKbps: null, globalUploadLimitKbps: null },
        schedulerIntervals: { rssSyncMinutes: 15, availabilityCheckMinutes: 30, torrentMonitoringSeconds: 5 },
        pathVisibility: { showDownloadPath: true, showMediaPath: true },
      }),
      update: vi.fn().mockImplementation(async input => ({
        torrentLimits: { maxActiveDownloads: 4, maxActiveSeeds: 3, globalDownloadLimitKbps: null, globalUploadLimitKbps: null },
        schedulerIntervals: { rssSyncMinutes: 15, availabilityCheckMinutes: 30, torrentMonitoringSeconds: 5 },
        pathVisibility: { showDownloadPath: true, showMediaPath: true },
        ...input,
      })),
    },
    activityEventRepository: {
      query: vi.fn().mockResolvedValue({
        items: [{ id: 1, eventType: 'MEDIA_ADDED', summary: 'Added', occurredAt: new Date('2026-02-11T11:00:00.000Z') }],
        total: 1,
        page: 1,
        pageSize: 25,
      }),
      clear: vi.fn().mockResolvedValue(3),
      markAsFailed: vi.fn().mockResolvedValue({
        id: 1,
        eventType: 'RELEASE_GRABBED',
        summary: 'Marked failed',
        success: false,
        occurredAt: new Date('2026-02-11T11:00:00.000Z'),
      }),
      export: vi.fn().mockResolvedValue([
        {
          id: 1,
          eventType: 'MEDIA_ADDED',
          summary: 'Added',
          success: true,
          occurredAt: new Date('2026-02-11T11:00:00.000Z'),
        },
      ]),
    },
    metadataProvider: {
      searchMedia: vi.fn().mockResolvedValue([
        { mediaType: 'MOVIE', tmdbId: 603, title: 'The Matrix', status: 'released', year: 1999 },
      ]),
    },
  };

  return deps;
}

function createTestApp(override?: (deps: ReturnType<typeof createDependencies>) => void) {
  const deps = createDependencies();
  if (override) {
    override(deps);
  }

  const app = createApiServer(deps as any, {
    torrentStatsIntervalMs: 60_000,
    activityPollIntervalMs: 60_000,
    healthPollIntervalMs: 60_000,
  });

  return { app, deps };
}

describe('API handlers', () => {
  const apps: Array<ReturnType<typeof createApiServer>> = [];

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.length = 0;
  });

  it('returns paginated series envelope', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/series?page=1&pageSize=10' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.meta).toEqual({ page: 1, pageSize: 10, totalCount: 1, totalPages: 1 });
    expect(payload.data[0].title).toBe('Andor');
  });

  it('maps CONFLICT domain errors to envelope on delete', async () => {
    const { app } = createTestApp(deps => {
      deps.prisma.torrent.count.mockResolvedValue(2);
    });
    apps.push(app);

    const response = await app.inject({ method: 'DELETE', url: '/api/series/1' });
    const payload = response.json();

    expect(response.statusCode).toBe(409);
    expect(payload).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'CONFLICT',
        retryable: false,
      }),
    });
  });

  it('returns movie detail envelope', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/movies/2' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.title).toBe('The Matrix');
  });

  it('returns unified wanted list with pagination', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/media/wanted?page=1&pageSize=25' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.meta.totalCount).toBe(2);
    expect(payload.data.some((item: any) => item.type === 'episode')).toBe(true);
    expect(payload.data.some((item: any) => item.type === 'movie')).toBe(true);
  });

  it('returns CONFLICT when media already exists', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: {
        mediaType: 'MOVIE',
        tmdbId: 603,
        title: 'The Matrix',
        year: 1999,
      },
    });

    const payload = response.json();
    expect(response.statusCode).toBe(409);
    expect(payload.error.code).toBe('CONFLICT');
  });

  it('returns release search and grab envelopes', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const searchResponse = await app.inject({
      method: 'POST',
      url: '/api/releases/search',
      payload: { q: 'Matrix' },
    });
    const searchPayload = searchResponse.json();

    expect(searchResponse.statusCode).toBe(200);
    expect(searchPayload.ok).toBe(true);
    expect(searchPayload.data).toHaveLength(1);

    const grabResponse = await app.inject({
      method: 'POST',
      url: '/api/releases/grab',
      payload: searchPayload.data[0],
    });
    const grabPayload = grabResponse.json();

    expect(grabResponse.statusCode).toBe(200);
    expect(grabPayload.ok).toBe(true);
    expect(grabPayload.data.infoHash).toBe('abc123');
  });

  it('returns torrent list envelope with meta', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/torrents?page=1&pageSize=25' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.meta.totalCount).toBe(1);
    expect(payload.data[0].size).toBe('1000');
  });

  it('returns indexer diagnostics and remediation hints for test endpoint', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'POST', url: '/api/indexers/1/test' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.success).toBe(false);
    expect(payload.data.diagnostics.remediationHints.length).toBeGreaterThan(0);
  });

  it('supports draft indexer connectivity tests without persistence', async () => {
    const { app, deps } = createTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/indexers/test',
      payload: {
        name: 'Draft Provider',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: JSON.stringify({ url: 'https://draft.example', apiKey: 'secret' }),
        protocol: 'torrent',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.success).toBe(false);
    expect(payload.data.diagnostics.remediationHints.length).toBeGreaterThan(0);
    expect(deps.indexerFactory.fromDatabaseRecord).toHaveBeenCalledTimes(1);
    expect(deps.indexerTester.test).toHaveBeenCalledTimes(1);
  });

  it('returns subtitle manual search results', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/subtitles/search',
      payload: {
        variantId: 7,
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data[0].provider).toBe('opensubtitles');
  });

  it('accepts subtitle upload multipart request', async () => {
    const { app, deps } = createTestApp();
    apps.push(app);

    const { body, boundary } = buildMultipartPayload({
      fields: {
        language: 'en',
        forced: 'false',
        hearingImpaired: 'true',
        mediaId: '2',
        mediaType: 'movie',
      },
      file: {
        fieldName: 'file',
        filename: 'The.Matrix.en.srt',
        contentType: 'application/x-subrip',
        content: '1\n00:00:00,000 --> 00:00:01,000\nHello world',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/subtitles/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    const payload = response.json();

    expect(response.statusCode).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.filePath).toContain('/data/subtitles/');
    expect(deps.subtitleInventoryApiService.uploadSubtitle).toHaveBeenCalledWith(
      expect.objectContaining({
        originalFilename: 'The.Matrix.en.srt',
        language: 'en',
        forced: false,
        hearingImpaired: true,
        mediaId: 2,
        mediaType: 'movie',
        content: expect.any(Buffer),
      }),
    );
  });

  it('rejects non-subtitle upload extensions', async () => {
    const { app, deps } = createTestApp();
    apps.push(app);

    const { body, boundary } = buildMultipartPayload({
      fields: {
        language: 'en',
        mediaId: '2',
        mediaType: 'movie',
      },
      file: {
        fieldName: 'file',
        filename: 'not-a-subtitle.txt',
        contentType: 'text/plain',
        content: 'hello world',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/subtitles/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    const payload = response.json();

    expect(response.statusCode).toBe(422);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(deps.subtitleInventoryApiService.uploadSubtitle).not.toHaveBeenCalled();
  });

  it('persists episode monitored toggle through media service', async () => {
    const { app, deps } = createTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/episodes/42',
      payload: {
        monitored: true,
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data).toEqual({ id: 42, monitored: true });
    expect(deps.mediaService.setEpisodeMonitored).toHaveBeenCalledWith(42, true);
  });

  it('returns activity timeline envelope with pagination metadata', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/activity?page=1&pageSize=25&eventType=MEDIA_ADDED' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.meta).toEqual({ page: 1, pageSize: 25, totalCount: 1, totalPages: 1 });
  });

  it('supports clearing activity history', async () => {
    const { app, deps } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'DELETE', url: '/api/activity' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.deletedCount).toBe(3);
    expect(deps.activityEventRepository.clear).toHaveBeenCalledWith({
      entityRef: undefined,
      eventType: undefined,
      from: undefined,
      sourceModule: undefined,
      success: undefined,
      to: undefined,
    });
  });

  it('supports marking an activity event as failed', async () => {
    const { app, deps } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'PATCH', url: '/api/activity/1/fail' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.id).toBe(1);
    expect(payload.data.success).toBe(false);
    expect(deps.activityEventRepository.markAsFailed).toHaveBeenCalledWith(1);
  });

  it('supports exporting activity history', async () => {
    const { app, deps } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/activity/export?eventType=MEDIA_ADDED' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.totalCount).toBe(1);
    expect(Array.isArray(payload.data.items)).toBe(true);
    expect(typeof payload.data.exportedAt).toBe('string');
    expect(deps.activityEventRepository.export).toHaveBeenCalledWith({
      entityRef: undefined,
      eventType: 'MEDIA_ADDED',
      from: undefined,
      sourceModule: undefined,
      success: undefined,
      to: undefined,
    });
  });

  it('parses activity filter query values for clear operations', async () => {
    const { app, deps } = createTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/activity?success=false&from=2026-02-10T00:00:00.000Z&to=2026-02-11T00:00:00.000Z&sourceModule=prowlarr',
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(deps.activityEventRepository.clear).toHaveBeenCalledWith({
      entityRef: undefined,
      eventType: undefined,
      from: new Date('2026-02-10T00:00:00.000Z'),
      sourceModule: 'prowlarr',
      success: false,
      to: new Date('2026-02-11T00:00:00.000Z'),
    });
  });

  it('returns settings envelope', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/settings' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.torrentLimits.maxActiveDownloads).toBe(3);
  });

  it('updates settings with a valid payload', async () => {
    const { app, deps } = createTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      payload: {
        torrentLimits: {
          maxActiveDownloads: 5,
        },
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.torrentLimits.maxActiveDownloads).toBe(5);
    expect(deps.settingsService.update).toHaveBeenCalledWith({
      torrentLimits: {
        maxActiveDownloads: 5,
      },
    });
  });

  it('returns health endpoint ordered by severity', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/health' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe('critical');
    expect(payload.data.indexers[0].severity).toBe('critical');
  });

  it('validates settings payload and rejects invalid updates', async () => {
    const { app } = createTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      payload: {
        torrentLimits: {
          maxActiveDownloads: 0,
        },
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(422);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
  });
});
