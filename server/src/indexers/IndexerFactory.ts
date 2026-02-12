import type { Indexer } from '@prisma/client';
import type { CardigannDefinition } from './DefinitionLoader';
import { TorznabIndexer, ScrapingIndexer, type BaseIndexer } from './BaseIndexer';
import type { HttpClient } from './HttpClient';

/**
 * Factory that creates typed indexer instances from database records or definition files.
 */
export class IndexerFactory {
  private definitions: Map<string, CardigannDefinition>;
  private httpClient: HttpClient;

  constructor(definitions: CardigannDefinition[], httpClient: HttpClient) {
    this.definitions = new Map(definitions.map(d => [d.id, d]));
    this.httpClient = httpClient;
  }

  /**
   * List all loaded definition IDs.
   */
  get availableDefinitions(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Create an indexer instance from a Prisma database record.
   */
  fromDatabaseRecord(record: Indexer): BaseIndexer {
    const settings = typeof record.settings === 'string'
      ? JSON.parse(record.settings)
      : record.settings;

    const baseConfig = {
      id: record.id,
      name: record.name,
      implementation: record.implementation,
      protocol: record.protocol,
      enabled: record.enabled,
      priority: record.priority,
      supportsRss: record.supportsRss,
      supportsSearch: record.supportsSearch,
      settings,
      httpClient: this.httpClient,
    };

    switch (record.implementation) {
      case 'Torznab':
        return new TorznabIndexer(baseConfig);

      case 'Cardigann': {
        const definitionId = settings.definitionId as string;
        const definition = this.definitions.get(definitionId);
        if (!definition) {
          throw new Error(`Definition not found for ID: ${definitionId}`);
        }
        return new ScrapingIndexer({ ...baseConfig, definition });
      }

      default:
        throw new Error(`Unsupported indexer implementation: ${record.implementation}`);
    }
  }

  /**
   * Create a ScrapingIndexer directly from a loaded definition.
   */
  fromDefinition(definitionId: string, settings: Record<string, any> = {}): ScrapingIndexer {
    const definition = this.definitions.get(definitionId);
    if (!definition) {
      throw new Error(`Definition not found for ID: ${definitionId}`);
    }

    return new ScrapingIndexer({
      id: 0,
      name: definition.name,
      implementation: 'Cardigann',
      protocol: 'torrent',
      enabled: true,
      priority: 25,
      supportsRss: true,
      supportsSearch: true,
      settings,
      definition,
      httpClient: this.httpClient,
    });
  }
}
