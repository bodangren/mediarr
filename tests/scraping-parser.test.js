import { describe, it, expect } from 'vitest';
import { ScrapingParser } from '../server/src/indexers/ScrapingParser';

const SAMPLE_HTML = `<html><body>
<table class="results">
  <tbody>
    <tr>
      <td class="cat-2040"><a href="/cat/movies">Movies</a></td>
      <td><a href="/details/1" title="Movie.Title.2024.1080p">Movie.Title.2024.1080p</a></td>
      <td><a href="/download/1.torrent" class="dl">DL</a></td>
      <td>2.1 GB</td>
      <td>150</td>
      <td>30</td>
      <td>2025-02-10</td>
    </tr>
    <tr>
      <td class="cat-5040"><a href="/cat/tv">TV</a></td>
      <td><a href="/details/2" title="TV.Show.S05E10.720p">TV.Show.S05E10.720p</a></td>
      <td><a href="/download/2.torrent" class="dl">DL</a></td>
      <td>700 MB</td>
      <td>85</td>
      <td>12</td>
      <td>2025-02-09</td>
    </tr>
  </tbody>
</table>
</body></html>`;

const SEARCH_FIELDS = {
  title: {
    selector: 'td:nth-child(2) a',
    attribute: 'title',
  },
  details: {
    selector: 'td:nth-child(2) a',
    attribute: 'href',
  },
  download: {
    selector: 'td:nth-child(3) a',
    attribute: 'href',
  },
  size: {
    selector: 'td:nth-child(4)',
  },
  seeders: {
    selector: 'td:nth-child(5)',
  },
  leechers: {
    selector: 'td:nth-child(6)',
  },
  publishdate: {
    selector: 'td:nth-child(7)',
  },
  category: {
    selector: 'td:nth-child(1)',
    attribute: 'class',
    filters: [
      { name: 'regex', args: ['cat-(\\d+)'] },
    ],
  },
};

const ROW_SELECTOR = 'table.results tbody tr';

describe('ScrapingParser', () => {
  const parser = new ScrapingParser();

  it('should parse rows from HTML using selector', () => {
    const results = parser.parse(SAMPLE_HTML, ROW_SELECTOR, SEARCH_FIELDS, 'https://example.com');
    expect(results).toHaveLength(2);
  });

  it('should extract title from attribute', () => {
    const results = parser.parse(SAMPLE_HTML, ROW_SELECTOR, SEARCH_FIELDS, 'https://example.com');
    expect(results[0].title).toBe('Movie.Title.2024.1080p');
    expect(results[1].title).toBe('TV.Show.S05E10.720p');
  });

  it('should extract download URL and resolve relative paths', () => {
    const results = parser.parse(SAMPLE_HTML, ROW_SELECTOR, SEARCH_FIELDS, 'https://example.com');
    expect(results[0].downloadUrl).toBe('https://example.com/download/1.torrent');
  });

  it('should extract seeders and leechers as numbers', () => {
    const results = parser.parse(SAMPLE_HTML, ROW_SELECTOR, SEARCH_FIELDS, 'https://example.com');
    expect(results[0].seeders).toBe(150);
    expect(results[0].leechers).toBe(30);
  });

  it('should apply regex filter to extract category', () => {
    const results = parser.parse(SAMPLE_HTML, ROW_SELECTOR, SEARCH_FIELDS, 'https://example.com');
    expect(results[0].categories).toContain(2040);
    expect(results[1].categories).toContain(5040);
  });

  it('should extract text content when no attribute specified', () => {
    const results = parser.parse(SAMPLE_HTML, ROW_SELECTOR, SEARCH_FIELDS, 'https://example.com');
    // Size is text content
    expect(results[0].size).toBeDefined();
  });

  it('should handle empty HTML gracefully', () => {
    const results = parser.parse('<html><body></body></html>', ROW_SELECTOR, SEARCH_FIELDS, 'https://example.com');
    expect(results).toHaveLength(0);
  });

  it('should handle static text fields', () => {
    const fieldsWithText = {
      ...SEARCH_FIELDS,
      minimumratio: { text: '1.0' },
    };
    const results = parser.parse(SAMPLE_HTML, ROW_SELECTOR, fieldsWithText, 'https://example.com');
    expect(results).toHaveLength(2);
  });
});
