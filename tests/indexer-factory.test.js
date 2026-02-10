import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { IndexerFactory } from '../server/src/indexers/IndexerFactory';
import { TorznabIndexer, ScrapingIndexer } from '../server/src/indexers/BaseIndexer';
import { DefinitionLoader } from '../server/src/indexers/DefinitionLoader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('IndexerFactory', () => {
  let factory;

  beforeEach(async () => {
    const loader = new DefinitionLoader();
    const definitions = await loader.loadFromDirectory(fixturesDir);
    factory = new IndexerFactory(definitions);
  });

  it('should create a TorznabIndexer from a database record with Torznab implementation', () => {
    const dbRecord = {
      id: 1,
      name: 'My Torznab Indexer',
      implementation: 'Torznab',
      configContract: 'TorznabSettings',
      settings: JSON.stringify({ apiKey: 'abc123', url: 'https://torznab.example.com' }),
      protocol: 'torrent',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
      added: new Date(),
    };

    const indexer = factory.fromDatabaseRecord(dbRecord);
    expect(indexer).toBeInstanceOf(TorznabIndexer);
    expect(indexer.name).toBe('My Torznab Indexer');
    expect(indexer.settings.apiKey).toBe('abc123');
  });

  it('should create a ScrapingIndexer from a database record with Cardigann implementation', () => {
    const dbRecord = {
      id: 2,
      name: 'Example Public Torrents',
      implementation: 'Cardigann',
      configContract: 'CardigannSettings',
      settings: JSON.stringify({ definitionId: 'example-public' }),
      protocol: 'torrent',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
      added: new Date(),
    };

    const indexer = factory.fromDatabaseRecord(dbRecord);
    expect(indexer).toBeInstanceOf(ScrapingIndexer);
    expect(indexer.definition.id).toBe('example-public');
  });

  it('should throw for Cardigann indexer with unknown definition ID', () => {
    const dbRecord = {
      id: 3,
      name: 'Unknown Scraper',
      implementation: 'Cardigann',
      configContract: 'CardigannSettings',
      settings: JSON.stringify({ definitionId: 'nonexistent' }),
      protocol: 'torrent',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
      added: new Date(),
    };

    expect(() => factory.fromDatabaseRecord(dbRecord)).toThrow(/definition/i);
  });

  it('should throw for unsupported implementation type', () => {
    const dbRecord = {
      id: 4,
      name: 'Unknown Type',
      implementation: 'UnknownType',
      configContract: 'UnknownSettings',
      settings: '{}',
      protocol: 'torrent',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
      added: new Date(),
    };

    expect(() => factory.fromDatabaseRecord(dbRecord)).toThrow(/unsupported/i);
  });

  it('should create a ScrapingIndexer directly from a definition file', () => {
    const indexer = factory.fromDefinition('example-private', {
      username: 'testuser',
      password: 'testpass',
    });

    expect(indexer).toBeInstanceOf(ScrapingIndexer);
    expect(indexer.name).toBe('Example Private Tracker');
    expect(indexer.settings.username).toBe('testuser');
    expect(indexer.definition.type).toBe('private');
  });

  it('should list available definition IDs', () => {
    const ids = factory.availableDefinitions;
    expect(ids).toContain('example-public');
    expect(ids).toContain('example-private');
  });
});
