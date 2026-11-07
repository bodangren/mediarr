import { describe, expect, it, vi } from 'vitest';
import { WantedSearchService } from './WantedSearchService';

describe('WantedSearchService indexer guard', () => {
  function buildService(enabledIndexers: number | undefined) {
    const prisma = {
      movie: { findMany: vi.fn().mockResolvedValue([]) },
      episode: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const mediaSearchService = { searchBatch: vi.fn() } as any;
    const activityEventEmitter = { emit: vi.fn().mockResolvedValue(undefined) } as any;
    const service = new WantedSearchService(
      mediaSearchService,
      prisma as any,
      activityEventEmitter,
      enabledIndexers === undefined ? undefined : async () => enabledIndexers,
    );
    return { service, prisma, activityEventEmitter };
  }

  it('does nothing when no indexer is configured', async () => {
    // 11,582 failed SEARCH_EXECUTED events in 24 h came from this cycle running
    // against zero indexers (2026-11-08).
    const { service, prisma, activityEventEmitter } = buildService(0);

    await service.autoSearchAll();

    expect(prisma.movie.findMany).not.toHaveBeenCalled();
    expect(prisma.episode.findMany).not.toHaveBeenCalled();
    expect(activityEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('runs the cycle when at least one indexer exists', async () => {
    const { service, activityEventEmitter } = buildService(1);

    await service.autoSearchAll();

    // The cycle announces itself before doing the work.
    expect(activityEventEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SEARCH_EXECUTED' }),
    );
  });

  it('keeps the previous behaviour when the host does not report indexers', async () => {
    const { service, activityEventEmitter } = buildService(undefined);

    await service.autoSearchAll();

    expect(activityEventEmitter.emit).toHaveBeenCalled();
  });
});
