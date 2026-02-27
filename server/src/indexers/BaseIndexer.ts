import type { CardigannDefinition, CategoryMapping, SearchPathBlock } from './DefinitionLoader';
import type { HttpClient } from './HttpClient';
import type { IndexerResult } from './IndexerResult';
import { TorznabParser } from './TorznabParser';
import { ScrapingParser } from './ScrapingParser';
import { buildCardigannRequest } from './CardigannRequestBuilder';
import type { DefinitionCompatibilityReport } from './CardigannCompatibility';

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
  categories?: number[];
  season?: number;
  ep?: number;
  imdbid?: string;
  tmdbid?: string;
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
    const url = this.settings.url as string;
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  private get apiKey(): string {
    return this.settings.apiKey as string;
  }

  buildSearchUrl(query: SearchQuery): string {
    const params = new URLSearchParams();
    params.set('t', 'search');
    params.set('apikey', this.apiKey);

    if (query.q) {
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
      params.set('imdbid', query.imdbid);
    }

    return `${this.apiUrl}/api?${params.toString()}`;
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
  readonly compatibility?: DefinitionCompatibilityReport;

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

    const request = buildCardigannRequest(this.definition, firstPath, query, this.settings);
    const response = await this.httpClient.get(request.url, { headers: request.headers });
    if (!response.ok) {
      throw new Error(`Scraping request failed: ${response.status}`);
    }

    const parser = new ScrapingParser();
    return parser.parse(response.body, this.definition.search.rows.selector, this.definition.search.fields, this.baseUrl, {
      responseType: request.responseType,
      rows: this.definition.search.rows,
      categoryMappings: this.categoryMappings,
      query: request.query,
    });
  }
}
