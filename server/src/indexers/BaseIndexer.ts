import type { CardigannDefinition, CategoryMapping, SearchPathBlock } from './DefinitionLoader';
import type { HttpClient } from './HttpClient';
import type { IndexerResult } from './IndexerResult';
import { TorznabParser } from './TorznabParser';
import { ScrapingParser } from './ScrapingParser';
import { buildCardigannRequest } from './CardigannRequestBuilder';
import type { DefinitionCompatibilityReport } from './CardigannCompatibility';
import { renderCardigannTemplate } from './TemplateRuntime';

export interface IndexerConfig {
  id: number;
  name: string;
  implementation: string;
  protocol: string;
  enabled: boolean;
  priority: number;
  supportsRss: boolean;
  supportsSearch: boolean;
  settings: Record<string, any>;
  httpClient: HttpClient;
}

export interface SearchQuery {
  q?: string;
  categories?: Array<number | string>;
  season?: number;
  ep?: number;
  imdbid?: string;
  tmdbid?: number | string;
  tvdbid?: number;
  /**
   * Optional media type discriminator. When present, the Torznab URL
   * builder uses `t=movie` for movies and `t=tvsearch` for TV series
   * instead of the generic `t=search` fallback. FR-4.1.
   */
  mediaType?: 'movie' | 'tv';
}

/**
 * Abstract base class for all indexer types.
 * Cannot be instantiated directly.
 */
export class BaseIndexer {
  readonly id: number;
  readonly name: string;
  readonly implementation: string;
  readonly protocol: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly supportsRss: boolean;
  readonly supportsSearch: boolean;
  readonly settings: Record<string, any>;
  protected readonly httpClient: HttpClient;

  constructor(config: IndexerConfig) {
    if (new.target === BaseIndexer) {
      throw new Error('BaseIndexer cannot be instantiated directly. Use TorznabIndexer or ScrapingIndexer.');
    }
    this.id = config.id;
    this.name = config.name;
    this.implementation = config.implementation;
    this.protocol = config.protocol;
    this.enabled = config.enabled;
    this.priority = config.priority;
    this.supportsRss = config.supportsRss;
    this.supportsSearch = config.supportsSearch;
    this.settings = config.settings;
    this.httpClient = config.httpClient;
  }

  get indexerType(): string {
    throw new Error('Subclasses must implement indexerType');
  }

  async search(query: SearchQuery): Promise<IndexerResult[]> {
    throw new Error('Method not implemented.');
  }
}

/**
 * Indexer that communicates via the Torznab API protocol (XML/RSS).
 */
export class TorznabIndexer extends BaseIndexer {
  constructor(config: IndexerConfig) {
    super(config);
  }

  get indexerType(): string {
    return 'torznab';
  }

  async search(query: SearchQuery): Promise<IndexerResult[]> {
    const url = this.buildSearchUrl(query);
    const response = await this.httpClient.get(url);
    if (!response.ok) {
      throw new Error(`Torznab request failed: ${response.status} ${response.body}`);
    }
    const parser = new TorznabParser();
    return parser.parse(response.body);
  }

  private get apiUrl(): string {
    const url = this.settings.url;
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new Error(
        `Torznab indexer "${this.name}" requires a URL. Remediation: set the Torznab base URL in the indexer settings.`,
      );
    }
    const normalizedUrl = url.trim();
    return normalizedUrl.endsWith('/') ? normalizedUrl.slice(0, -1) : normalizedUrl;
  }

  private get apiKey(): string {
    return this.settings.apiKey as string;
  }

  buildSearchUrl(query: SearchQuery): string {
    const params = new URLSearchParams();
    const torznabType = this.resolveTorznabType(query);
    params.set('t', torznabType);
    params.set('apikey', this.apiKey);

    if (query.q && torznabType === 'search') {
      // Free-text queries only make sense in the generic t=search path;
      // Torznab caps/movie/tvsearch endpoints usually require IDs.
      params.set('q', query.q);
    }
    if (query.categories && query.categories.length > 0) {
      params.set('cat', query.categories.join(','));
    }
    if (query.season !== undefined) {
      params.set('season', String(query.season));
    }
    if (query.ep !== undefined) {
      params.set('ep', String(query.ep));
    }
    if (query.imdbid) {
      params.set('imdbid', query.imdbid.replace(/^tt/, ''));
    }
    if (query.tmdbid !== undefined) {
      params.set('tmdbid', String(query.tmdbid));
    }
    if (query.tvdbid !== undefined) {
      params.set('tvdbid', String(query.tvdbid));
    }

    return `${this.apiUrl}/api?${params.toString()}`;
  }

  /**
   * Resolve the Torznab `t=` parameter from the query's mediaType and
   * identifier fields. Precedence: explicit mediaType wins; otherwise
   * tmdbId with no tvdbId → movie; tvdbId → tvsearch; otherwise generic
   * search. (FR-4.1)
   */
  private resolveTorznabType(query: SearchQuery): 'movie' | 'tvsearch' | 'search' {
    if (query.mediaType === 'movie') return 'movie';
    if (query.mediaType === 'tv') return 'tvsearch';
    if (query.tmdbid !== undefined && query.tvdbid === undefined) return 'movie';
    if (query.tvdbid !== undefined) return 'tvsearch';
    return 'search';
  }

  buildRssUrl(): string {
    const params = new URLSearchParams();
    params.set('t', 'search');
    params.set('apikey', this.apiKey);
    return `${this.apiUrl}/api?${params.toString()}`;
  }

  buildTestUrl(): string {
    const params = new URLSearchParams();
    params.set('t', 'caps');
    params.set('apikey', this.apiKey);
    return `${this.apiUrl}/api?${params.toString()}`;
  }
}

