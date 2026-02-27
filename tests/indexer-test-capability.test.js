import { describe, it, expect, vi } from 'vitest';
import { IndexerTester } from '../server/src/indexers/IndexerTester';
import { TorznabIndexer, ScrapingIndexer } from '../server/src/indexers/BaseIndexer';
import { HttpClient } from '../server/src/indexers/HttpClient';

describe('IndexerTester', () => {
  describe('Torznab indexer testing', () => {
    const torznabIndexer = new TorznabIndexer({
      id: 1, name: 'Test Torznab', implementation: 'Torznab',
      protocol: 'torrent', enabled: true, priority: 25,
      supportsRss: true, supportsSearch: true,
      settings: { apiKey: 'test-key', url: 'https://indexer.example.com' },
    });

    it('should pass test when caps endpoint returns valid XML', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => `<?xml version="1.0"?>
<caps>
  <searching>
    <search available="yes"/>
    <tv-search available="yes"/>
  </searching>
  <categories>
    <category id="2000" name="Movies"/>
    <category id="5000" name="TV"/>
  </categories>
</caps>`,
        headers: new Headers({ 'content-type': 'application/xml' }),
      });

      const client = new HttpClient();
      const tester = new IndexerTester(client);
      const result = await tester.testTorznab(torznabIndexer, mockFetch);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successful');
    });

    it('should fail test when caps endpoint returns error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false, status: 401,
        text: async () => 'Unauthorized',
        headers: new Headers(),
      });

      const client = new HttpClient();
      const tester = new IndexerTester(client);
      const result = await tester.testTorznab(torznabIndexer, mockFetch);

      expect(result.success).toBe(false);
      expect(result.message).toContain('401');
    });

    it('should fail test when caps response is not valid XML', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => 'not xml at all',
        headers: new Headers({ 'content-type': 'text/html' }),
      });

      const client = new HttpClient();
      const tester = new IndexerTester(client);
      const result = await tester.testTorznab(torznabIndexer, mockFetch);

      expect(result.success).toBe(false);
      expect(result.message).toContain('invalid');
    });

    it('should fail test on network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const client = new HttpClient();
      const tester = new IndexerTester(client);
      const result = await tester.testTorznab(torznabIndexer, mockFetch);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection refused');
    });
  });

  describe('Scraping indexer testing', () => {
    const scrapingIndexer = new ScrapingIndexer({
      id: 2, name: 'Test Scraper', implementation: 'Cardigann',
      protocol: 'torrent', enabled: true, priority: 25,
      supportsRss: true, supportsSearch: true,
      settings: {},
      definition: {
        id: 'test', name: 'Test', type: 'public',
        links: ['https://scraper.example.com'],
        search: {
          paths: [{ path: '/search?q={{ .Query.Keywords }}' }],
          rows: { selector: 'table tbody tr' },
          fields: { title: { selector: 'td a' } },
        },
      },
    });

    it('should pass test when site homepage is reachable', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => '<html><body>Site content</body></html>',
        headers: new Headers({ 'content-type': 'text/html' }),
      });

      const client = new HttpClient();
      const tester = new IndexerTester(client);
      const result = await tester.testScraping(scrapingIndexer, mockFetch);

      expect(result.success).toBe(true);
    });

    it('should fail test when site is unreachable', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const client = new HttpClient();
      const tester = new IndexerTester(client);
      const result = await tester.testScraping(scrapingIndexer, mockFetch);

      expect(result.success).toBe(false);
    });

    it('should fail test when response body is a block page (missing indexer name)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => '<html><body>Your ISP has blocked this site.</body></html>',
        headers: new Headers({ 'content-type': 'text/html' }),
      });

      const client = new HttpClient();
      const tester = new IndexerTester(client);
      const result = await tester.testScraping(scrapingIndexer, mockFetch);

      expect(result.success).toBe(false);
      expect(result.message).toContain('invalid content');
    });
  });

  describe('unified test method', () => {
    it('should route to torznab test for TorznabIndexer', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => '<caps><searching/><categories/></caps>',
        headers: new Headers(),
      });

      const indexer = new TorznabIndexer({
        id: 1, name: 'T', implementation: 'Torznab',
        protocol: 'torrent', enabled: true, priority: 25,
        supportsRss: true, supportsSearch: true,
        settings: { apiKey: 'k', url: 'https://t.com' },
      });

      const client = new HttpClient();
      const tester = new IndexerTester(client);
      const result = await tester.test(indexer, mockFetch);
      expect(result.success).toBe(true);
    });
  });
});
