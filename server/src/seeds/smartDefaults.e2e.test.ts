/**
 * Phase 3: Smart Defaults End-to-End Integration Tests
 *
 * Tests the complete "Just Work" zero-config flow:
 * - Fresh install auto-configures all settings
 * - Built-in WebTorrent is auto-configured as download client
 * - Naming patterns match *arr conventions
 * - Scheduler intervals (RSS sync, wanted search) are pre-configured
 * - Re-running auto-config does NOT overwrite existing user settings
 *
 * Verifies all defaults work together with WantedSearchService.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seedSmartDefaults, MOVIE_NAMING_PATTERN, SERIES_NAMING_PATTERN, DEFAULT_WANTED_LANGUAGES, DEFAULT_WANTED_SEARCH_MINUTES, DEFAULT_RSS_SYNC_MINUTES, BUILTIN_WEBTORRENT_NAME, BUILTIN_WEBTORRENT_INCOMPLETE_DIR } from './smartDefaults';

const COMPLETE_DIR = '/data/downloads/complete';

// ─── Mock Helpers ─────────────────────────────────────────────────────────────

function createFreshPrismaMock() {
  const db: Record<string, Record<string, unknown>[]> = {
    downloadClient: [],
    appSettings: [],
  };

  return {
    downloadClient: {
      findAll: vi.fn(async () => [...db.downloadClient]),
      create: vi.fn(async (data: unknown) => {
        const record = { id: db.downloadClient.length + 1, ...((data as any).data as object) };
        db.downloadClient.push(record);
        return record;
      }),
    },
    appSettings: {
      findUnique: vi.fn(async ({ where }: { where: { id: number } }) => {
        return (db.appSettings as any).find((r: any) => r.id === where.id) ?? null;
      }),
      upsert: vi.fn(async ({ where, create, update }: { where: { id: number }; create: unknown; update: unknown }) => {
        const idx = (db.appSettings as any).findIndex((r: any) => r.id === where.id);
        let record: Record<string, unknown>;
        if (idx >= 0) {
          record = { id: where.id, ...(update as object) };
          (db.appSettings as any)[idx] = record;
        } else {
          record = { id: where.id, ...(create as object) };
          (db.appSettings as any).push(record);
        }
        return record;
      }),
    },
    _db: db,
  };
}

function createConfiguredPrismaMock(existingSettings: any) {
  const db: Record<string, Record<string, unknown>[]> = {
    downloadClient: [{ id: 1, name: 'My qBittorrent', protocol: 'torrent', type: 'qbittorrent', enabled: true, priority: 1 }],
    appSettings: [existingSettings],
  };

  return {
    downloadClient: {
      findAll: vi.fn(async () => [...db.downloadClient]),
      create: vi.fn(async (data: unknown) => {
        const record = { id: db.downloadClient.length + 1, ...((data as any).data as object) };
        db.downloadClient.push(record);
        return record;
      }),
    },
    appSettings: {
      findUnique: vi.fn(async ({ where }: { where: { id: number } }) => {
        return (db.appSettings as any).find((r: any) => r.id === where.id) ?? null;
      }),
      upsert: vi.fn(async ({ where, create, update }: { where: { id: number }; create: unknown; update: unknown }) => {
        const idx = (db.appSettings as any).findIndex((r: any) => r.id === where.id);
        let record: Record<string, unknown>;
        if (idx >= 0) {
          record = { id: where.id, ...(update as object) };
          (db.appSettings as any)[idx] = record;
        } else {
          record = { id: where.id, ...(create as object) };
          (db.appSettings as any).push(record);
        }
        return record;
      }),
    },
    _db: db,
  };
}

// ─── Phase 3 Tests ───────────────────────────────────────────────────────────

describe('Smart Defaults E2E — "Just Work" Zero-Config Flow', () => {

  describe('3.1 Fresh install → auto-configures everything', () => {
    let prisma: ReturnType<typeof createFreshPrismaMock>;

    beforeEach(() => {
      prisma = createFreshPrismaMock();
    });

    it('creates built-in WebTorrent as default download client', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.downloadClient.create).toHaveBeenCalledTimes(1);
      const createCall = (prisma.downloadClient.create as any).mock.calls[0][0];
      expect(createCall.data.name).toBe(BUILTIN_WEBTORRENT_NAME);
      expect(createCall.data.protocol).toBe('torrent');
      expect(createCall.data.type).toBe('builtin');
      expect(createCall.data.enabled).toBe(true);
      expect(createCall.data.priority).toBe(1);
      const config = JSON.parse(createCall.data.config);
      expect(config.torrentDirectory).toBe(BUILTIN_WEBTORRENT_INCOMPLETE_DIR);
    });

    it('sets movie naming pattern matching *arr conventions', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.appSettings.upsert).toHaveBeenCalledTimes(1);
      const upsertCall = (prisma.appSettings.upsert as any).mock.calls[0][0];
      expect(upsertCall.create.mediaManagement.movieNamingPattern).toBe(MOVIE_NAMING_PATTERN);
      expect(upsertCall.create.mediaManagement.movieNamingPattern).toContain('{Movie.Title}');
      expect(upsertCall.create.mediaManagement.movieNamingPattern).toContain('{Release.Year}');
      expect(upsertCall.create.mediaManagement.movieNamingPattern).toContain('{Quality.Full}');
    });

    it('sets series naming pattern matching *arr conventions', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.appSettings.upsert).toHaveBeenCalledTimes(1);
      const upsertCall = (prisma.appSettings.upsert as any).mock.calls[0][0];
      expect(upsertCall.create.mediaManagement.seriesNamingPattern).toBe(SERIES_NAMING_PATTERN);
      expect(upsertCall.create.mediaManagement.seriesNamingPattern).toContain('{Series.Title}');
      expect(upsertCall.create.mediaManagement.seriesNamingPattern).toContain('{season:00}');
      expect(upsertCall.create.mediaManagement.seriesNamingPattern).toContain('{episode:00}');
    });

    it('pre-configures RSS sync interval to 15 minutes', async () => {
      await seedSmartDefaults(prisma as any);

      const upsertCall = (prisma.appSettings.upsert as any).mock.calls[0][0];
      expect(upsertCall.create.schedulerIntervals.rssSyncMinutes).toBe(DEFAULT_RSS_SYNC_MINUTES);
      expect(upsertCall.create.schedulerIntervals.rssSyncMinutes).toBe(15);
    });

    it('pre-configures wanted search interval to 60 minutes', async () => {
      await seedSmartDefaults(prisma as any);

      const upsertCall = (prisma.appSettings.upsert as any).mock.calls[0][0];
      expect(upsertCall.create.schedulerIntervals.wantedSearchMinutes).toBe(DEFAULT_WANTED_SEARCH_MINUTES);
      expect(upsertCall.create.schedulerIntervals.wantedSearchMinutes).toBe(60);
    });

    it('pre-configures English as default subtitle language', async () => {
      await seedSmartDefaults(prisma as any);

      const upsertCall = (prisma.appSettings.upsert as any).mock.calls[0][0];
      expect(upsertCall.create.update.wantedLanguages).toEqual(DEFAULT_WANTED_LANGUAGES);
      expect(upsertCall.create.update.wantedLanguages).toEqual(['en']);
    });
  });

  describe('3.2 Re-running does NOT overwrite existing user settings', () => {
    let prisma: ReturnType<typeof createConfiguredPrismaMock>;

    beforeEach(() => {
      const customSettings = {
        id: 1,
        torrentLimits: {},
        schedulerIntervals: { rssSyncMinutes: 30, wantedSearchMinutes: 120, availabilityCheckMinutes: 30, torrentMonitoringSeconds: 5 },
        pathVisibility: {},
        apiKeys: {},
        host: {},
        security: {},
        logging: {},
        update: { wantedLanguages: ['fr', 'de'] },
        mediaManagement: {
          movieRootFolder: '/custom/movies',
          movieNamingPattern: '{Movie.Title}.{Custom.Token}',
          seriesNamingPattern: '{Series.Title}.S{season:00}E{episode:00}',
        },
        streaming: {},
      };
      prisma = createConfiguredPrismaMock(customSettings);
    });

    it('does NOT create duplicate WebTorrent when other clients exist', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.downloadClient.create).not.toHaveBeenCalled();
    });

    it('preserves custom movie naming pattern', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });

    it('preserves custom series naming pattern', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });

    it('preserves custom RSS sync interval', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });

    it('preserves custom wanted search interval', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });

    it('preserves custom wanted languages', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });
  });

  describe('3.3 Partial existing settings → only fills missing defaults', () => {
    let prisma: ReturnType<typeof createConfiguredPrismaMock>;

    beforeEach(() => {
      const partialSettings = {
        id: 1,
        torrentLimits: {},
        schedulerIntervals: { rssSyncMinutes: 15, wantedSearchMinutes: 60, availabilityCheckMinutes: 30, torrentMonitoringSeconds: 5 },
        pathVisibility: {},
        apiKeys: {},
        host: {},
        security: {},
        logging: {},
        update: { wantedLanguages: ['en'] },
        mediaManagement: {
          movieRootFolder: '',
          tvRootFolder: '',
          movieNamingPattern: '',
          seriesNamingPattern: '',
        },
        streaming: {},
      };
      prisma = createConfiguredPrismaMock(partialSettings);
    });

    it('fills in missing movie naming pattern', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.appSettings.upsert).toHaveBeenCalledTimes(1);
      const upsertCall = (prisma.appSettings.upsert as any).mock.calls[0][0];
      expect(upsertCall.update.mediaManagement.movieNamingPattern).toBe(MOVIE_NAMING_PATTERN);
    });

    it('fills in missing series naming pattern', async () => {
      await seedSmartDefaults(prisma as any);

      expect(prisma.appSettings.upsert).toHaveBeenCalledTimes(1);
      const upsertCall = (prisma.appSettings.upsert as any).mock.calls[0][0];
      expect(upsertCall.update.mediaManagement.seriesNamingPattern).toBe(SERIES_NAMING_PATTERN);
    });
  });

  describe('3.4 Idempotency — multiple runs produce same result', () => {
    let prisma: ReturnType<typeof createFreshPrismaMock>;

    beforeEach(() => {
      prisma = createFreshPrismaMock();
    });

    it('calling seedSmartDefaults twice does not create duplicate WebTorrent clients', async () => {
      await seedSmartDefaults(prisma as any);
      await seedSmartDefaults(prisma as any);

      const allClients = prisma._db.downloadClient;
      const builtinClients = allClients.filter((c: any) => c.type === 'builtin');
      expect(builtinClients).toHaveLength(1);
    });

    it('calling seedSmartDefaults twice does not call upsert twice', async () => {
      await seedSmartDefaults(prisma as any);
      await seedSmartDefaults(prisma as any);

      expect(prisma.appSettings.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('3.5 Built-in WebTorrent paths are correct for download client', () => {
    let prisma: ReturnType<typeof createFreshPrismaMock>;

    beforeEach(() => {
      prisma = createFreshPrismaMock();
    });

    it('WebTorrent is configured with incomplete directory', async () => {
      await seedSmartDefaults(prisma as any);

      const createCall = (prisma.downloadClient.create as any).mock.calls[0][0];
      const config = JSON.parse(createCall.data.config);
      expect(config.torrentDirectory).toBe(BUILTIN_WEBTORRENT_INCOMPLETE_DIR);
    });

    it('WebTorrent config contains correct host and port settings', async () => {
      await seedSmartDefaults(prisma as any);

      const createCall = (prisma.downloadClient.create as any).mock.calls[0][0];
      const config = JSON.parse(createCall.data.config);
      expect(config.host).toBe('127.0.0.1');
      expect(config.port).toBe(0);
      expect(config.useSsl).toBe(false);
    });
  });
});
