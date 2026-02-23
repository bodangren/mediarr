import { describe, expect, it } from 'vitest';
import { ScrapingParser } from '../ScrapingParser';

describe('ScrapingParser filter parity', () => {
  it('supports regexp extraction behavior with capture groups', () => {
    const parser = new ScrapingParser();
    const html = `
      <table>
        <tbody>
          <tr>
            <td class="title"><a href="/Ubuntu-24-04-LTS-torrent-123.html">Row</a></td>
          </tr>
        </tbody>
      </table>
    `;

    const results = parser.parse(
      html,
      'tr',
      {
        title: {
          selector: 'td.title a',
          attribute: 'href',
          filters: [
            { name: 'regexp', args: ['/([^/]+?)-torrent-\\d+\\.html'] },
            { name: 're_replace', args: ['-', ' '] },
          ],
        },
      },
      'https://example.test',
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Ubuntu 24 04 LTS');
  });

  it('supports re_replace replacement semantics', () => {
    const parser = new ScrapingParser();
    const html = `
      <table>
        <tbody>
          <tr>
            <td class="title">Show S2024 WEB-DL</td>
          </tr>
        </tbody>
      </table>
    `;

    const results = parser.parse(
      html,
      'tr',
      {
        title: {
          selector: 'td.title',
          filters: [
            { name: 're_replace', args: ['\\bS(20\\d{2})\\b', '$1'] },
          ],
        },
      },
      'https://example.test',
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Show 2024 WEB-DL');
  });

  it('matches fixture-like filter behavior used by imported definitions', () => {
    const parser = new ScrapingParser();
    const html = `
      <table>
        <tbody>
          <tr>
            <td class="title"><a href="/The.Last.of.Us.S01E02-torrent-999.html">Row</a></td>
          </tr>
        </tbody>
      </table>
    `;

    const results = parser.parse(
      html,
      'tr',
      {
        title: {
          selector: 'td.title a',
          attribute: 'href',
          filters: [
            { name: 'regexp', args: ['/([^/]+?)-torrent-\\d+\\.html'] },
            { name: 're_replace', args: ['\\.', ' '] },
          ],
        },
      },
      'https://example.test',
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('The Last of Us S01E02');
  });
});
