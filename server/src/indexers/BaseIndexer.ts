import type { CardigannDefinition, CategoryMapping, SearchPathBlock } from './DefinitionLoader';

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
  }

  get indexerType(): string {
    throw new Error('Subclasses must implement indexerType');
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
}

/**
 * Indexer that uses Cardigann-style YAML definitions for web scraping.
 */
export class ScrapingIndexer extends BaseIndexer {
  readonly definition: CardigannDefinition;

  constructor(config: ScrapingIndexerConfig) {
    super(config);
    this.definition = config.definition;
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
}
