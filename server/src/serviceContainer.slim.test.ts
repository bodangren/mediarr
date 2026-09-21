import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS } from './repositories/AppSettingsRepository';
import type { SchedulerStateRepository } from './services/Scheduler';
import { RssSyncService } from './services/RssSyncService';
import { WantedService } from './services/WantedService';
import { WantedSearchService } from './services/WantedSearchService';
import { createServiceContainer, type ServiceContainer } from './serviceContainer';

function createInMemorySchedulerStateRepository(): SchedulerStateRepository {
  const states = new Map<string, string>();
  const enabled = new Map<string, boolean>();
  return {
    getTaskState: async (name) => states.get(name) ?? null,
    setTaskState: async (name, nextRunAt) => {
      if (nextRunAt.length === 0) {
        states.delete(name);
      } else {
        states.set(name, nextRunAt);
      }
    },
    getAllTaskStates: async () => Object.fromEntries(states),
    setEnabledState: async (name, value) => {
      enabled.set(name, value);
    },
    getAllEnabledStates: async () => Object.fromEntries(enabled),
  };
}

function createContainerOptions(slim: boolean) {
  return {
    slim,
    // The slim factory must never touch the database; an empty object proves it.
    prisma: {} as any,
    databaseUrl: 'file:/tmp/mediarr-slim-mode-test.db',
    settings: structuredClone(DEFAULT_APP_SETTINGS),
    env: {},
    schedulerStateRepository: createInMemorySchedulerStateRepository(),
  };
}

async function createSlimContainer(): Promise<ServiceContainer> {
  return createServiceContainer(createContainerOptions(true));
}

const DISABLED_CRON_JOBS = ['rss-sync', 'import-list-sync', 'wanted-search', 'subtitle-wanted-search'];
const KEPT_CRON_JOBS = ['library-scan', 'auto-update-check'];

describe('createServiceContainer in slim mode', () => {
  it('keeps the playback and library-management services running', async () => {
    const container = await createSlimContainer();

    expect(container.slim).toBe(true);
    expect(container.importManager).toBeDefined();
    expect(container.organizer).toBeDefined();
    expect(container.libraryScanService).toBeDefined();
    expect(container.metadataProvider).toBeDefined();
    expect(container.playbackService).toBeDefined();
    expect(container.playbackRepository).toBeDefined();
    expect(container.discoveryService).toBeDefined();
    expect(container.backupService).toBeDefined();
    expect(container.systemHealthService).toBeDefined();
    expect(container.updateService).toBeDefined();
    expect(container.eventHub).toBeDefined();
    expect(container.scheduler).toBeDefined();
    expect(container.mediaService).toBeDefined();
    expect(container.collectionService).toBeDefined();

    // createJellyfinServer and its dependencies stay wired.
    expect(container.apiDependencies.prisma).toBeDefined();
    expect(container.apiDependencies.playbackService).toBe(container.playbackService);
    expect(container.apiDependencies.libraryScanService).toBeDefined();
    expect(container.apiDependencies.backupService).toBeDefined();
  });

  it('does not instantiate any -arr domain service', async () => {
    const container = await createSlimContainer();

    expect(container.arr).toBeNull();

    const deps = container.apiDependencies;
    for (const key of [
      'torrentManager',
      'indexerFactory',
      'indexerTester',
      'indexerServiceDiscovery',
      'subtitleInventoryApiService',
      'subtitleProviderFactory',
      'subtitleAutomationService',
      'variantInventoryIndexer',
      'importListProviderRegistry',
      'importListSyncService',
      'mediaSearchService',
      'searchAggregationService',
      'wantedService',
      'wantedSearchService',
      'catalogCache',
      'notificationTransportRegistry',
    ] as const) {
      expect(deps[key], key).toBeUndefined();
    }
  });

  it('registers zero cron entries for disabled domains', async () => {
    const container = await createSlimContainer();

    container.registerScheduledJobs();
    const jobs = container.scheduler.listJobs();

    for (const name of DISABLED_CRON_JOBS) {
      expect(jobs, name).not.toContain(name);
    }
    for (const name of KEPT_CRON_JOBS) {
      expect(jobs, name).toContain(name);
    }

    container.scheduler.stopAll();
  });
});

describe('createServiceContainer in full mode (regression guard)', () => {
  it('instantiates the complete -arr service set unchanged', async () => {
    const container = await createServiceContainer(createContainerOptions(false));

    expect(container.slim).toBe(false);
    expect(container.arr).not.toBeNull();
    expect(container.arr!.rssSyncService).toBeInstanceOf(RssSyncService);
    expect(container.arr!.wantedService).toBeInstanceOf(WantedService);
    expect(container.arr!.wantedSearchService).toBeInstanceOf(WantedSearchService);
    expect(container.arr!.indexerFactory).toBeDefined();
    expect(container.arr!.indexerTester).toBeDefined();
    expect(container.arr!.indexerServiceDiscovery).toBeDefined();
    expect(container.arr!.importListSyncService).toBeDefined();
    expect(container.arr!.importListProviderRegistry).toBeDefined();
    expect(container.arr!.subtitleAutomationService).toBeDefined();
    expect(container.arr!.subtitleInventoryApiService).toBeDefined();
    expect(container.arr!.subtitleProviderFactory).toBeDefined();
    expect(container.arr!.variantLifecycle).toBeDefined();
    expect(container.arr!.mediaSearchService).toBeDefined();
    expect(container.arr!.catalogCache).toBeDefined();
    expect(container.arr!.notificationDispatchService).toBeDefined();
    expect(container.arr!.notificationTransportRegistry).toBeDefined();
    expect(container.importManager).toBeDefined();

    const deps = container.apiDependencies;
    expect(deps.torrentManager).toBeDefined();
    expect(deps.indexerFactory).toBeDefined();
    expect(deps.indexerTester).toBeDefined();
    expect(deps.mediaSearchService).toBeDefined();
    expect(deps.wantedService).toBeDefined();
    expect(deps.wantedSearchService).toBeDefined();
    expect(deps.subtitleAutomationService).toBeDefined();
    expect(deps.catalogCache).toBeDefined();
  });

  it('registers the full cron set including disabled-domain jobs', async () => {
    const container = await createServiceContainer(createContainerOptions(false));

    container.registerScheduledJobs();
    const jobs = container.scheduler.listJobs();

    for (const name of [...DISABLED_CRON_JOBS, ...KEPT_CRON_JOBS]) {
      expect(jobs, name).toContain(name);
    }

    container.scheduler.stopAll();
  });

  it('keeps the same kept services in both modes', async () => {
    const slimContainer = await createSlimContainer();
    const fullContainer = await createServiceContainer(createContainerOptions(false));

    for (const key of [
      'importManager',
      'organizer',
      'libraryScanService',
      'metadataProvider',
      'playbackService',
      'playbackRepository',
      'discoveryService',
      'backupService',
      'systemHealthService',
      'updateService',
      'eventHub',
      'scheduler',
      'mediaService',
      'collectionService',
    ] as const) {
      expect(slimContainer[key], `slim ${key}`).toBeDefined();
      expect(fullContainer[key], `full ${key}`).toBeDefined();
    }
  });
});
