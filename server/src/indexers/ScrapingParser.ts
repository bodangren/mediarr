import { parseHTML } from 'linkedom';
import type { SelectorBlock, FilterBlock, CategoryMapping, RowsBlock } from './DefinitionLoader';
import type { IndexerResult } from './IndexerResult';
import { applyCardigannFilters } from './CardigannFilterRuntime';
import type { SearchQuery } from './BaseIndexer';

type FieldDefinitions = Record<string, SelectorBlock>;
interface ParserOptions {
  responseType?: string;
  rows?: RowsBlock;
  categoryMappings?: CategoryMapping[];
  query?: SearchQuery;
}

interface JsonRowContext {
  row: unknown;
  parent?: unknown;
  root: unknown;
}

/**
 * Parses HTML search results using CSS selectors from Cardigann YAML definitions.
 */
export class ScrapingParser {
  parse(
    body: string,
    rowSelector: string,
    fields: FieldDefinitions,
    baseUrl: string,
    options: ParserOptions = {},
  ): IndexerResult[] {
    if ((options.responseType ?? 'html').toLowerCase() === 'json') {
      return this.parseJson(body, rowSelector, fields, baseUrl, options);
    }

    return this.parseHtml(body, rowSelector, fields, baseUrl, options);
  }

  private parseHtml(
    html: string,
    rowSelector: string,
    fields: FieldDefinitions,
    baseUrl: string,
    options: ParserOptions,
  ): IndexerResult[] {
    const { document } = parseHTML(html);
    const rows = Array.from(document.querySelectorAll(rowSelector));
    const filteredRows = this.applyRowOptions(rows, options.rows, options.query);
    const results: IndexerResult[] = [];

    for (const row of filteredRows) {
      const raw = this.extractFields(row, fields);
      const result = this.toIndexerResult(raw, baseUrl, options.categoryMappings);
      if (result.title) {
        results.push(result);
      }
    }

    return results;
  }

  private parseJson(
    body: string,
    rowSelector: string,
    fields: FieldDefinitions,
    baseUrl: string,
    options: ParserOptions,
  ): IndexerResult[] {
    const root = JSON.parse(body) as unknown;
    const rows = this.selectJsonRows(root, rowSelector, options.rows);
    const filteredRows = this.applyJsonRowOptions(rows, options.rows, options.query);
    const results: IndexerResult[] = [];

    for (const context of filteredRows) {
      const raw = this.extractJsonFields(context, fields);
      const result = this.toIndexerResult(raw, baseUrl, options.categoryMappings);
      if (result.title) {
        results.push(result);
      }
    }

    return results;
  }

  private applyRowOptions(
    rows: unknown[],
    rowOptions?: RowsBlock,
    query?: SearchQuery,
  ): unknown[] {
    let nextRows = rows;

    const after = rowOptions?.after;
    if (typeof after === 'number' && after > 0) {
      nextRows = nextRows.slice(after);
    }

    if (rowOptions?.filters?.some(filter => filter.name === 'andmatch') && query?.q) {
      const tokens = query.q
        .toLowerCase()
        .split(/\s+/)
        .map(token => token.trim())
        .filter(Boolean);

      if (tokens.length > 0) {
        nextRows = nextRows.filter((row) => {
          const text = String((row as { textContent?: string }).textContent ?? '').toLowerCase();
          return tokens.every(token => text.includes(token));
        });
      }
    }

    return nextRows;
  }

  private applyJsonRowOptions(
    rows: JsonRowContext[],
    rowOptions?: RowsBlock,
    query?: SearchQuery,
  ): JsonRowContext[] {
    let nextRows = rows;

    const after = rowOptions?.after;
    if (typeof after === 'number' && after > 0) {
      nextRows = nextRows.slice(after);
    }

    if (rowOptions?.filters?.some(filter => filter.name === 'andmatch') && query?.q) {
      const tokens = query.q
        .toLowerCase()
        .split(/\s+/)
        .map(token => token.trim())
        .filter(Boolean);

      if (tokens.length > 0) {
        nextRows = nextRows.filter((entry) => {
          const serialized = JSON.stringify(entry.row).toLowerCase();
          return tokens.every(token => serialized.includes(token));
        });
      }
    }

    return nextRows;
  }

  private selectJsonRows(root: unknown, rowSelector: string, rowOptions?: RowsBlock): JsonRowContext[] {
    const selected = this.resolveJsonSelector(root, rowSelector);
    const initialRows = Array.isArray(selected) ? selected : (selected === undefined ? [] : [selected]);

    if (!rowOptions?.attribute) {
      return initialRows.map(row => ({ row, root }));
    }

    const rows: JsonRowContext[] = [];
    for (const parent of initialRows) {
      const nested = this.resolveJsonSelector(parent, rowOptions.attribute);

      if (Array.isArray(nested)) {
        for (const row of nested) {
          rows.push({ row, parent, root });
        }
        continue;
      }

      if (nested !== undefined && nested !== null) {
        rows.push({ row: nested, parent, root });
        continue;
      }

      if (!rowOptions.missingAttributeEqualsNoResults) {
        rows.push({ row: parent, root });
      }
    }

    return rows;
  }

