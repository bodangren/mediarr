import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { HttpClient, HttpResponse } from '../../server/src/indexers/HttpClient';
import { TorznabIndexer, ScrapingIndexer } from '../../server/src/indexers/BaseIndexer';
import { DefinitionLoader } from '../../server/src/indexers/DefinitionLoader';

class MockHttpClient extends HttpClient {
  private mockResponses: Map<string, string> = new Map();

  constructor() { super(); }

  setMockResponse(urlSubstring: string, body: string) {
    this.mockResponses.set(urlSubstring, body);
  }

  async get(url: string): Promise<HttpResponse> {
    for (const [key, body] of this.mockResponses.entries()) {
      if (url.includes(key)) {
        return { status: 200, ok: true, body, headers: { 'content-type': 'text/html' } };
      }
    }
    throw new Error(`Unexpected request to ${url}`);
  }
}

const TORZNAB_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
  <channel>
    <title>Torznab Indexer</title>
    <item>
      <title>Linux ISO 2026</title>
      <guid>12345</guid>
      <link>http://example.com/download/12345.torrent</link>
      <pubDate>Thu, 12 Feb 2026 12:00:00 +0000</pubDate>
      <size>1073741824</size>
      <enclosure url="http://example.com/download/12345.torrent" length="1073741824" type="application/x-bittorrent" />
      <torznab:attr name="seeders" value="50"/>
      <torznab:attr name="peers" value="10"/>
    </item>
  </channel>
</rss>`;

const HTML_RESPONSE = `
<html>
<body>
  <table class="table-list">
    <tr>
      <td class="name">
        <a href="/view/ignored">Icon</a>
        <a href="/torrent/98765/Ubuntu-24-04-LTS/">Ubuntu 24.04 LTS</a>
      </td>
      <td class="size">2.5 GB</td>
      <td class="date">Feb 12th 2026</td>
      <td class="seeds">100</td>
      <td class="leeches">5</td>
    </tr>
  </table>
</body>
</html>
`;

describe('Indexer Search (Integration)', () => {
  it('TorznabIndexer should fetch and parse results', async () => {
    const client = new MockHttpClient();
    client.setMockResponse('t=search', TORZNAB_XML);

    const indexer = new TorznabIndexer({
      id: 1,
      name: 'Test Torznab',
      implementation: 'Torznab',
      protocol: 'torrent',
      enabled: true,
      priority: 1,
      supportsRss: true,
      supportsSearch: true,
      settings: { url: 'http://torznab.local', apiKey: 'abc' },
      httpClient: client
    });

    const results = await indexer.search({ q: 'linux' });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Linux ISO 2026');
    expect(results[0].seeders).toBe(50);
    expect(results[0].size).toBeGreaterThan(0);
  });

  it('ScrapingIndexer should fetch and parse results using definition', async () => {
    // Load definition
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const fixturesDir = path.resolve(__dirname, '../fixtures/definitions');
    const loader = new DefinitionLoader();
    const definitions = await loader.loadFromDirectory(fixturesDir);
    const def = definitions.find(d => d.site === 'example1337x')!;

    const client = new MockHttpClient();
    // The fixture uses path /search/{{ .Keywords }}/1/
    client.setMockResponse('/search/ubuntu/1/', HTML_RESPONSE);

    const indexer = new ScrapingIndexer({
      id: 2,
      name: 'Test Scraping',
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 1,
      supportsRss: true,
      supportsSearch: true,
      settings: { baseUrl: 'https://example.1337x.to/' },
      definition: def,
      httpClient: client
    });

    const results = await indexer.search({ q: 'ubuntu' });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Ubuntu 24.04 LTS');
    expect(results[0].seeders).toBe(100);
    // Size parsing depends on logic, expecting basic parse
    expect(results[0].size).toBeGreaterThan(0); 
  });
});
