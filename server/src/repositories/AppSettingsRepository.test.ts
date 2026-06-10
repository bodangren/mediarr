import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppSettingsRepository,
  DEFAULT_APP_SETTINGS,
  type TorrentLimitsSettings,
} from './AppSettingsRepository';
import * as schema from '../db/schema';

type SelectCall = { rows: any[] };
type InsertCall = { rows: any[] };

function makeSelectBuilder(rows: any[] = []): any {
  const builder: any = {
    then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
  };
  builder.from = vi.fn().mockReturnValue(builder);
  builder.where = vi.fn().mockReturnValue(builder);
  builder.limit = vi.fn().mockReturnValue(builder);
  return builder;
}

function makeInsertBuilder(rows: any[] = [{ id: 1 }]): any {
  const builder: any = {};
  builder.values = vi.fn().mockReturnValue(builder);
  builder.onConflictDoUpdate = vi.fn().mockReturnValue(builder);
  builder.returning = vi.fn().mockResolvedValue(rows);
  return builder;
}

function makeDb(config: { selectCalls?: SelectCall[]; insertRows?: InsertCall[] } = {}) {
  const selectCalls = config.selectCalls ?? [];
  const insertRows = config.insertRows ?? [];
  const selectIndex = { i: 0 };
  const insertIndex = { i: 0 };
  return {
    drizzle: {
      select: vi.fn().mockImplementation(() => {
        const call = selectCalls[selectIndex.i] ?? { rows: [] };
        selectIndex.i += 1;
        return makeSelectBuilder(call.rows);
      }),
      insert: vi.fn().mockImplementation((_table: any) => {
        const call = insertRows[insertIndex.i] ?? { rows: [{ id: 1 }] };
        insertIndex.i += 1;
        return makeInsertBuilder(call.rows);
      }),
    },
  };
}

