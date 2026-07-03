import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';

function makeService(indexer: { search: ReturnType<typeof vi.fn> }) {
  const indexerRepository = {
    findAllEnabled: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: 'TestIndexer',
        implementation: 'Cardigann',
        protocol: 'torrent',
        enabled: true,
        priority: 1,
        supportsRss: true,
        supportsSearch: true,
        settings: {},
      },
    ]),
  };

  const indexerFactory = {
    fromDatabaseRecord: vi.fn().mockReturnValue(indexer),
  };

  const torrentManager = {
    addTorrent: vi.fn(),
  };

  const service = new MediaSearchService(
    indexerRepository as unknown as ConstructorParameters<typeof MediaSearchService>[0],
    indexerFactory as unknown as ConstructorParameters<typeof MediaSearchService>[1],
    torrentManager as unknown as ConstructorParameters<typeof MediaSearchService>[2],
  );

  return { service, indexerRepository, indexerFactory, torrentManager };
}

describe('MediaSearchService.searchWithTimeout fake-timer reproduction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks a hanging indexer as timeout when fake timers are active', async () => {
    const { service } = makeService({
      search: vi.fn().mockImplementation(() => new Promise(() => {})),
    });

    // With fake timers active, the internal setTimeout in searchWithTimeout never
    // fires, so this promise hangs until the test timeout.
    const searchPromise = service.searchAllIndexers({ query: 'test', type: 'movie' });

    await expect(searchPromise).rejects.toThrow('Indexer search timed out');
  }, 500);
});

describe('MediaSearchService.searchAllIndexers timeoutMs contract', () => {
  it('accepts an optional timeoutMs and times out a hanging indexer quickly', async () => {
    const { service } = makeService({
      search: vi.fn().mockImplementation(() => new Promise(() => {})),
    });

    // No fake timers — real timers with a 10ms injected timeout should resolve fast.
    const result = await service.searchAllIndexers({ query: 'test', type: 'movie' }, 10);

    expect(result.indexerResults).toHaveLength(1);
    expect(result.indexerResults[0]).toMatchObject({
      indexerName: 'TestIndexer',
      status: 'timeout',
      resultCount: 0,
    });
  }, 1000);
});
