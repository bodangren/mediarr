import { describe, it, expect } from 'vitest';
import { TorznabParser } from '../server/src/indexers/TorznabParser';

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
  <channel>
    <title>Test Indexer</title>
    <item>
      <title>Movie.Title.2024.1080p.BluRay.x264</title>
      <guid>https://example.com/details/12345</guid>
      <link>https://example.com/download/12345.torrent</link>
      <pubDate>Mon, 10 Feb 2025 12:00:00 +0000</pubDate>
      <size>2147483648</size>
      <description>A great movie release</description>
      <torznab:attr name="category" value="2040"/>
      <torznab:attr name="seeders" value="150"/>
      <torznab:attr name="peers" value="30"/>
      <torznab:attr name="size" value="2147483648"/>
      <torznab:attr name="magneturl" value="magnet:?xt=urn:btih:abc123"/>
      <torznab:attr name="infohash" value="abc123"/>
    </item>
    <item>
      <title>TV.Show.S05E10.720p.WEB-DL</title>
      <guid>https://example.com/details/67890</guid>
      <link>https://example.com/download/67890.torrent</link>
      <pubDate>Sun, 09 Feb 2025 08:30:00 +0000</pubDate>
      <size>734003200</size>
      <torznab:attr name="category" value="5040"/>
      <torznab:attr name="seeders" value="85"/>
      <torznab:attr name="peers" value="12"/>
    </item>
  </channel>
</rss>`;

const EMPTY_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Indexer</title>
  </channel>
</rss>`;

describe('TorznabParser', () => {
  const parser = new TorznabParser();

  it('should parse multiple items from Torznab RSS XML', () => {
    const results = parser.parse(SAMPLE_RSS);
    expect(results).toHaveLength(2);
  });

  it('should extract title from item', () => {
    const results = parser.parse(SAMPLE_RSS);
    expect(results[0].title).toBe('Movie.Title.2024.1080p.BluRay.x264');
    expect(results[1].title).toBe('TV.Show.S05E10.720p.WEB-DL');
  });

  it('should extract guid', () => {
    const results = parser.parse(SAMPLE_RSS);
    expect(results[0].guid).toBe('https://example.com/details/12345');
  });

  it('should extract download URL from link element', () => {
    const results = parser.parse(SAMPLE_RSS);
    expect(results[0].downloadUrl).toBe('https://example.com/download/12345.torrent');
  });

  it('should extract publish date', () => {
    const results = parser.parse(SAMPLE_RSS);
    expect(results[0].publishDate).toBeInstanceOf(Date);
    expect(results[0].publishDate.getFullYear()).toBeGreaterThanOrEqual(2025);
  });

  it('should extract size', () => {
    const results = parser.parse(SAMPLE_RSS);
    expect(results[0].size).toBe(2147483648n);
  });

  it('should extract torznab attributes (seeders, category, magneturl)', () => {
    const results = parser.parse(SAMPLE_RSS);
    expect(results[0].seeders).toBe(150);
    expect(results[0].leechers).toBe(30);
    expect(results[0].categories).toContain(2040);
    expect(results[0].magnetUrl).toBe('magnet:?xt=urn:btih:abc123');
  });

  it('should handle missing optional fields gracefully', () => {
    const results = parser.parse(SAMPLE_RSS);
    // Second item has no magneturl
    expect(results[1].magnetUrl).toBeUndefined();
    expect(results[1].seeders).toBe(85);
  });

  it('should return empty array for empty RSS', () => {
    const results = parser.parse(EMPTY_RSS);
    expect(results).toHaveLength(0);
  });

  it('should throw on completely invalid XML', () => {
    expect(() => parser.parse('not xml at all {')).toThrow();
  });
});
