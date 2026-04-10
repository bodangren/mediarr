import { beforeEach, describe, expect, it, vi } from 'vitest';

const MOVIE_NAMING_PATTERN = '{Movie.Title}.{Release.Year}.{Quality.Full}.{MediaInfo.VideoCodec}';
const SERIES_NAMING_PATTERN = '{Series.Title}.S{season:00}E{episode:00}.{Episode.Title}.{Quality.Full}';
const DEFAULT_WANTED_LANGUAGES = ['en'];
const DEFAULT_WANTED_SEARCH_MINUTES = 60;
const DEFAULT_RSS_SYNC_MINUTES = 15;
const BUILTIN_WEBTORRENT_NAME = 'Built-in WebTorrent';
const INCOMPLETE_DIR = '/data/downloads/incomplete';
const COMPLETE_DIR = '/data/downloads/complete';

function createPrismaMock() {
  const db: Record<string, Record<string, unknown>[]> = {
    qualityDefinition: [],
    qualityProfile: [],
    category: [],
    downloadClient: [],
    appSettings: [],
  };

  return {
    qualityDefinition: {
      upsert: vi.fn(async ({ where, update, create }: { where: { id: number }; update: unknown; create: unknown }) => {
        const existing = db.qualityDefinition.find((r: any) => r.id === where.id);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const record = { ...create };
        db.qualityDefinition.push(record);
        return record;
      }),
    },
    qualityProfile: {
      upsert: vi.fn(async ({ where, update, create }: { where: { name: string }; update: unknown; create: unknown }) => {
        const existing = db.qualityProfile.find((r: any) => r.name === where.name);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const record = { ...create };
        db.qualityProfile.push(record);
        return record;
      }),
    },
    category: {
      upsert: vi.fn(async ({ where, update, create }: { where: { name: string }; update: unknown; create: unknown }) => {
        const existing = db.category.find((r: any) => r.name === where.name);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const record = { ...create };
        db.category.push(record);
        return record;
      }),
    },
    downloadClient: {
      findAll: vi.fn(async () => [...db.downloadClient]),
      create: vi.fn(async (data: unknown) => {
        const record = { id: db.downloadClient.length + 1, ...(data as object).data };
        db.downloadClient.push(record);
        return record;
      }),
      count: vi.fn(async () => db.downloadClient.length),
    },
    appSettings: {
      findUnique: vi.fn(async ({ where }: { where: { id: number } }) => {
        return db.appSettings.find((r: any) => r.id === where.id) ?? null;
      }),
      create: vi.fn(async (data: unknown) => {
        const record = { id: 1, ...(data as object).data };
        db.appSettings.push(record);
        return record;
      }),
      upsert: vi.fn(async ({ where, create, update }: { where: { id: number }; create: unknown; update: unknown }) => {
        const idx = db.appSettings.findIndex((r: any) => r.id === where.id);
        let record: Record<string, unknown>;
        if (idx >= 0) {
          record = { id: where.id, ...(update as object) };
          db.appSettings[idx] = record;
        } else {
          record = { id: where.id, ...(create as object) };
          db.appSettings.push(record);
        }
        return record;
      }),
    },
    _db: db,
  };
}

async function seedSmartDefaults(prisma: any) {
  const existingClients = await prisma.downloadClient.findAll();
  const hasNoDownloadClients = existingClients.length === 0;

  if (hasNoDownloadClients) {
    await prisma.downloadClient.create({
      data: {
        name: BUILTIN_WEBTORRENT_NAME,
        protocol: 'torrent',
        type: 'builtin',
        enabled: true,
        priority: 1,
        config: JSON.stringify({
          host: '127.0.0.1',
          port: 0,
          useSsl: false,
          torrentDirectory: INCOMPLETE_DIR,
        }),
      },
    });
  }

  const settingsRecord = await prisma.appSettings.findUnique({ where: { id: 1 } });
  const current = settingsRecord ? JSON.parse(JSON.stringify(settingsRecord)) : null;

  let hasAnyChange = false;

  const newMediaManagement: Record<string, string> = {};
  if (!current?.mediaManagement?.movieNamingPattern) {
    newMediaManagement.movieNamingPattern = MOVIE_NAMING_PATTERN;
    hasAnyChange = true;
  }
  if (!current?.mediaManagement?.seriesNamingPattern) {
    newMediaManagement.seriesNamingPattern = SERIES_NAMING_PATTERN;
    hasAnyChange = true;
  }

  const newSchedulerIntervals: Record<string, number> = {};
  if (!current?.schedulerIntervals?.wantedSearchMinutes) {
    newSchedulerIntervals.wantedSearchMinutes = DEFAULT_WANTED_SEARCH_MINUTES;
    hasAnyChange = true;
  }
  if (!current?.schedulerIntervals?.rssSyncMinutes) {
    newSchedulerIntervals.rssSyncMinutes = DEFAULT_RSS_SYNC_MINUTES;
    hasAnyChange = true;
  }

  const currentWantedLanguages = current?.update?.wantedLanguages;
  const needsWantedLanguages = !currentWantedLanguages || currentWantedLanguages.length === 0 ||
    (currentWantedLanguages.length === 1 && currentWantedLanguages[0] === '');
  if (needsWantedLanguages) {
    hasAnyChange = true;
  }

  if (!hasAnyChange) {
    return;
  }

  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      torrentLimits: current?.torrentLimits ?? {},
      schedulerIntervals: {
        ...(current?.schedulerIntervals ?? {}),
        ...newSchedulerIntervals,
      },
      pathVisibility: current?.pathVisibility ?? {},
      apiKeys: current?.apiKeys ?? {},
      host: current?.host ?? {},
      security: current?.security ?? {},
      logging: current?.logging ?? {},
      update: {
        ...(current?.update ?? {}),
        wantedLanguages: needsWantedLanguages ? DEFAULT_WANTED_LANGUAGES : (currentWantedLanguages ?? []),
      },
      mediaManagement: {
        ...(current?.mediaManagement ?? {}),
        ...newMediaManagement,
      },
      streaming: current?.streaming ?? {},
    },
    update: {
      torrentLimits: current?.torrentLimits ?? {},
      schedulerIntervals: {
        ...(current?.schedulerIntervals ?? {}),
        ...newSchedulerIntervals,
      },
      pathVisibility: current?.pathVisibility ?? {},
      apiKeys: current?.apiKeys ?? {},
      host: current?.host ?? {},
      security: current?.security ?? {},
      logging: current?.logging ?? {},
      update: {
        ...(current?.update ?? {}),
        wantedLanguages: needsWantedLanguages ? DEFAULT_WANTED_LANGUAGES : (currentWantedLanguages ?? []),
      },
      mediaManagement: {
        ...(current?.mediaManagement ?? {}),
        ...newMediaManagement,
      },
      streaming: current?.streaming ?? {},
    },
  });
}

