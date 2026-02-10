import { XMLParser } from 'fast-xml-parser';
import type { IndexerResult } from './IndexerResult';

/**
 * Parses Torznab/Newznab RSS XML responses into standardized IndexerResult objects.
 */
export class TorznabParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) => name === 'item' || name === 'torznab:attr',
    });
  }

  parse(xml: string): IndexerResult[] {
    const parsed = this.xmlParser.parse(xml);

    const channel = parsed?.rss?.channel;
    if (!channel) {
      throw new Error('Invalid Torznab XML: missing rss/channel');
    }

    const items = channel.item;
    if (!items) {
      return [];
    }

    return items.map((item: any) => this.parseItem(item));
  }

  private parseItem(item: any): IndexerResult {
    const attrs = this.extractTorznabAttrs(item['torznab:attr']);

    const sizeRaw = attrs.get('size') ?? item.size;
    const size = sizeRaw !== undefined ? BigInt(sizeRaw) : undefined;

    const seedersRaw = attrs.get('seeders');
    const peersRaw = attrs.get('peers');

    return {
      title: item.title,
      guid: String(item.guid ?? ''),
      downloadUrl: item.link ? String(item.link) : undefined,
      infoUrl: item.comments ? String(item.comments) : undefined,
      magnetUrl: attrs.get('magneturl'),
      publishDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      size,
      seeders: seedersRaw !== undefined ? Number(seedersRaw) : undefined,
      leechers: peersRaw !== undefined ? Number(peersRaw) : undefined,
      categories: this.extractCategories(attrs),
      protocol: 'torrent',
      indexerFlags: attrs.get('downloadvolumefactor') === '0' ? 'freeleech' : undefined,
    };
  }

  private extractTorznabAttrs(attrs: any[]): Map<string, string> {
    const map = new Map<string, string>();
    if (!attrs) return map;

    for (const attr of attrs) {
      const name = attr['@_name'];
      const value = attr['@_value'];
      if (name && value !== undefined) {
        map.set(name, String(value));
      }
    }
    return map;
  }

  private extractCategories(attrs: Map<string, string>): number[] {
    const categories: number[] = [];
    // In Torznab, there can be multiple category attributes
    // fast-xml-parser groups them into the array we already have
    const catValue = attrs.get('category');
    if (catValue) {
      categories.push(Number(catValue));
    }
    return categories;
  }
}
