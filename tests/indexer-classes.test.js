import { describe, it, expect } from 'vitest';
import { BaseIndexer, TorznabIndexer, ScrapingIndexer } from '../server/src/indexers/BaseIndexer';

describe('BaseIndexer', () => {
  it('should not be instantiable directly', () => {
    expect(() => new BaseIndexer({
      id: 1, name: 'Test', implementation: 'Base',
      protocol: 'torrent', enabled: true, priority: 25,
      supportsRss: true, supportsSearch: true, settings: {},
    })).toThrow();
  });
});

describe('TorznabIndexer', () => {
  const config = {
    id: 1,
    name: 'Test Torznab',
    implementation: 'Torznab',
    protocol: 'torrent',
    enabled: true,
    priority: 25,
    supportsRss: true,
    supportsSearch: true,
    settings: { apiKey: 'test-key', url: 'https://indexer.example.com' },
  };

  it('should create a TorznabIndexer with correct properties', () => {
    const indexer = new TorznabIndexer(config);
    expect(indexer.name).toBe('Test Torznab');
    expect(indexer.implementation).toBe('Torznab');
    expect(indexer.protocol).toBe('torrent');
    expect(indexer.supportsRss).toBe(true);
    expect(indexer.supportsSearch).toBe(true);
  });

  it('should expose settings with apiKey and url', () => {
    const indexer = new TorznabIndexer(config);
    expect(indexer.settings.apiKey).toBe('test-key');
    expect(indexer.settings.url).toBe('https://indexer.example.com');
  });

  it('should build a search URL from query parameters', () => {
    const indexer = new TorznabIndexer(config);
    const url = indexer.buildSearchUrl({ q: 'test movie', categories: [2000, 2040] });
    expect(url).toContain('https://indexer.example.com');
    expect(url).toContain('t=search');
    expect(url).toContain('apikey=test-key');
    expect(url).toContain('q=test+movie');
    expect(url).toMatch(/cat=2000(,|%2C)2040/);
  });

  it('should build an RSS URL', () => {
    const indexer = new TorznabIndexer(config);
    const url = indexer.buildRssUrl();
    expect(url).toContain('t=search');
    expect(url).toContain('apikey=test-key');
  });

  it('should build a test URL (caps request)', () => {
    const indexer = new TorznabIndexer(config);
    const url = indexer.buildTestUrl();
    expect(url).toContain('t=caps');
    expect(url).toContain('apikey=test-key');
  });

  it('should report indexer type as torznab', () => {
    const indexer = new TorznabIndexer(config);
    expect(indexer.indexerType).toBe('torznab');
  });
});

describe('ScrapingIndexer', () => {
  const config = {
    id: 2,
    name: 'Test Scraper',
    implementation: 'Cardigann',
    protocol: 'torrent',
    enabled: true,
    priority: 25,
    supportsRss: true,
    supportsSearch: true,
    settings: { username: 'user', password: 'pass' },
    definition: {
      id: 'test-scraper',
      name: 'Test Scraper',
      type: 'private',
      links: ['https://scraper.example.com'],
      search: {
        paths: [{ path: '/search?q={{ .Query.Keywords }}' }],
        rows: { selector: 'table tbody tr' },
        fields: {
          title: { selector: 'td a' },
          download: { selector: 'td a.dl', attribute: 'href' },
        },
      },
      caps: {
        categorymappings: [
          { id: '1', cat: 'Movies', desc: 'Movies' },
        ],
      },
    },
  };

  it('should create a ScrapingIndexer with definition', () => {
    const indexer = new ScrapingIndexer(config);
    expect(indexer.name).toBe('Test Scraper');
    expect(indexer.implementation).toBe('Cardigann');
    expect(indexer.definition.id).toBe('test-scraper');
  });

  it('should report indexer type as scraping', () => {
    const indexer = new ScrapingIndexer(config);
    expect(indexer.indexerType).toBe('scraping');
  });

  it('should expose search paths from definition', () => {
    const indexer = new ScrapingIndexer(config);
    expect(indexer.searchPaths).toHaveLength(1);
    expect(indexer.searchPaths[0].path).toContain('/search');
  });

  it('should expose category mappings from definition', () => {
    const indexer = new ScrapingIndexer(config);
    expect(indexer.categoryMappings).toHaveLength(1);
    expect(indexer.categoryMappings[0].cat).toBe('Movies');
  });

  it('should resolve the base URL from definition links', () => {
    const indexer = new ScrapingIndexer(config);
    expect(indexer.baseUrl).toBe('https://scraper.example.com');
  });
});