describe('AppSettingsRepository — TorrentLimitsSettings new fields', () => {
  let db: ReturnType<typeof makeDb>;
  let repo: AppSettingsRepository;

  beforeEach(() => {
    db = makeDb();
    repo = new AppSettingsRepository(db as any);
  });

  // ── DEFAULT_APP_SETTINGS ───────────────────────────────────────────────────

  it('DEFAULT_APP_SETTINGS.torrentLimits has incompleteDirectory defaulting to ""', () => {
    expect(DEFAULT_APP_SETTINGS.torrentLimits.incompleteDirectory).toBe('');
  });

  it('DEFAULT_APP_SETTINGS.torrentLimits has completeDirectory defaulting to ""', () => {
    expect(DEFAULT_APP_SETTINGS.torrentLimits.completeDirectory).toBe('');
  });

  it('DEFAULT_APP_SETTINGS.torrentLimits has seedRatioLimit defaulting to 0', () => {
    expect(DEFAULT_APP_SETTINGS.torrentLimits.seedRatioLimit).toBe(0);
  });

  it('DEFAULT_APP_SETTINGS.torrentLimits has seedTimeLimitMinutes defaulting to 0', () => {
    expect(DEFAULT_APP_SETTINGS.torrentLimits.seedTimeLimitMinutes).toBe(0);
  });

  it('DEFAULT_APP_SETTINGS.torrentLimits has seedLimitAction defaulting to "pause"', () => {
    expect(DEFAULT_APP_SETTINGS.torrentLimits.seedLimitAction).toBe('pause');
  });

  it('DEFAULT_APP_SETTINGS has wantedLanguages defaulting to ["en"]', () => {
    expect(DEFAULT_APP_SETTINGS.wantedLanguages).toEqual(['en']);
  });

  it('DEFAULT_APP_SETTINGS.apiKeys includes subtitle provider credentials defaults', () => {
    expect(DEFAULT_APP_SETTINGS.apiKeys.assrtApiToken).toBeNull();
    expect(DEFAULT_APP_SETTINGS.apiKeys.subdlApiKey).toBeNull();
  });

  it('DEFAULT_APP_SETTINGS has streaming defaults', () => {
    expect(DEFAULT_APP_SETTINGS.streaming).toEqual({
      discoveryEnabled: true,
      discoveryServiceName: 'Mediarr',
      defaultUserId: 'lan-default',
      watchedThreshold: 0.9,
      subtitleDirectory: null,
    });
  });

  // ── get() — no existing record returns defaults ────────────────────────────

  it('get() returns default torrentLimits including new fields when no record exists', async () => {
    db = makeDb({
      selectCalls: [{ rows: [] }],
      insertRows: [{ rows: [{ id: 1 }] }],
    });
    repo = new AppSettingsRepository(db as any);

    const settings = await repo.get();

    expect(settings.torrentLimits.incompleteDirectory).toBe('');
    expect(settings.torrentLimits.completeDirectory).toBe('');
    expect(settings.torrentLimits.seedRatioLimit).toBe(0);
    expect(settings.torrentLimits.seedTimeLimitMinutes).toBe(0);
    expect(settings.torrentLimits.seedLimitAction).toBe('pause');
  });

  // ── get() — existing record with new fields ────────────────────────────────

  it('get() returns persisted values for the new torrentLimits fields', async () => {
    db = makeDb({
      selectCalls: [
        {
          rows: [
            {
              torrentLimits: {
                maxActiveDownloads: 3,
                maxActiveSeeds: 3,
                globalDownloadLimitKbps: null,
                globalUploadLimitKbps: null,
                incompleteDirectory: '/tmp/incomplete',
                completeDirectory: '/media/complete',
                seedRatioLimit: 1.5,
                seedTimeLimitMinutes: 120,
                seedLimitAction: 'remove',
              },
              schedulerIntervals: {
                rssSyncMinutes: 15,
                availabilityCheckMinutes: 30,
                torrentMonitoringSeconds: 5,
              },
              pathVisibility: { showDownloadPath: true, showMediaPath: true },
              apiKeys: {},
              host: {},
              security: {},
              logging: {},
              update: {},
            },
          ],
        },
      ],
    });
    repo = new AppSettingsRepository(db as any);

    const settings = await repo.get();

    expect(settings.torrentLimits.incompleteDirectory).toBe('/tmp/incomplete');
    expect(settings.torrentLimits.completeDirectory).toBe('/media/complete');
    expect(settings.torrentLimits.seedRatioLimit).toBe(1.5);
    expect(settings.torrentLimits.seedTimeLimitMinutes).toBe(120);
    expect(settings.torrentLimits.seedLimitAction).toBe('remove');
  });

  // ── get() — existing record with missing new fields falls back to defaults ──

  it('get() falls back to defaults when new torrentLimits fields are absent in stored JSON', async () => {
    db = makeDb({
      selectCalls: [
        {
          rows: [
            {
              torrentLimits: {
                maxActiveDownloads: 3,
                maxActiveSeeds: 3,
                globalDownloadLimitKbps: null,
                globalUploadLimitKbps: null,
                // no incompleteDirectory, completeDirectory, seedRatioLimit, seedTimeLimitMinutes, seedLimitAction
              },
              schedulerIntervals: {
                rssSyncMinutes: 15,
                availabilityCheckMinutes: 30,
                torrentMonitoringSeconds: 5,
              },
              pathVisibility: { showDownloadPath: true, showMediaPath: true },
              apiKeys: {},
              host: {},
              security: {},
              logging: {},
              update: {},
            },
          ],
        },
      ],
    });
    repo = new AppSettingsRepository(db as any);

    const settings = await repo.get();

    expect(settings.torrentLimits.incompleteDirectory).toBe('');
    expect(settings.torrentLimits.completeDirectory).toBe('');
    expect(settings.torrentLimits.seedRatioLimit).toBe(0);
    expect(settings.torrentLimits.seedTimeLimitMinutes).toBe(0);
    expect(settings.torrentLimits.seedLimitAction).toBe('pause');
  });

  // ── get() — invalid seedLimitAction falls back to 'pause' ─────────────────

  it('get() coerces invalid seedLimitAction to "pause"', async () => {
    db = makeDb({
      selectCalls: [
        {
          rows: [
            {
              torrentLimits: {
                maxActiveDownloads: 3,
                maxActiveSeeds: 3,
                globalDownloadLimitKbps: null,
                globalUploadLimitKbps: null,
                incompleteDirectory: '',
                completeDirectory: '',
                seedRatioLimit: 0,
                seedTimeLimitMinutes: 0,
                seedLimitAction: 'unknown_action',
              },
              schedulerIntervals: { rssSyncMinutes: 15, availabilityCheckMinutes: 30, torrentMonitoringSeconds: 5 },
              pathVisibility: { showDownloadPath: true, showMediaPath: true },
              apiKeys: {},
              host: {},
              security: {},
              logging: {},
              update: {},
            },
          ],
        },
      ],
    });
    repo = new AppSettingsRepository(db as any);

    const settings = await repo.get();

    expect(settings.torrentLimits.seedLimitAction).toBe('pause');
  });

  // ── update() — merges new torrentLimits fields ─────────────────────────────

  it('update() merges new torrentLimits fields correctly', async () => {
    db = makeDb({
      selectCalls: [{ rows: [] }],
      insertRows: [{ rows: [{ id: 1 }] }, { rows: [{ id: 1 }] }],
    });
    repo = new AppSettingsRepository(db as any);

    const partial: Partial<{ torrentLimits: Partial<TorrentLimitsSettings> }> = {
      torrentLimits: {
        incompleteDirectory: '/dl/incomplete',
        completeDirectory: '/dl/done',
        seedRatioLimit: 2.0,
        seedTimeLimitMinutes: 60,
        seedLimitAction: 'remove',
      },
    };

    const result = await repo.update(partial as any);

    expect(result.torrentLimits.incompleteDirectory).toBe('/dl/incomplete');
    expect(result.torrentLimits.completeDirectory).toBe('/dl/done');
    expect(result.torrentLimits.seedRatioLimit).toBe(2.0);
    expect(result.torrentLimits.seedTimeLimitMinutes).toBe(60);
    expect(result.torrentLimits.seedLimitAction).toBe('remove');

    expect(db.drizzle.insert).toHaveBeenCalledWith(schema.appSettings);
  });

  it('update() preserves existing torrentLimits fields when updating new ones', async () => {
    db = makeDb({
      selectCalls: [
        {
          rows: [
            {
              torrentLimits: {
                maxActiveDownloads: 5,
                maxActiveSeeds: 10,
                globalDownloadLimitKbps: 1024,
                globalUploadLimitKbps: 512,
                incompleteDirectory: '/old/incomplete',
                completeDirectory: '/old/complete',
                seedRatioLimit: 1.0,
                seedTimeLimitMinutes: 30,
                seedLimitAction: 'pause',
              },
              schedulerIntervals: { rssSyncMinutes: 15, availabilityCheckMinutes: 30, torrentMonitoringSeconds: 5 },
              pathVisibility: { showDownloadPath: true, showMediaPath: true },
              apiKeys: {},
              host: {},
              security: {},
              logging: {},
              update: {},
            },
          ],
        },
      ],
      insertRows: [{ rows: [{ id: 1 }] }],
    });
    repo = new AppSettingsRepository(db as any);

    const result = await repo.update({
      torrentLimits: { seedRatioLimit: 3.0 } as any,
    });

    expect(result.torrentLimits.maxActiveDownloads).toBe(5);
    expect(result.torrentLimits.maxActiveSeeds).toBe(10);
    expect(result.torrentLimits.incompleteDirectory).toBe('/old/incomplete');
    expect(result.torrentLimits.completeDirectory).toBe('/old/complete');
    expect(result.torrentLimits.seedRatioLimit).toBe(3.0);
    expect(result.torrentLimits.seedTimeLimitMinutes).toBe(30);
    expect(result.torrentLimits.seedLimitAction).toBe('pause');
  });

  it('get() reads wantedLanguages from persisted update JSON', async () => {
    db = makeDb({
      selectCalls: [
        {
          rows: [
            {
              torrentLimits: DEFAULT_APP_SETTINGS.torrentLimits,
              schedulerIntervals: DEFAULT_APP_SETTINGS.schedulerIntervals,
              pathVisibility: DEFAULT_APP_SETTINGS.pathVisibility,
              apiKeys: DEFAULT_APP_SETTINGS.apiKeys,
              host: DEFAULT_APP_SETTINGS.host,
              security: DEFAULT_APP_SETTINGS.security,
              logging: DEFAULT_APP_SETTINGS.logging,
              update: {
                ...DEFAULT_APP_SETTINGS.update,
                wantedLanguages: ['EN', 'th', 'th'],
              },
              mediaManagement: DEFAULT_APP_SETTINGS.mediaManagement,
            },
          ],
        },
      ],
    });
    repo = new AppSettingsRepository(db as any);

    const settings = await repo.get();
    expect(settings.wantedLanguages).toEqual(['en', 'th']);
  });

  it('update() merges wantedLanguages into persisted settings payload', async () => {
    db = makeDb({
      selectCalls: [
        {
          rows: [
            {
              torrentLimits: DEFAULT_APP_SETTINGS.torrentLimits,
              schedulerIntervals: DEFAULT_APP_SETTINGS.schedulerIntervals,
              pathVisibility: DEFAULT_APP_SETTINGS.pathVisibility,
              apiKeys: DEFAULT_APP_SETTINGS.apiKeys,
              host: DEFAULT_APP_SETTINGS.host,
              security: DEFAULT_APP_SETTINGS.security,
              logging: DEFAULT_APP_SETTINGS.logging,
              update: DEFAULT_APP_SETTINGS.update,
              mediaManagement: DEFAULT_APP_SETTINGS.mediaManagement,
            },
          ],
        },
      ],
      insertRows: [{ rows: [{ id: 1 }] }],
    });
    repo = new AppSettingsRepository(db as any);

    const updated = await repo.update({
      wantedLanguages: ['EN', 'zh', 'zh', ''],
    });

    expect(updated.wantedLanguages).toEqual(['en', 'zh']);
    expect(db.drizzle.insert).toHaveBeenCalled();
  });

  it('get() falls back to streaming defaults when streaming is absent', async () => {
    db = makeDb({
      selectCalls: [
        {
          rows: [
            {
              torrentLimits: DEFAULT_APP_SETTINGS.torrentLimits,
              schedulerIntervals: DEFAULT_APP_SETTINGS.schedulerIntervals,
              pathVisibility: DEFAULT_APP_SETTINGS.pathVisibility,
              apiKeys: DEFAULT_APP_SETTINGS.apiKeys,
              host: DEFAULT_APP_SETTINGS.host,
              security: DEFAULT_APP_SETTINGS.security,
              logging: DEFAULT_APP_SETTINGS.logging,
              update: DEFAULT_APP_SETTINGS.update,
              mediaManagement: DEFAULT_APP_SETTINGS.mediaManagement,
            },
          ],
        },
      ],
    });
    repo = new AppSettingsRepository(db as any);

    const settings = await repo.get();
    expect(settings.streaming).toEqual(DEFAULT_APP_SETTINGS.streaming);
  });

  it('update() merges streaming settings into persisted payload', async () => {
    db = makeDb({
      selectCalls: [
        {
          rows: [
            {
              torrentLimits: DEFAULT_APP_SETTINGS.torrentLimits,
              schedulerIntervals: DEFAULT_APP_SETTINGS.schedulerIntervals,
              pathVisibility: DEFAULT_APP_SETTINGS.pathVisibility,
              apiKeys: DEFAULT_APP_SETTINGS.apiKeys,
              host: DEFAULT_APP_SETTINGS.host,
              security: DEFAULT_APP_SETTINGS.security,
              logging: DEFAULT_APP_SETTINGS.logging,
              update: DEFAULT_APP_SETTINGS.update,
              mediaManagement: DEFAULT_APP_SETTINGS.mediaManagement,
              streaming: DEFAULT_APP_SETTINGS.streaming,
            },
          ],
        },
      ],
      insertRows: [{ rows: [{ id: 1 }] }],
    });
    repo = new AppSettingsRepository(db as any);

    const updated = await repo.update({
      streaming: {
        discoveryEnabled: false,
        discoveryServiceName: 'Living Room Mediarr',
        defaultUserId: 'family-room',
        watchedThreshold: 0.85,
        subtitleDirectory: '/srv/subtitles',
      },
    });

    expect(updated.streaming).toEqual({
      discoveryEnabled: false,
      discoveryServiceName: 'Living Room Mediarr',
      defaultUserId: 'family-room',
      watchedThreshold: 0.85,
      subtitleDirectory: '/srv/subtitles',
    });

    expect(db.drizzle.insert).toHaveBeenCalled();
  });
});