import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IndexerHealthRepository } from '../repositories/IndexerHealthRepository';
import type { IndexerHealthSnapshot } from '../types/modelTypes';
import type { ApiEventHub } from '../api/eventHub';

function makeHealthRepo(
  overrides: Partial<{
    getByIndexerId: ReturnType<typeof vi.fn>;
    recordSuccess: ReturnType<typeof vi.fn>;
    recordFailure: ReturnType<typeof vi.fn>;
    getByIndexerIdWithThresholdContext: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    disable: ReturnType<typeof vi.fn>;
  }> = {},
): IndexerHealthRepository {
  const failureCountByIndexer = new Map<number, number>();
  return {
    getByIndexerId: overrides.getByIndexerId ?? vi.fn().mockImplementation(async (id: number) => {
      const count = failureCountByIndexer.get(id) ?? 0;
      return {
        id: 1,
        indexerId: id,
        lastSuccessAt: null,
        lastFailureAt: new Date('2026-05-09T10:00:00Z'),
        failureCount: count,
        lastErrorMessage: 'last error',
        createdAt: new Date('2026-05-09T09:00:00Z'),
        updatedAt: new Date('2026-05-09T10:00:00Z'),
      } satisfies IndexerHealthSnapshot;
    }),
    getByIndexerIdWithThresholdContext: overrides.getByIndexerIdWithThresholdContext ?? vi.fn(),
    list: overrides.list ?? vi.fn().mockResolvedValue([]),
    disable: overrides.disable ?? vi.fn().mockResolvedValue(undefined),
    recordSuccess: overrides.recordSuccess ?? vi.fn().mockResolvedValue(undefined),
    recordFailure: overrides.recordFailure ?? vi.fn().mockImplementation(
      async (id: number, message: string) => {
        const next = (failureCountByIndexer.get(id) ?? 0) + 1;
        failureCountByIndexer.set(id, next);
        return {
          id: 1,
          indexerId: id,
          lastSuccessAt: null,
          lastFailureAt: new Date('2026-05-09T10:00:00Z'),
          failureCount: next,
          lastErrorMessage: message,
          createdAt: new Date('2026-05-09T09:00:00Z'),
          updatedAt: new Date('2026-05-09T10:00:00Z'),
        } satisfies IndexerHealthSnapshot;
      },
    ),
    __failureCountByIndexer: failureCountByIndexer,
  } as unknown as IndexerHealthRepository;
}

function makeSettings(threshold: number) {
  return {
    getAutoDisableThreshold: vi.fn().mockResolvedValue(threshold),
  };
}

function makeEventHub() {
  return {
    publish: vi.fn(),
    addClient: vi.fn(),
    removeClient: vi.fn(),
    clientCount: 0,
    close: vi.fn(),
  } as unknown as ApiEventHub;
}

describe('shouldAutoDisable (pure threshold detector)', () => {
  it('returns false for a null snapshot', async () => {
    const { shouldAutoDisable } = await import('./IndexerAutoDisable');
    expect(shouldAutoDisable(null, 3)).toBe(false);
  });

  it('returns false when failureCount is below the threshold', async () => {
    const { shouldAutoDisable } = await import('./IndexerAutoDisable');
    const snapshot = {
      id: 1,
      indexerId: 11,
      lastSuccessAt: null,
      lastFailureAt: new Date('2026-05-09T10:00:00Z'),
      failureCount: 2,
      lastErrorMessage: 'x',
      createdAt: new Date('2026-05-09T09:00:00Z'),
      updatedAt: new Date('2026-05-09T10:00:00Z'),
    } satisfies IndexerHealthSnapshot;
    expect(shouldAutoDisable(snapshot, 3)).toBe(false);
  });

  it('returns true at the threshold boundary', async () => {
    const { shouldAutoDisable } = await import('./IndexerAutoDisable');
    const snapshot = {
      id: 1,
      indexerId: 11,
      lastSuccessAt: null,
      lastFailureAt: new Date('2026-05-09T10:00:00Z'),
      failureCount: 3,
      lastErrorMessage: 'x',
      createdAt: new Date('2026-05-09T09:00:00Z'),
      updatedAt: new Date('2026-05-09T10:00:00Z'),
    } satisfies IndexerHealthSnapshot;
    expect(shouldAutoDisable(snapshot, 3)).toBe(true);
  });

  it('returns true when failureCount is above the threshold', async () => {
    const { shouldAutoDisable } = await import('./IndexerAutoDisable');
    const snapshot = {
      id: 1,
      indexerId: 11,
      lastSuccessAt: null,
      lastFailureAt: new Date('2026-05-09T10:00:00Z'),
      failureCount: 7,
      lastErrorMessage: 'x',
      createdAt: new Date('2026-05-09T09:00:00Z'),
      updatedAt: new Date('2026-05-09T10:00:00Z'),
    } satisfies IndexerHealthSnapshot;
    expect(shouldAutoDisable(snapshot, 3)).toBe(true);
  });

  it('treats threshold=0 as "never disable" (zero is a sentinel for disabled)', async () => {
    const { shouldAutoDisable } = await import('./IndexerAutoDisable');
    const snapshot = {
      id: 1,
      indexerId: 11,
      lastSuccessAt: null,
      lastFailureAt: new Date('2026-05-09T10:00:00Z'),
      failureCount: 99,
      lastErrorMessage: 'x',
      createdAt: new Date('2026-05-09T09:00:00Z'),
      updatedAt: new Date('2026-05-09T10:00:00Z'),
    } satisfies IndexerHealthSnapshot;
    expect(shouldAutoDisable(snapshot, 0)).toBe(false);
  });
});

