import { describe, expect, it, vi } from 'vitest';
import { SubtitleAutomationService } from './SubtitleAutomationService';

describe('SubtitleAutomationService', () => {
  it('runs scan + queue automation cycle', async () => {
    const repository = {
      listMonitoredVariants: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      listWantedSubtitlesByStates: vi.fn().mockResolvedValue([{ id: 11 }, { id: 12 }]),
      updateWantedSubtitleState: vi.fn(),
      listMovieVariants: vi.fn(),
      listEpisodeVariants: vi.fn(),
      listWantedSubtitlesByVariant: vi.fn(),
    };

    const settingsService = {
      get: vi.fn().mockResolvedValue({ wantedLanguages: ['EN', 'th'] }),
    };

    const missingService = {
      computeAndPersistForVariant: vi.fn().mockResolvedValue(undefined),
    };

    const wantedService = {
      syncWantedForVariant: vi.fn().mockResolvedValue(undefined),
    };

    const fetchService = {
      fetchWantedSubtitle: vi
        .fn()
        .mockResolvedValueOnce({ storedPath: '/tmp/a.srt', provider: 'opensubtitles', score: 10 })
        .mockResolvedValueOnce(null),
    };

    const fetchProvider = {
      searchBestSubtitle: vi.fn(),
    };

    const service = new SubtitleAutomationService(
      repository as any,
      settingsService as any,
      missingService as any,
      wantedService as any,
      fetchService as any,
      fetchProvider as any,
    );

    const stats = await service.runAutomationCycle();

    expect(stats).toEqual({
      variantsScanned: 2,
      wantedQueued: 2,
      downloaded: 1,
      failed: 1,
      variantsSkipped: 0,
      skippedNoProvider: 0,
    });
    expect(missingService.computeAndPersistForVariant).toHaveBeenCalledTimes(2);
    expect(wantedService.syncWantedForVariant).toHaveBeenCalledTimes(2);
  });

  it('skips a stale variant instead of failing the whole task', async () => {
    // Live defect 2026-11-07: after a variant cleanup, the scheduled
    // `subtitle-wanted-search` task failed every run with
    // "Variant 5260 not found" because one orphaned id aborted the loop.
    const repository = {
      listMonitoredVariants: vi.fn(),
      listRecentlyAddedVariants: vi.fn().mockResolvedValue([{ id: 1 }, { id: 5260 }, { id: 3 }]),
      listVariantsWithFailedWanted: vi.fn().mockResolvedValue([]),
      listWantedSubtitlesByStates: vi.fn().mockResolvedValue([]),
      updateWantedSubtitleState: vi.fn(),
      listMovieVariants: vi.fn(),
      listEpisodeVariants: vi.fn(),
      listWantedSubtitlesByVariant: vi.fn().mockResolvedValue([]),
    };
    const settingsService = {
      get: vi.fn().mockResolvedValue({ wantedLanguages: ['en'] }),
    };
    const missingService = {
      computeAndPersistForVariant: vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Variant 5260 not found'))
        .mockResolvedValueOnce(undefined),
    };
    const wantedService = { syncWantedForVariant: vi.fn().mockResolvedValue(undefined) };
    const fetchService = { fetchWantedSubtitle: vi.fn() };
    const fetchProvider = { searchBestSubtitle: vi.fn() };

    const service = new SubtitleAutomationService(
      repository as any,
      settingsService as any,
      missingService as any,
      wantedService as any,
      fetchService as any,
      fetchProvider as any,
    );

    const stats = await service.runTargetedAutomationCycle();

    expect(stats.variantsScanned).toBe(3);
    expect(stats.variantsSkipped).toBe(1);
    // The healthy variants were still processed.
    expect(missingService.computeAndPersistForVariant).toHaveBeenCalledTimes(3);
    expect(wantedService.syncWantedForVariant).toHaveBeenCalledTimes(2);
  });

  it('runs variant-specific automation when movie is imported', async () => {
    const repository = {
      listMonitoredVariants: vi.fn(),
      listWantedSubtitlesByStates: vi.fn(),
      updateWantedSubtitleState: vi.fn(),
      listMovieVariants: vi.fn().mockResolvedValue([{ id: 33 }]),
      listEpisodeVariants: vi.fn().mockResolvedValue([]),
      listWantedSubtitlesByVariant: vi.fn().mockResolvedValue([{ id: 44, state: 'PENDING' }]),
    };

    const settingsService = {
      get: vi.fn().mockResolvedValue({ wantedLanguages: ['zh'] }),
    };

    const missingService = {
      computeAndPersistForVariant: vi.fn().mockResolvedValue(undefined),
    };

    const wantedService = {
      syncWantedForVariant: vi.fn().mockResolvedValue(undefined),
    };

    const fetchService = {
      fetchWantedSubtitle: vi.fn().mockResolvedValue({ storedPath: '/tmp/z.srt', provider: 'assrt', score: 9 }),
    };

    const fetchProvider = {
      searchBestSubtitle: vi.fn(),
    };

    const service = new SubtitleAutomationService(
      repository as any,
      settingsService as any,
      missingService as any,
      wantedService as any,
      fetchService as any,
      fetchProvider as any,
    );

    const stats = await service.onMovieImported(7);

    expect(repository.listMovieVariants).toHaveBeenCalledWith(7);
    expect(stats.variantsScanned).toBe(1);
    expect(stats.downloaded).toBe(1);
  });

  it('idles the targeted cycle (the scheduled path) when no provider is configured', async () => {
    const repository = {
      listMonitoredVariants: vi.fn(),
      listRecentlyAddedVariants: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      listVariantsWithFailedWanted: vi.fn().mockResolvedValue([{ id: 3 }]),
      listWantedSubtitlesByStates: vi.fn(),
      updateWantedSubtitleState: vi.fn(),
      listMovieVariants: vi.fn(),
      listEpisodeVariants: vi.fn(),
      listWantedSubtitlesByVariant: vi.fn(),
    };
    const settingsService = { get: vi.fn().mockResolvedValue({ wantedLanguages: ['EN'] }) };
    const missingService = { computeAndPersistForVariant: vi.fn() };
    const wantedService = { syncWantedForVariant: vi.fn() };
    const fetchService = { fetchWantedSubtitle: vi.fn() };
    const fetchProvider = {
      searchBestSubtitle: vi.fn(),
      hasUsableProvider: vi.fn().mockResolvedValue(false),
    };

    const service = new SubtitleAutomationService(
      repository as any,
      settingsService as any,
      missingService as any,
      wantedService as any,
      fetchService as any,
      fetchProvider as any,
    );

    const stats = await service.runTargetedAutomationCycle({ recentDays: 7 });

    expect(stats.skippedNoProvider).toBe(1);
    expect(stats.variantsScanned).toBe(0);
    expect(repository.listRecentlyAddedVariants).not.toHaveBeenCalled();
    expect(missingService.computeAndPersistForVariant).not.toHaveBeenCalled();
  });

  it('does not drain the wanted queue when no provider is configured', async () => {
    // On 2026-11-08 the production install had zero subtitle providers and the
    // queue failed every row on every run: 1,900 failed downloads and 9,069
    // failed searches in 24 h, all "No subtitle found".
    const repository = {
      listMonitoredVariants: vi.fn().mockResolvedValue([]),
      listWantedSubtitlesByStates: vi.fn().mockResolvedValue([{ id: 11 }]),
      updateWantedSubtitleState: vi.fn(),
      listMovieVariants: vi.fn(),
      listEpisodeVariants: vi.fn(),
      listWantedSubtitlesByVariant: vi.fn(),
    };
    const settingsService = { get: vi.fn().mockResolvedValue({ wantedLanguages: ['EN'] }) };
    const missingService = { computeAndPersistForVariant: vi.fn() };
    const wantedService = { syncWantedForVariant: vi.fn() };
    const fetchService = { fetchWantedSubtitle: vi.fn() };
    const fetchProvider = {
      searchBestSubtitle: vi.fn(),
      // Every registered provider reports "no credentials", which is the
      // production state on 2026-11-08 (no OpenSubtitles/ASSRT/SubDL keys).
      hasUsableProvider: vi.fn().mockResolvedValue(false),
    };

    const service = new SubtitleAutomationService(
      repository as any,
      settingsService as any,
      missingService as any,
      wantedService as any,
      fetchService as any,
      fetchProvider as any,
    );

    const stats = await service.runAutomationCycle();

    expect(stats.skippedNoProvider).toBe(1);
    expect(stats.downloaded).toBe(0);
    expect(stats.failed).toBe(0);
    expect(repository.listWantedSubtitlesByStates).not.toHaveBeenCalled();
    expect(fetchService.fetchWantedSubtitle).not.toHaveBeenCalled();
    expect(repository.updateWantedSubtitleState).not.toHaveBeenCalled();
  });

  it('processes the queue normally once a provider exists', async () => {
    const repository = {
      listMonitoredVariants: vi.fn().mockResolvedValue([]),
      listWantedSubtitlesByStates: vi.fn().mockResolvedValue([{ id: 11 }]),
      updateWantedSubtitleState: vi.fn(),
      listMovieVariants: vi.fn(),
      listEpisodeVariants: vi.fn(),
      listWantedSubtitlesByVariant: vi.fn(),
    };
    const settingsService = { get: vi.fn().mockResolvedValue({ wantedLanguages: ['EN'] }) };
    const missingService = { computeAndPersistForVariant: vi.fn() };
    const wantedService = { syncWantedForVariant: vi.fn() };
    const fetchService = {
      fetchWantedSubtitle: vi.fn().mockResolvedValue({ storedPath: '/tmp/a.srt', provider: 'p', score: 1 }),
    };
    const fetchProvider = {
      searchBestSubtitle: vi.fn(),
      hasUsableProvider: vi.fn().mockResolvedValue(true),
    };

    const service = new SubtitleAutomationService(
      repository as any,
      settingsService as any,
      missingService as any,
      wantedService as any,
      fetchService as any,
      fetchProvider as any,
    );

    const stats = await service.runAutomationCycle();

    expect(stats.skippedNoProvider).toBe(0);
    expect(stats.downloaded).toBe(1);
    expect(repository.listWantedSubtitlesByStates).toHaveBeenCalled();
  });
});
