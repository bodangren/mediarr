import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import { CatalogCache, type CatalogEntry } from './CatalogCache';

vi.mock('node:fs');

describe('CatalogCache', () => {
  const mockCatalog: CatalogEntry[] = [
    {
      id: '1337x',
      name: '1337x',
      description: 'Popular public torrent site',
      type: 'torznab',
      baseUrl: 'https://1337x.to',
      categories: ['TV', 'MOVIE'],
      requiresApiKey: false,
      implementation: 'Cardigann',
      configContract: 'CardigannSettings',
      supportedMediaTypes: ['TV', 'MOVIE'],
      supportsSearch: true,
      supportsRss: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads catalog from file', async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCatalog));

    const cache = new CatalogCache('/mock/path.json');
    await cache.load();

    expect(cache.get()).toEqual(mockCatalog);
  });

  it('returns empty array when file not found', async () => {
    vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('ENOENT'));

    const cache = new CatalogCache('/mock/path.json');
    await cache.load();

    expect(cache.get()).toEqual([]);
  });

  it('throws when get() called before load()', () => {
    const cache = new CatalogCache('/mock/path.json');

    expect(() => cache.get()).toThrow('CatalogCache not loaded');
  });

  it('serves from memory without re-reading file', async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCatalog));

    const cache = new CatalogCache('/mock/path.json');
    await cache.load();

    vi.mocked(fs.promises.readFile).mockClear();

    const result = cache.get();
    expect(result).toEqual(mockCatalog);
    expect(fs.promises.readFile).not.toHaveBeenCalled();
  });

  it('invalidate clears cache so next get throws', async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCatalog));

    const cache = new CatalogCache('/mock/path.json');
    await cache.load();
    cache.invalidate();

    expect(() => cache.get()).toThrow('CatalogCache not loaded');
  });

  it('reloads after invalidate', async () => {
    vi.mocked(fs.promises.readFile)
      .mockResolvedValueOnce(JSON.stringify(mockCatalog))
      .mockResolvedValueOnce(JSON.stringify([{ ...mockCatalog[0], name: 'Updated' }]));

    const cache = new CatalogCache('/mock/path.json');
    await cache.load();
    expect(cache.get()[0]!.name).toBe('1337x');

    cache.invalidate();
    await cache.load();
    expect(cache.get()[0]!.name).toBe('Updated');
  });

  it('watch triggers reload on file change', async () => {
    const mockWatcher = {
      close: vi.fn(),
    };
    vi.mocked(fs.watch).mockReturnValue(mockWatcher as unknown as fs.FSWatcher);
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCatalog));

    const cache = new CatalogCache('/mock/path.json');
    await cache.load();

    cache.watch();

    expect(fs.watch).toHaveBeenCalledWith('/mock/path.json', expect.any(Function));

    const watchCallback = vi.mocked(fs.watch).mock.calls[0]![1] as (eventType: string) => void;
    watchCallback('change');

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
    cache.unwatch();
  });

  it('watch handles rename events', async () => {
    const mockWatcher = {
      close: vi.fn(),
    };
    vi.mocked(fs.watch).mockReturnValue(mockWatcher as unknown as fs.FSWatcher);
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCatalog));

    const cache = new CatalogCache('/mock/path.json');
    await cache.load();
    cache.watch();

    const watchCallback = vi.mocked(fs.watch).mock.calls[0]![1] as (eventType: string) => void;
    watchCallback('rename');

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
    cache.unwatch();
  });

  it('unwatch stops the watcher', async () => {
    const mockWatcher = {
      close: vi.fn(),
    };
    vi.mocked(fs.watch).mockReturnValue(mockWatcher as unknown as fs.FSWatcher);
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCatalog));

    const cache = new CatalogCache('/mock/path.json');
    await cache.load();
    cache.watch();
    cache.unwatch();

    expect(mockWatcher.close).toHaveBeenCalled();
  });

  it('watch is idempotent', async () => {
    const mockWatcher = {
      close: vi.fn(),
    };
    vi.mocked(fs.watch).mockReturnValue(mockWatcher as unknown as fs.FSWatcher);
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCatalog));

    const cache = new CatalogCache('/mock/path.json');
    await cache.load();
    cache.watch();
    cache.watch();

    expect(fs.watch).toHaveBeenCalledTimes(1);
    cache.unwatch();
  });

  it('resolves default catalog path relative to __dirname', () => {
    const cache = new CatalogCache();
    const expectedPath = require('path').resolve(__dirname, '../../data/popular-indexers.json');
    expect(cache.getCatalogPath()).toBe(expectedPath);
  });
});