describe('seedSmartDefaults', () => {
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe('download client auto-configuration', () => {
    it('creates built-in WebTorrent when no download clients exist', async () => {
      await seedSmartDefaults(prisma);

      expect(prisma.downloadClient.create).toHaveBeenCalledTimes(1);
      const createCall = (prisma.downloadClient.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createCall.data.name).toBe(BUILTIN_WEBTORRENT_NAME);
      expect(createCall.data.protocol).toBe('torrent');
      expect(createCall.data.type).toBe('builtin');
      expect(createCall.data.enabled).toBe(true);
      expect(createCall.data.priority).toBe(1);
    });

    it('does NOT create built-in WebTorrent when other download clients exist', async () => {
      (prisma.downloadClient.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, name: 'My qBittorrent', protocol: 'torrent', type: 'qbittorrent' },
      ]);

      await seedSmartDefaults(prisma);

      expect(prisma.downloadClient.create).not.toHaveBeenCalled();
    });

    it('is idempotent — calling twice does not create duplicate WebTorrent clients', async () => {
      await seedSmartDefaults(prisma);
      await seedSmartDefaults(prisma);

      const allClients = prisma._db.downloadClient;
      const builtinClients = allClients.filter((c: any) => c.type === 'builtin');
      expect(builtinClients).toHaveLength(1);
    });
  });

  describe('naming pattern defaults', () => {
    it('sets movie naming pattern when not already set', async () => {
      await seedSmartDefaults(prisma);

      expect(prisma.appSettings.upsert).toHaveBeenCalled();
      const upsertCall = (prisma.appSettings.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upsertCall.create.mediaManagement.movieNamingPattern).toBe(MOVIE_NAMING_PATTERN);
    });

    it('sets series naming pattern when not already set', async () => {
      await seedSmartDefaults(prisma);

      expect(prisma.appSettings.upsert).toHaveBeenCalled();
      const upsertCall = (prisma.appSettings.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upsertCall.create.mediaManagement.seriesNamingPattern).toBe(SERIES_NAMING_PATTERN);
    });

    it('does NOT overwrite existing movie naming pattern', async () => {
      const existingSettings = {
        id: 1,
        torrentLimits: {},
        schedulerIntervals: { rssSyncMinutes: 15, wantedSearchMinutes: 60 },
        pathVisibility: {},
        apiKeys: {},
        host: {},
        security: {},
        logging: {},
        update: { wantedLanguages: ['fr'] },
        mediaManagement: {
          movieRootFolder: '/data/media/movies',
          movieNamingPattern: '{Movie.Title}.{Custom.Token}',
          seriesNamingPattern: SERIES_NAMING_PATTERN,
        },
        streaming: {},
      };
      (prisma.appSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingSettings);

      await seedSmartDefaults(prisma);

      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });

    it('does NOT overwrite existing series naming pattern', async () => {
      const existingSettings = {
        id: 1,
        torrentLimits: {},
        schedulerIntervals: { rssSyncMinutes: 15, wantedSearchMinutes: 60 },
        pathVisibility: {},
        apiKeys: {},
        host: {},
        security: {},
        logging: {},
        update: { wantedLanguages: ['fr'] },
        mediaManagement: {
          tvRootFolder: '/data/media/tv',
          movieNamingPattern: MOVIE_NAMING_PATTERN,
          seriesNamingPattern: '{Series.Title}.{Original}',
        },
        streaming: {},
      };
      (prisma.appSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingSettings);

      await seedSmartDefaults(prisma);

      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });
  });

  describe('scheduler interval defaults', () => {
    it('sets wantedSearchMinutes to 60 when not set', async () => {
      await seedSmartDefaults(prisma);

      const upsertCall = (prisma.appSettings.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upsertCall.create.schedulerIntervals.wantedSearchMinutes).toBe(DEFAULT_WANTED_SEARCH_MINUTES);
    });

    it('sets rssSyncMinutes to 15 when not set', async () => {
      await seedSmartDefaults(prisma);

      const upsertCall = (prisma.appSettings.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upsertCall.create.schedulerIntervals.rssSyncMinutes).toBe(DEFAULT_RSS_SYNC_MINUTES);
    });

    it('does NOT overwrite existing wantedSearchMinutes', async () => {
      const existingSettings = {
        id: 1,
        torrentLimits: {},
        schedulerIntervals: { rssSyncMinutes: 15, wantedSearchMinutes: 120 },
        pathVisibility: {},
        apiKeys: {},
        host: {},
        security: {},
        logging: {},
        update: { wantedLanguages: ['fr'] },
        mediaManagement: { movieNamingPattern: MOVIE_NAMING_PATTERN, seriesNamingPattern: SERIES_NAMING_PATTERN },
        streaming: {},
      };
      (prisma.appSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingSettings);

      await seedSmartDefaults(prisma);

      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });

    it('does NOT overwrite existing rssSyncMinutes', async () => {
      const existingSettings = {
        id: 1,
        torrentLimits: {},
        schedulerIntervals: { rssSyncMinutes: 20, wantedSearchMinutes: 60 },
        pathVisibility: {},
        apiKeys: {},
        host: {},
        security: {},
        logging: {},
        update: { wantedLanguages: ['fr'] },
        mediaManagement: { movieNamingPattern: MOVIE_NAMING_PATTERN, seriesNamingPattern: SERIES_NAMING_PATTERN },
        streaming: {},
      };
      (prisma.appSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingSettings);

      await seedSmartDefaults(prisma);

      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });
  });

  describe('wanted language defaults', () => {
    it('sets wantedLanguages to ["en"] when empty', async () => {
      await seedSmartDefaults(prisma);

      const upsertCall = (prisma.appSettings.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upsertCall.create.update.wantedLanguages).toEqual(DEFAULT_WANTED_LANGUAGES);
    });

    it('does NOT overwrite existing wantedLanguages', async () => {
      const existingSettings = {
        id: 1,
        torrentLimits: {},
        schedulerIntervals: { rssSyncMinutes: 15, wantedSearchMinutes: 60 },
        pathVisibility: {},
        apiKeys: {},
        host: {},
        security: {},
        logging: {},
        update: { wantedLanguages: ['fr', 'de'] },
        mediaManagement: { movieNamingPattern: MOVIE_NAMING_PATTERN, seriesNamingPattern: SERIES_NAMING_PATTERN },
        streaming: {},
      };
      (prisma.appSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingSettings);

      await seedSmartDefaults(prisma);

      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });

    it('overwrites empty-string wantedLanguages with ["en"]', async () => {
      const existingSettings = {
        id: 1,
        torrentLimits: {},
        schedulerIntervals: { rssSyncMinutes: 15, wantedSearchMinutes: 60 },
        pathVisibility: {},
        apiKeys: {},
        host: {},
        security: {},
        logging: {},
        update: { wantedLanguages: [''] },
        mediaManagement: { movieNamingPattern: MOVIE_NAMING_PATTERN, seriesNamingPattern: SERIES_NAMING_PATTERN },
        streaming: {},
      };
      (prisma.appSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingSettings);

      await seedSmartDefaults(prisma);

      expect(prisma.appSettings.upsert).toHaveBeenCalled();
      const upsertCall = (prisma.appSettings.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upsertCall.create.update.wantedLanguages).toEqual(['en']);
    });
  });

  describe('complete fresh install scenario', () => {
    it('seeds all defaults in a single call on fresh install', async () => {
      await seedSmartDefaults(prisma);

      expect(prisma.downloadClient.create).toHaveBeenCalledTimes(1);
      expect(prisma.appSettings.upsert).toHaveBeenCalledTimes(1);

      const upsertCall = (prisma.appSettings.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const created = upsertCall.create;

      expect(created.mediaManagement.movieNamingPattern).toBe(MOVIE_NAMING_PATTERN);
      expect(created.mediaManagement.seriesNamingPattern).toBe(SERIES_NAMING_PATTERN);
      expect(created.schedulerIntervals.wantedSearchMinutes).toBe(60);
      expect(created.schedulerIntervals.rssSyncMinutes).toBe(15);
      expect(created.update.wantedLanguages).toEqual(['en']);
    });
  });
});