describe('IndexerAutoDisable (orchestrator)', () => {
  let healthRepo: IndexerHealthRepository;

  beforeEach(() => {
    healthRepo = makeHealthRepo();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exposes a constructor that takes the health repository, a settings provider, and an optional event hub', async () => {
    const { IndexerAutoDisable } = await import('./IndexerAutoDisable');
    const settings = makeSettings(3);
    const eventHub = makeEventHub();
    const service = new IndexerAutoDisable(healthRepo, settings, eventHub);
    expect(service).toBeInstanceOf(IndexerAutoDisable);
  });

  // ─── Targeted Red: "disables indexer at threshold" ─────────────────────────
  // This is the most targeted Red test in the Phase 2 test strategy. It must
  // fail at HEAD because the IndexerAutoDisable orchestrator does not exist yet.
  it('disables indexer at threshold', async () => {
    const { IndexerAutoDisable } = await import('./IndexerAutoDisable');
    const settings = makeSettings(3);
    const service = new IndexerAutoDisable(healthRepo, settings);

    await service.handleFailure(42, 'transient 500');
    await service.handleFailure(42, 'transient 500');
    const result = await service.handleFailure(42, 'transient 500');

    expect(result.wasDisabled).toBe(true);
    expect(healthRepo.disable).toHaveBeenCalledTimes(1);
    expect(healthRepo.disable).toHaveBeenCalledWith(42);
  });

  it('does not disable the indexer when failureCount is below the threshold', async () => {
    const { IndexerAutoDisable } = await import('./IndexerAutoDisable');
    const settings = makeSettings(3);
    const service = new IndexerAutoDisable(healthRepo, settings);

    await service.handleFailure(42, 'transient 500');
    const result = await service.handleFailure(42, 'transient 500');

    expect(result.wasDisabled).toBe(false);
    expect(healthRepo.disable).not.toHaveBeenCalled();
  });

  it('does not call disable when the snapshot is null (no prior failures recorded)', async () => {
    const { IndexerAutoDisable } = await import('./IndexerAutoDisable');
    const settings = makeSettings(3);
    const failingRecordFailure = vi.fn().mockResolvedValue(null);
    const repo = makeHealthRepo({ recordFailure: failingRecordFailure });
    const service = new IndexerAutoDisable(repo, settings);

    const result = await service.handleFailure(42, 'edge case');

    expect(result.wasDisabled).toBe(false);
    expect(repo.disable).not.toHaveBeenCalled();
  });

  it('reads the threshold from the settings provider, not a hard-coded constant', async () => {
    const { IndexerAutoDisable } = await import('./IndexerAutoDisable');
    const settings = makeSettings(10);
    const service = new IndexerAutoDisable(healthRepo, settings);

    for (let i = 0; i < 5; i += 1) {
      await service.handleFailure(42, 'fail');
    }

    expect(settings.getAutoDisableThreshold).toHaveBeenCalled();
    expect(healthRepo.disable).not.toHaveBeenCalled();
  });

  it('emits an indexer:healthChanged SSE event when auto-disable trips', async () => {
    const { IndexerAutoDisable } = await import('./IndexerAutoDisable');
    const settings = makeSettings(1);
    const eventHub = makeEventHub();
    const service = new IndexerAutoDisable(healthRepo, settings, eventHub);

    await service.handleFailure(42, 'persistent 500');

    expect(eventHub.publish).toHaveBeenCalledWith(
      'indexer:healthChanged',
      expect.objectContaining({ indexerId: 42 }),
    );
  });

  it('does not emit indexer:healthChanged when failureCount is below the threshold', async () => {
    const { IndexerAutoDisable } = await import('./IndexerAutoDisable');
    const settings = makeSettings(3);
    const eventHub = makeEventHub();
    const service = new IndexerAutoDisable(healthRepo, settings, eventHub);

    await service.handleFailure(42, 'transient');

    expect(eventHub.publish).not.toHaveBeenCalled();
  });

  it('disables only once across many failures at or above the threshold', async () => {
    const { IndexerAutoDisable } = await import('./IndexerAutoDisable');
    const settings = makeSettings(3);
    const service = new IndexerAutoDisable(healthRepo, settings);

    for (let i = 0; i < 10; i += 1) {
      await service.handleFailure(42, 'flood of failures');
    }

    expect(healthRepo.disable).toHaveBeenCalledTimes(1);
  });
});
