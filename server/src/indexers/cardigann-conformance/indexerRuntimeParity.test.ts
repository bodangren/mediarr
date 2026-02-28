import { describe, expect, it } from 'vitest';
import { BaseIndexer, ScrapingIndexer, TorznabIndexer } from '../BaseIndexer';
import type { CardigannDefinition } from '../DefinitionLoader';
import type { HttpResponse } from '../HttpClient';
import { SearchTranslator } from '../SearchTranslator';

class StubHttpClient {
  responses: Record<string, HttpResponse> = {};
  calls: Array<{ url: string; headers?: Record<string, string> }> = [];

  setResponse(urlPart: string, response: HttpResponse): void {
    this.responses[urlPart] = response;
  }

  async get(url: string, options: { headers?: Record<string, string> } = {}): Promise<HttpResponse> {
    this.calls.push({ url, headers: options.headers });

    const entry = Object.entries(this.responses).find(([urlPart]) => url.includes(urlPart));
    if (!entry) {
      return {
        status: 404,
        ok: false,
        body: 'Not Found',
        headers: {},
      };
    }

    return entry[1];
  }
}

function buildScrapingDefinition(overrides: Partial<CardigannDefinition> = {}): CardigannDefinition {
  return {
    id: 'runtime-parity',
    name: 'Runtime Parity',
    type: 'public',
    links: ['https://indexer.example'],
    search: {
      paths: [{ path: '/search' }],
      rows: { selector: 'tr.row' },
      fields: {
        title: { selector: '.title' },
      },
    },
    ...overrides,
  };
}

describe('Cardigann indexer runtime parity', () => {
  it('guards against direct BaseIndexer instantiation', () => {
    expect(() => new (BaseIndexer as never)({
      id: 1,
      name: 'Base',
      implementation: 'Base',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings: {},
      httpClient: new StubHttpClient() as never,
    })).toThrow(/cannot be instantiated directly/i);
  });

  it('builds Torznab RSS and test URLs from normalized API URL', () => {
    const indexer = new TorznabIndexer({
      id: 1,
      name: 'Torznab',
      implementation: 'Torznab',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings: { url: 'https://torznab.example/', apiKey: 'abc' },
      httpClient: new StubHttpClient() as never,
    });

    expect(indexer.indexerType).toBe('torznab');
    expect(indexer.buildRssUrl()).toBe('https://torznab.example/api?t=search&apikey=abc');
    expect(indexer.buildTestUrl()).toBe('https://torznab.example/api?t=caps&apikey=abc');
  });

  it('searches scraping indexer with request builder and parses response', async () => {
    const client = new StubHttpClient();
    client.setResponse('/search', {
      status: 200,
      ok: true,
      body: '<table><tr class="row"><td class="title">Ubuntu ISO</td></tr></table>',
      headers: { 'content-type': 'text/html' },
    });

    const indexer = new ScrapingIndexer({
      id: 2,
      name: 'Scraping',
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings: {},
      definition: buildScrapingDefinition(),
      httpClient: client as never,
    });

    expect(indexer.indexerType).toBe('scraping');

    const results = await indexer.search({ q: 'ubuntu' });
    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe('Ubuntu ISO');
    expect(client.calls[0]!.url).toContain('/search');
  });

  it('preserves string category mapping IDs for scraping requests', async () => {
    const client = new StubHttpClient();
    client.setResponse('/search', {
      status: 200,
      ok: true,
      body: '<div></div>',
      headers: { 'content-type': 'text/html' },
    });

    const indexer = new ScrapingIndexer({
      id: 21,
      name: 'TGX-like',
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings: {},
      definition: buildScrapingDefinition({
        caps: {
          categorymappings: [
            { id: 'TV', cat: 'TV', desc: 'TV' },
            { id: 'Movies', cat: 'Movies', desc: 'Movies' },
          ],
        },
        search: {
          paths: [{ path: '/search{{ range .Categories }}:category:{{.}}{{ end }}' }],
          rows: { selector: 'div' },
          fields: {
            title: { selector: '.title', optional: true, default: 'placeholder' },
          },
        },
      }),
      httpClient: client as never,
    });

    await indexer.search({ q: 'The Sopranos', categories: [5000] });

    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]!.url).toContain(':category:TV');
    expect(client.calls[0]!.url).not.toContain(':category:NaN');
  });

  it('fails scraping indexer when search paths are missing or request fails', async () => {
    const noPathIndexer = new ScrapingIndexer({
      id: 3,
      name: 'No Path',
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings: {},
      definition: buildScrapingDefinition({
        search: {
          paths: [],
          rows: { selector: 'tr' },
          fields: { title: { selector: '.title' } },
        },
      }),
      httpClient: new StubHttpClient() as never,
    });

    await expect(noPathIndexer.search({ q: 'ubuntu' })).rejects.toThrow(/no search paths/i);

    const failingClient = new StubHttpClient();
    const failingIndexer = new ScrapingIndexer({
      id: 4,
      name: 'Failing',
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings: {},
      definition: buildScrapingDefinition(),
      httpClient: failingClient as never,
    });

    await expect(failingIndexer.search({ q: 'ubuntu' })).rejects.toThrow(/scraping request failed: 404/i);
  });

  it('dispatches SearchTranslator by indexer type and errors for unsupported indexers', async () => {
    const client = new StubHttpClient();
    client.setResponse('/api?t=search', {
      status: 200,
      ok: true,
      body: '<rss version="2.0"><channel><item><title>One</title><guid>a</guid></item></channel></rss>',
      headers: { 'content-type': 'application/xml' },
    });
    client.setResponse('/search', {
      status: 200,
      ok: true,
      body: '<html></html>',
      headers: { 'content-type': 'text/html' },
    });

    const translator = new SearchTranslator(client as never);

    const torznab = new TorznabIndexer({
      id: 11,
      name: 'T',
      implementation: 'Torznab',
      protocol: 'torrent',
      enabled: true,
      priority: 1,
      supportsRss: true,
      supportsSearch: true,
      settings: { url: 'https://torznab.example', apiKey: 'key' },
      httpClient: client as never,
    });

    const scraping = new ScrapingIndexer({
      id: 12,
      name: 'S',
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 1,
      supportsRss: true,
      supportsSearch: true,
      settings: {},
      definition: buildScrapingDefinition(),
      httpClient: client as never,
    });

    const torznabResponse = await translator.search(torznab, { q: 'linux' });
    expect(torznabResponse.ok).toBe(true);

    const scrapingResponse = await translator.search(scraping, { q: 'ubuntu' });
    expect(scrapingResponse.ok).toBe(true);

    class UnsupportedIndexer extends BaseIndexer {
      get indexerType(): string {
        return 'unsupported';
      }
    }

    const unsupported = new UnsupportedIndexer({
      id: 13,
      name: 'U',
      implementation: 'Unsupported',
      protocol: 'torrent',
      enabled: true,
      priority: 1,
      supportsRss: false,
      supportsSearch: false,
      settings: {},
      httpClient: client as never,
    });

    await expect(translator.search(unsupported, { q: 'x' })).rejects.toThrow(/unsupported indexer type/i);
  });
});
