import { describe, expect, it } from 'vitest';
import { ScrapingParser } from '../ScrapingParser';

describe('Cardigann response parsing parity', () => {
  it('applies HTML row options (after + andmatch) before extracting rows', () => {
    const parser = new ScrapingParser();

    const html = `
      <table>
        <tr class="item"><td class="title">Fedora 40 ISO</td><td class="cat">2000</td></tr>
        <tr class="item"><td class="title">Ubuntu 24.04 LTS</td><td class="cat">2000</td></tr>
        <tr class="item"><td class="title">Arch Linux ISO</td><td class="cat">2000</td></tr>
      </table>
    `;

    const results = parser.parse(
      html,
      'tr.item',
      {
        title: { selector: '.title' },
        category: { selector: '.cat' },
      },
      'https://indexer.example',
      {
        rows: {
          selector: 'tr.item',
          after: 1,
          filters: [{ name: 'andmatch' }],
        },
        query: { q: 'ubuntu 24' },
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe('Ubuntu 24.04 LTS');
  });

  it('extracts JSON rows using selector + attribute + parent references', () => {
    const parser = new ScrapingParser();

    const body = JSON.stringify({
      data: {
        movie_count: 1,
        movies: [
          {
            title_long: 'Dune (2021)',
            year: 2021,
            torrents: [
              {
                quality: '1080p',
                hash: 'ABCDEF1234567890ABCDEF1234567890ABCDEF12',
                url: 'https://yts.example/torrent/abcdef',
                size_bytes: 1073741824,
                date_uploaded_unix: 1700000000,
                seeds: 50,
                peers: 7,
              },
            ],
          },
        ],
      },
    });

    const results = parser.parse(
      body,
      'data.movies',
      {
        title: { selector: '..title_long' },
        category: {
          selector: 'quality',
          case: {
            '1080p': '44',
            '*': '45',
          },
        },
        infohash: { selector: 'hash' },
        download: { selector: 'url' },
        size: { selector: 'size_bytes' },
        date: { selector: 'date_uploaded_unix' },
        seeders: { selector: 'seeds' },
        leechers: { selector: 'peers' },
      },
      'https://indexer.example',
      {
        responseType: 'json',
        rows: {
          selector: 'data.movies',
          attribute: 'torrents',
          multiple: true,
          count: { selector: 'data.movie_count' },
        },
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe('Dune (2021)');
    expect(results[0]!.magnetUrl).toContain('ABCDEF1234567890ABCDEF1234567890ABCDEF12');
    expect(results[0]!.publishDate.toISOString()).toBe('2023-11-14T22:13:20.000Z');
    expect(results[0]!.categories).toEqual([44]);
  });

  it('normalizes category values using definition category mappings', () => {
    const parser = new ScrapingParser();

    const html = `
      <table>
        <tr class="item"><td class="title">Movie A</td><td class="cat">Movies/UHD</td></tr>
      </table>
    `;

    const results = parser.parse(
      html,
      'tr.item',
      {
        title: { selector: '.title' },
        category: { selector: '.cat' },
      },
      'https://indexer.example',
      {
        categoryMappings: [
          { id: '46', cat: 'Movies/UHD', desc: 'Movies/x264/2160p' },
        ],
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0]!.categories).toEqual([46]);
  });

  it('uses default values for selector-less fields and parses millisecond timestamps', () => {
    const parser = new ScrapingParser();

    const body = JSON.stringify({
      rows: [
        {
          id: 'guid-1',
          ts: 1700000000000,
        },
      ],
    });

    const results = parser.parse(
      body,
      'rows',
      {
        guid: { selector: 'id' },
        title: { default: 'Untitled' },
        date: { selector: 'ts' },
        category: { text: 'UnknownGroup' },
      },
      'https://indexer.example',
      {
        responseType: 'json',
        rows: { selector: 'rows' },
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe('Untitled');
    expect(results[0]!.publishDate.toISOString()).toBe('2023-11-14T22:13:20.000Z');
    expect(results[0]!.categories).toEqual([]);
  });
});