  private extractJsonFields(context: JsonRowContext, fields: FieldDefinitions): Record<string, string> {
    const extracted: Record<string, string> = {};

    for (const [name, def] of Object.entries(fields)) {
      extracted[name] = this.extractJsonField(context, def);
    }

    return extracted;
  }

  private extractJsonField(context: JsonRowContext, def: SelectorBlock): string {
    if (def.text !== undefined) {
      return def.text;
    }

    if (!def.selector) {
      return def.default ?? '';
    }

    let selected: unknown;
    if (def.selector.startsWith('$')) {
      selected = this.resolveJsonSelector(context.root, def.selector);
    } else if (def.selector.startsWith('..')) {
      selected = this.resolveJsonSelector(context.parent, def.selector.slice(2));
    } else {
      selected = this.resolveJsonSelector(context.row, def.selector);
    }

    let value = '';
    if (selected === undefined || selected === null) {
      value = def.default ?? '';
    } else if (typeof selected === 'string') {
      value = selected;
    } else if (typeof selected === 'number' || typeof selected === 'boolean') {
      value = String(selected);
    } else {
      value = JSON.stringify(selected);
    }

    if (def.remove) {
      value = value.replaceAll(def.remove, '');
    }

    if (def.filters) {
      value = this.applyFilters(value, def.filters);
    }

    if (def.case) {
      value = def.case[value] ?? def.case['*'] ?? value;
    }

    return value;
  }

  private resolveJsonSelector(source: unknown, selector: string): unknown {
    if (source === undefined || source === null || !selector) {
      return undefined;
    }

    const normalized = selector
      .trim()
      .replace(/^\$\.?/, '')
      .replace(/\[(\d+)\]/g, '.$1')
      .replace(/^\.+/, '');

    if (!normalized) {
      return source;
    }

    const segments = normalized.split('.').filter(Boolean);
    let current: unknown = source;

    for (const segment of segments) {
      if (current === undefined || current === null) {
        return undefined;
      }

      if (Array.isArray(current)) {
        const index = Number(segment);
        if (Number.isNaN(index)) {
          return undefined;
        }
        current = current[index];
        continue;
      }

      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[segment];
        continue;
      }

      return undefined;
    }

    return current;
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
    return applyCardigannFilters(value, filters);
  }

  private toIndexerResult(
    raw: Record<string, string>,
    baseUrl: string,
    categoryMappings: CategoryMapping[] = [],
  ): IndexerResult {
    const resolveUrl = (url: string): string => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('magnet:')) {
        return url;
      }
      return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const parseSize = (sizeStr: string): bigint | undefined => {
      if (!sizeStr) return undefined;
      if (/^\d+$/.test(sizeStr.trim())) {
        return BigInt(sizeStr.trim());
      }
      const match = sizeStr.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
      if (!match) return undefined;
      const num = parseFloat(match[1]!);
      const unit = (match[2] ?? 'B').toUpperCase();
      const multipliers: Record<string, number> = {
        B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4,
      };
      return BigInt(Math.round(num * (multipliers[unit] ?? 1)));
    };

    const parseDate = (value: string): Date => {
      if (/^\d+$/.test(value)) {
        const timestamp = Number(value);
        if (Number.isFinite(timestamp)) {
          if (value.length <= 10) {
            return new Date(timestamp * 1000);
          }
          return new Date(timestamp);
        }
      }

      return new Date(value);
    };

    const normalizeCategories = (rawCategory: string): number[] => {
      if (!rawCategory) {
        return [];
      }

      const directNumeric = Number(rawCategory);
      if (!Number.isNaN(directNumeric)) {
        return [directNumeric];
      }

      const normalized = rawCategory.toLowerCase().trim();
      const mapped = categoryMappings
        .filter(mapping => mapping.cat.toLowerCase() === normalized)
        .map(mapping => Number(mapping.id))
        .filter(value => !Number.isNaN(value));

      if (mapped.length > 0) {
        return mapped;
      }

      return [];
    };

    const categories = normalizeCategories(raw.category ?? '');
    const publishDateValue = raw.publishdate || raw.date || raw.pubDate || raw.added;
    const guid = raw.guid || raw.details || raw.title || '';
    const downloadUrl = raw.download || raw.downloadurl;
    const infoUrl = raw.details || raw.infourl;
    const seeders = raw.seeders ? Number(raw.seeders) : undefined;
    const leechers = raw.leechers ? Number(raw.leechers) : undefined;

    return {
      title: raw.title ?? '',
      guid: guid ? resolveUrl(guid) : raw.title ?? '',
      downloadUrl: downloadUrl ? resolveUrl(downloadUrl) : undefined,
      infoUrl: infoUrl ? resolveUrl(infoUrl) : undefined,
      magnetUrl: raw.infohash ? `magnet:?xt=urn:btih:${raw.infohash}` : (raw.magneturl || undefined),
      publishDate: publishDateValue ? parseDate(publishDateValue) : new Date(),
      size: parseSize(raw.size ?? raw.sizebytes ?? ''),
      seeders: seeders !== undefined && !Number.isNaN(seeders) ? seeders : undefined,
      leechers: leechers !== undefined && !Number.isNaN(leechers) ? leechers : undefined,
      categories,
      protocol: 'torrent',
    };
  }
}