export interface ScrapingIndexerConfig extends IndexerConfig {
  definition: CardigannDefinition;
  compatibility?: DefinitionCompatibilityReport;
}

/**
 * Indexer that uses Cardigann-style YAML definitions for web scraping.
 */
export class ScrapingIndexer extends BaseIndexer {
  readonly definition: CardigannDefinition;
  readonly compatibility?: DefinitionCompatibilityReport | undefined;

  constructor(config: ScrapingIndexerConfig) {
    super(config);
    this.definition = config.definition;
    this.compatibility = config.compatibility;
  }

  get indexerType(): string {
    return 'scraping';
  }

  get baseUrl(): string {
    return this.definition.links[0]!;
  }

  get searchPaths(): SearchPathBlock[] {
    return this.definition.search.paths;
  }

  get categoryMappings(): CategoryMapping[] {
    return this.definition.caps?.categorymappings ?? [];
  }

  async search(query: SearchQuery): Promise<IndexerResult[]> {
    const firstPath = this.searchPaths[0];
    if (!firstPath) {
      throw new Error(`No search paths defined for indexer: ${this.name}`);
    }

    // Map standard categories to indexer-specific ones
    let mappedQuery = query;
    if (query.categories && query.categories.length > 0) {
      const mappedCategories: Array<number | string> = [];
      const standardToIndexerMap: Record<number, string> = {
        2000: 'Movies',
        5000: 'TV',
        3000: 'Audio',
        4000: 'PC',
        6000: 'Console',
        7000: 'Books',
        8000: 'XXX',
      };

      for (const rawCategoryId of query.categories) {
        const stdId = typeof rawCategoryId === 'number' ? rawCategoryId : Number(rawCategoryId);
        // Find the broad category name (e.g., 2040 -> 2000 -> 'Movies')
        const parentId = Math.floor(stdId / 1000) * 1000;
        const broadName = standardToIndexerMap[parentId];

        if (broadName) {
          // Find all local IDs that map to this broad category name
          for (const mapping of this.categoryMappings) {
            if (mapping.cat.startsWith(broadName)) {
              const numericMappingId = Number(mapping.id);
              mappedCategories.push(Number.isFinite(numericMappingId) ? numericMappingId : mapping.id);
            }
          }
        } else {
          // If no mapping, pass through the original ID just in case
          mappedCategories.push(rawCategoryId);
        }
      }

      if (mappedCategories.length > 0) {
        const dedupedCategories: Array<number | string> = [];
        const seen = new Set<string>();
        for (const categoryId of mappedCategories) {
          const key = String(categoryId);
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          dedupedCategories.push(categoryId);
        }

        mappedQuery = {
          ...query,
          categories: dedupedCategories,
        };
      }
    }

    const request = buildCardigannRequest(this.definition, firstPath, mappedQuery, this.settings);
    const response = await this.httpClient.get(request.url, { headers: request.headers });
    if (!response.ok) {
      throw new Error(`Scraping request failed: ${response.status}`);
    }

    const parser = new ScrapingParser();
    const renderedRowSelector = renderCardigannTemplate(this.definition.search.rows.selector, {
      query: mappedQuery,
      config: this.settings,
      categories: mappedQuery.categories ?? [],
    }, { strict: false });

    return parser.parse(response.body, renderedRowSelector, this.definition.search.fields, this.baseUrl, {
      responseType: request.responseType,
      rows: this.definition.search.rows,
      categoryMappings: this.categoryMappings,
      query: mappedQuery,
    });
  }
}
