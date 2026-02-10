import { parseHTML } from 'linkedom';
import type { SelectorBlock, FilterBlock } from './DefinitionLoader';
import type { IndexerResult } from './IndexerResult';

type FieldDefinitions = Record<string, SelectorBlock>;

/**
 * Parses HTML search results using CSS selectors from Cardigann YAML definitions.
 */
export class ScrapingParser {
  parse(html: string, rowSelector: string, fields: FieldDefinitions, baseUrl: string): IndexerResult[] {
    const { document } = parseHTML(html);
    const rows = document.querySelectorAll(rowSelector);
    const results: IndexerResult[] = [];

    for (const row of rows) {
      const raw = this.extractFields(row, fields);
      const result = this.toIndexerResult(raw, baseUrl);
      if (result.title) {
        results.push(result);
      }
    }

    return results;
  }

  private extractFields(row: any, fields: FieldDefinitions): Record<string, string> {
    const extracted: Record<string, string> = {};

    for (const [name, def] of Object.entries(fields)) {
      extracted[name] = this.extractField(row, def);
    }

    return extracted;
  }

  private extractField(row: any, def: SelectorBlock): string {
    // Static text field
    if (def.text !== undefined) {
      return def.text;
    }

    if (!def.selector) {
      return def.default ?? '';
    }

    const el = row.querySelector(def.selector);
    if (!el) {
      return def.default ?? '';
    }

    let value: string;
    if (def.attribute) {
      value = el.getAttribute(def.attribute) ?? '';
    } else {
      value = el.textContent?.trim() ?? '';
    }

    // Apply filters
    if (def.filters) {
      value = this.applyFilters(value, def.filters);
    }

    return value;
  }

  private applyFilters(value: string, filters: FilterBlock[]): string {
    for (const filter of filters) {
      value = this.applyFilter(value, filter);
    }
    return value;
  }

  private applyFilter(value: string, filter: FilterBlock): string {
    switch (filter.name) {
      case 'trim':
        return value.trim();

      case 'lowercase':
        return value.toLowerCase();

      case 'uppercase':
        return value.toUpperCase();

      case 'replace': {
        const [find, replace] = (filter.args ?? []) as [string, string];
        return value.replace(new RegExp(this.escapeRegex(find), 'g'), replace ?? '');
      }

      case 'regex': {
        const pattern = (filter.args ?? [])[0] as string;
        if (!pattern) return value;
        const match = value.match(new RegExp(pattern));
        return match?.[1] ?? match?.[0] ?? value;
      }

      case 'prepend': {
        const prefix = (filter.args ?? [])[0] as string;
        return prefix + value;
      }

      case 'append': {
        const suffix = (filter.args ?? [])[0] as string;
        return value + suffix;
      }

      case 'split': {
        const [delimiter, indexStr] = (filter.args ?? []) as [string, string?];
        const parts = value.split(delimiter);
        const idx = indexStr !== undefined ? Number(indexStr) : 0;
        return parts[idx] ?? value;
      }

      case 'urldecode':
        return decodeURIComponent(value);

      case 'urlencode':
        return encodeURIComponent(value);

      case 'dateparse':
        // Return as-is; date parsing is handled in toIndexerResult
        return value;

      case 'humanize':
        // Return as-is; size parsing is handled in toIndexerResult
        return value;

      default:
        return value;
    }
  }

  private toIndexerResult(raw: Record<string, string>, baseUrl: string): IndexerResult {
    const resolveUrl = (url: string): string => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('magnet:')) {
        return url;
      }
      return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const parseSize = (sizeStr: string): bigint | undefined => {
      if (!sizeStr) return undefined;
      const match = sizeStr.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
      if (!match) return undefined;
      const num = parseFloat(match[1]!);
      const unit = (match[2] ?? 'B').toUpperCase();
      const multipliers: Record<string, number> = {
        B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4,
      };
      return BigInt(Math.round(num * (multipliers[unit] ?? 1)));
    };

    const categories: number[] = [];
    if (raw.category) {
      const catNum = Number(raw.category);
      if (!isNaN(catNum)) categories.push(catNum);
    }

    return {
      title: raw.title ?? '',
      guid: raw.details ? resolveUrl(raw.details) : raw.title ?? '',
      downloadUrl: raw.download ? resolveUrl(raw.download) : undefined,
      infoUrl: raw.details ? resolveUrl(raw.details) : undefined,
      magnetUrl: raw.infohash ? `magnet:?xt=urn:btih:${raw.infohash}` : (raw.magneturl || undefined),
      publishDate: raw.publishdate ? new Date(raw.publishdate) : new Date(),
      size: parseSize(raw.size),
      seeders: raw.seeders ? Number(raw.seeders) : undefined,
      leechers: raw.leechers ? Number(raw.leechers) : undefined,
      categories,
      protocol: 'torrent',
    };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
