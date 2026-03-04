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
    });
    expect(missingService.computeAndPersistForVariant).toHaveBeenCalledTimes(2);
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
});
