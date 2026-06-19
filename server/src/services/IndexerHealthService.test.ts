import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IndexerHealthRepository } from '../repositories/IndexerHealthRepository';
import type { BaseIndexer } from '../indexers/BaseIndexer';
import type { HttpClient } from '../indexers/HttpClient';

function makeIndexerHealthRepo(): IndexerHealthRepository {
  return {
    getByIndexerId: vi.fn(),
    recordSuccess: vi.fn().mockResolvedValue(undefined),
    recordFailure: vi.fn().mockResolvedValue(undefined),
  } as unknown as IndexerHealthRepository;
}

function makeTorznabIndexer(overrides: Record<string, unknown> = {}): BaseIndexer {
  return {
    id: 11,
    name: 'Test Torznab',
    implementation: 'Torznab',
    protocol: 'torrent',
    enabled: true,
    settings: { url: 'https://indexer.example', apiKey: 'k' },
    buildTestUrl: vi.fn().mockReturnValue('https://indexer.example/api?t=caps&apikey=k'),
    buildRssUrl: vi.fn(),
    ...overrides,
  } as unknown as BaseIndexer;
}

function makeNewznabIndexer(overrides: Record<string, unknown> = {}): BaseIndexer {
  return {
    id: 22,
    name: 'Test Newznab',
    implementation: 'Newznab',
    protocol: 'nzb',
    enabled: true,
    settings: { host: 'https://newznab.example', apiKey: 'k' },
    buildTestUrl: vi.fn().mockReturnValue('https://newznab.example/api?t=caps&apikey=k'),
    buildRssUrl: vi.fn(),
    ...overrides,
  } as unknown as BaseIndexer;
}

function makeCardigannIndexer(overrides: Record<string, unknown> = {}): BaseIndexer {
  return {
    id: 33,
    name: 'Test Cardigann',
    implementation: 'Cardigann',
    protocol: 'torrent',
    enabled: true,
    settings: { definitionId: '1337x', baseUrl: 'https://1337x.example' },
    baseUrl: 'https://1337x.example',
    buildTestUrl: vi.fn(),
    ...overrides,
  } as unknown as BaseIndexer;
}

function makeHttpClient(overrides: Record<string, any> = {}) {
  return {
    get: vi.fn().mockResolvedValue({ ok: true, status: 200, body: '<caps></caps>' }),
    ...overrides,
  } as unknown as HttpClient;
}

describe('IndexerHealthService (Phase 1)', () => {
  let healthRepo: IndexerHealthRepository;
  let httpClient: HttpClient;

  beforeEach(() => {
    healthRepo = makeIndexerHealthRepo();
    httpClient = makeHttpClient();
  });

  it('imports the service module from services/IndexerHealthService', async () => {
    const mod = await import('./IndexerHealthService');
    expect(mod.IndexerHealthService).toBeDefined();
  });

  it('pings a Torznab indexer and records success when the caps endpoint responds 2xx', async () => {
    const mod = await import('./IndexerHealthService');
    const service = new mod.IndexerHealthService(healthRepo, httpClient);
    const indexer = makeTorznabIndexer();

    const result = await service.ping(indexer);

    expect(result.success).toBe(true);
    expect(healthRepo.recordSuccess).toHaveBeenCalledWith(11, expect.any(Date));
    expect(healthRepo.recordFailure).not.toHaveBeenCalled();
  });

  it('pings a Newznab indexer and records failure when the caps endpoint responds 500', async () => {
    const mod = await import('./IndexerHealthService');
    httpClient = makeHttpClient({
      get: vi.fn().mockResolvedValue({ ok: false, status: 500, body: '' }),
    });
    const service = new mod.IndexerHealthService(healthRepo, httpClient);
    const indexer = makeNewznabIndexer();

    const result = await service.ping(indexer);

    expect(result.success).toBe(false);
    expect(healthRepo.recordFailure).toHaveBeenCalledWith(
      22,
      expect.stringContaining('500'),
      expect.any(Date),
    );
    expect(healthRepo.recordSuccess).not.toHaveBeenCalled();
  });

  it('pings a Cardigann (scraping) indexer against its baseUrl and records success on 2xx', async () => {
    const mod = await import('./IndexerHealthService');
    const service = new mod.IndexerHealthService(healthRepo, httpClient);
    const indexer = makeCardigannIndexer();

    const result = await service.ping(indexer);

    expect(result.success).toBe(true);
    expect(httpClient.get).toHaveBeenCalledWith(
      expect.stringContaining('https://1337x.example'),
      expect.any(Object),
      undefined,
    );
    expect(healthRepo.recordSuccess).toHaveBeenCalledWith(33, expect.any(Date));
  });

  it('does not call recordSuccess/recordFailure when indexer has no persisted id', async () => {
    const mod = await import('./IndexerHealthService');
    const service = new mod.IndexerHealthService(healthRepo, httpClient);
    const draftIndexer = makeTorznabIndexer({ id: 0 });

    await service.ping(draftIndexer);

    expect(healthRepo.recordSuccess).not.toHaveBeenCalled();
    expect(healthRepo.recordFailure).not.toHaveBeenCalled();
  });

  it('records failure with the error message when the fetch throws', async () => {
    const mod = await import('./IndexerHealthService');
    httpClient = makeHttpClient({
      get: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    });
    const service = new mod.IndexerHealthService(healthRepo, httpClient);
    const indexer = makeTorznabIndexer();

    const result = await service.ping(indexer);

    expect(result.success).toBe(false);
    expect(healthRepo.recordFailure).toHaveBeenCalledWith(
      11,
      expect.stringContaining('ECONNREFUSED'),
      expect.any(Date),
    );
  });
});
