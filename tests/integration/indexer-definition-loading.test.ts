import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { DefinitionLoader } from '../../server/src/indexers/DefinitionLoader';
import { IndexerFactory } from '../../server/src/indexers/IndexerFactory';
import { ScrapingIndexer } from '../../server/src/indexers/BaseIndexer';
import { HttpClient } from '../../server/src/indexers/HttpClient';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, '../fixtures/definitions');

describe('Indexer Definition Wiring (Integration)', () => {
  it('should load definitions from disk and allow factory to create indexers', async () => {
    // 1. Load definitions
    const loader = new DefinitionLoader();
    const definitions = await loader.loadFromDirectory(fixturesDir);

    expect(definitions.length).toBeGreaterThan(0);
    const exampleDef = definitions.find(d => d.site === 'example1337x');
    expect(exampleDef).toBeDefined();

    // 2. Initialize Factory
    const httpClient = new HttpClient();
    const factory = new IndexerFactory(definitions, httpClient);
    expect(factory.availableDefinitions).toContain('example1337x');

    // 3. Create Indexer from Definition
    const indexer = factory.fromDefinition('example1337x', {
      baseUrl: 'https://example.1337x.to/'
    });

    expect(indexer).toBeInstanceOf(ScrapingIndexer);
    expect(indexer.name).toBe('Example 1337x');
    // @ts-ignore - accessing protected/private property or just checking public prop if available
    // Check if definition is attached correctly
    expect((indexer as any).definition.site).toBe('example1337x');
  });

  it('should throw when creating indexer with unknown definition', () => {
    const factory = new IndexerFactory([], new HttpClient());
    expect(() => factory.fromDefinition('unknown-site')).toThrow(/Definition not found/);
  });
});
