import { describe, expect, it } from 'vitest';
import { ScrapingIndexer } from '../BaseIndexer';
import type { CardigannDefinition } from '../DefinitionLoader';
import type { HttpResponse } from '../HttpClient';
import { SearchTranslator } from '../SearchTranslator';

class CaptureHttpClient {
  readonly calls: Array<{ url: string; headers: Record<string, string> }> = [];

  async get(url: string, options: { headers?: Record<string, string> } = {}): Promise<HttpResponse> {
    this.calls.push({
      url,
      headers: options.headers ?? {},
    });

    return {
      status: 200,
      ok: true,
      body: '<html></html>',
      headers: { 'content-type': 'text/html' },
    };
  }
}

function buildDefinition(): CardigannDefinition {
  return {
    id: 'request-parity',
    name: 'Request Parity',
    type: 'public',
    links: ['https://indexer.example'],
    search: {
      paths: [
        {
          path: '/search',
          inputs: {
            page: '1',
            mode: 'regular',
          },
        },
        {
          path: '/search-alt',
          inheritinputs: false,
          inputs: {
            page: '2',
          },
        },
      ],
      inputs: {
        q: '{{ .Keywords }}',
        cat: '{{ .Categories }}',
        '$raw': 'sort=seeders&order=desc',
      },
      headers: {
        'x-api-token': ['{{ .Config.apiToken }}'],
      },
      rows: {
        selector: 'tr',
      },
      fields: {
        title: {
          selector: '.title',
        },
      },
    },
  };
}

describe('Cardigann search request parity', () => {
  it('applies search.inputs and path inputs to the request URL', async () => {
    const client = new CaptureHttpClient();
    const translator = new SearchTranslator(client as never);

    const indexer = new ScrapingIndexer({
      id: 1,
      name: 'Parity Indexer',
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings: { apiToken: 'token-123' },
      definition: buildDefinition(),
      httpClient: client as never,
    });

    await translator.searchAll(indexer, {
      q: 'ubuntu linux',
      categories: [2000, 5000],
    });

    expect(client.calls).toHaveLength(2);

    const firstUrl = new URL(client.calls[0]!.url);
    expect(firstUrl.pathname).toBe('/search');
    expect(firstUrl.searchParams.get('q')).toBe('ubuntu+linux');
    expect(firstUrl.searchParams.get('cat')).toBe('2000,5000');
    expect(firstUrl.searchParams.get('page')).toBe('1');
    expect(firstUrl.searchParams.get('mode')).toBe('regular');
    expect(firstUrl.searchParams.get('sort')).toBe('seeders');
    expect(firstUrl.searchParams.get('order')).toBe('desc');
  });

  it('emits search.headers on each request', async () => {
    const client = new CaptureHttpClient();
    const translator = new SearchTranslator(client as never);

    const indexer = new ScrapingIndexer({
      id: 1,
      name: 'Parity Indexer',
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings: { apiToken: 'token-abc' },
      definition: buildDefinition(),
      httpClient: client as never,
    });

    await translator.searchAll(indexer, {
      q: 'andor',
      categories: [5000],
    });

    expect(client.calls[0]!.headers['x-api-token']).toBe('token-abc');
    expect(client.calls[1]!.headers['x-api-token']).toBe('token-abc');
  });

  it('supports path inheritance toggle for search inputs', async () => {
    const client = new CaptureHttpClient();
    const translator = new SearchTranslator(client as never);

    const indexer = new ScrapingIndexer({
      id: 1,
      name: 'Parity Indexer',
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings: { apiToken: 'token-xyz' },
      definition: buildDefinition(),
      httpClient: client as never,
    });

    await translator.searchAll(indexer, {
      q: 'dune',
      categories: [3000],
    });

    const secondUrl = new URL(client.calls[1]!.url);
    expect(secondUrl.pathname).toBe('/search-alt');
    expect(secondUrl.searchParams.get('page')).toBe('2');
    expect(secondUrl.searchParams.get('q')).toBeNull();
    expect(secondUrl.searchParams.get('cat')).toBeNull();
    expect(secondUrl.searchParams.get('sort')).toBeNull();
    expect(secondUrl.searchParams.get('order')).toBeNull();
  });
});
