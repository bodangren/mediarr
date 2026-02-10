import { describe, it, expect, vi } from 'vitest';
import { SearchTranslator } from '../server/src/indexers/SearchTranslator';
import { TorznabIndexer, ScrapingIndexer } from '../server/src/indexers/BaseIndexer';
import { HttpClient } from '../server/src/indexers/HttpClient';

describe('SearchTranslator', () => {
  const client = new HttpClient({ timeout: 5000 });
  const translator = new SearchTranslator(client);

  describe('Torznab search', () => {
    const torznab = new TorznabIndexer({
      id: 1, name: 'Torznab', implementation: 'Torznab',
      protocol: 'torrent', enabled: true, priority: 25,
      supportsRss: true, supportsSearch: true,
      settings: { apiKey: 'key123', url: 'https://tz.example.com' },
    });

    it('should translate a generic query into a Torznab API request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => '<rss><channel><item><title>Result 1</title></item></channel></rss>',
        headers: new Headers(),
      });

      const response = await translator.search(torznab, { q: 'test movie' }, mockFetch);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('t=search');
      expect(url).toContain('apikey=key123');
      expect(url).toContain('q=test+movie');
      expect(response.ok).toBe(true);
    });

    it('should include categories in the Torznab request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => '<rss><channel></channel></rss>',
        headers: new Headers(),
      });

      await translator.search(torznab, { q: 'show', categories: [5000, 5040] }, mockFetch);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toMatch(/cat=5000(,|%2C)5040/);
    });

    it('should include IMDB ID in movie search', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => '<rss><channel></channel></rss>',
        headers: new Headers(),
      });

      await translator.search(torznab, { imdbid: 'tt1234567' }, mockFetch);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('imdbid=tt1234567');
    });
  });

  describe('Scraping search', () => {
    const scraping = new ScrapingIndexer({
      id: 2, name: 'Scraper', implementation: 'Cardigann',
      protocol: 'torrent', enabled: true, priority: 25,
      supportsRss: true, supportsSearch: true,
      settings: {},
      definition: {
        id: 'test', name: 'Test', type: 'public',
        links: ['https://scraper.example.com'],
        search: {
          paths: [{ path: '/search?q={{ .Query.Keywords }}&page=1' }],
          rows: { selector: 'table tbody tr' },
          fields: {
            title: { selector: 'td a' },
            download: { selector: 'td a.dl', attribute: 'href' },
          },
        },
      },
    });

    it('should translate a generic query into a scraping HTTP request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => '<html><body><table><tbody><tr><td><a>Result</a></td></tr></tbody></table></body></html>',
        headers: new Headers(),
      });

      const response = await translator.search(scraping, { q: 'my search' }, mockFetch);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://scraper.example.com/search?q=my+search&page=1');
      expect(response.ok).toBe(true);
    });

    it('should handle empty query for RSS-like browsing', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => '<html></html>',
        headers: new Headers(),
      });

      const response = await translator.search(scraping, {}, mockFetch);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://scraper.example.com/search?q=&page=1');
    });

    it('should search multiple paths when defined', async () => {
      const multiPath = new ScrapingIndexer({
        id: 3, name: 'Multi', implementation: 'Cardigann',
        protocol: 'torrent', enabled: true, priority: 25,
        supportsRss: true, supportsSearch: true,
        settings: {},
        definition: {
          id: 'multi', name: 'Multi', type: 'public',
          links: ['https://multi.example.com'],
          search: {
            paths: [
              { path: '/search1?q={{ .Query.Keywords }}' },
              { path: '/search2?q={{ .Query.Keywords }}' },
            ],
            rows: { selector: 'tr' },
            fields: { title: { selector: 'td' } },
          },
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        text: async () => '<html></html>',
        headers: new Headers(),
      });

      const responses = await translator.searchAll(multiPath, { q: 'test' }, mockFetch);
      expect(responses).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
