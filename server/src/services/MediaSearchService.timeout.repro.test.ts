import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';

describe('MediaSearchService.searchWithTimeout fake-timer reproduction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks a hanging indexer as timeout when fake timers are active', async () => {
    const indexerRepository = {
      findAllEnabled: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: 'HangingIndexer',
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

    const indexer = {
      search: vi.fn().mockImplementation(() => new Promise(() => {})),
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

    // With fake timers active, the internal setTimeout in searchWithTimeout never
    // fires, so this promise hangs until the test timeout.
    const searchPromise = service.searchAllIndexers({ query: 'test', type: 'movie' });

    await expect(searchPromise).rejects.toThrow('Indexer search timed out');
  }, 500);
});
