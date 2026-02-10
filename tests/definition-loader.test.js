import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { DefinitionLoader } from '../server/src/indexers/DefinitionLoader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('DefinitionLoader', () => {
  const loader = new DefinitionLoader();

  describe('loadFromFile', () => {
    it('should parse a public indexer YAML definition', async () => {
      const def = await loader.loadFromFile(path.join(fixturesDir, 'example-public-indexer.yml'));

      expect(def.id).toBe('example-public');
      expect(def.name).toBe('Example Public Torrents');
      expect(def.type).toBe('public');
      expect(def.language).toBe('en');
      expect(def.encoding).toBe('UTF-8');
      expect(def.links).toContain('https://example-torrents.com');
    });

    it('should parse a private indexer YAML definition with login and settings', async () => {
      const def = await loader.loadFromFile(path.join(fixturesDir, 'example-private-indexer.yml'));

      expect(def.id).toBe('example-private');
      expect(def.type).toBe('private');
      expect(def.settings).toHaveLength(3);
      expect(def.settings[0].name).toBe('username');
      expect(def.settings[1].type).toBe('password');
      expect(def.login).toBeDefined();
      expect(def.login.path).toBe('/login.php');
      expect(def.login.method).toBe('form');
    });

    it('should parse capabilities with category mappings', async () => {
      const def = await loader.loadFromFile(path.join(fixturesDir, 'example-public-indexer.yml'));

      expect(def.caps).toBeDefined();
      expect(def.caps.categorymappings).toHaveLength(3);
      expect(def.caps.categorymappings[0].id).toBe('1');
      expect(def.caps.categorymappings[0].cat).toBe('Movies');
      expect(def.caps.modes).toBeDefined();
      expect(def.caps.modes['search']).toContain('q');
      expect(def.caps.modes['tv-search']).toContain('season');
    });

    it('should parse search configuration with fields and rows', async () => {
      const def = await loader.loadFromFile(path.join(fixturesDir, 'example-public-indexer.yml'));

      expect(def.search).toBeDefined();
      expect(def.search.paths).toHaveLength(1);
      expect(def.search.rows.selector).toBe('table.results tbody tr');
      expect(def.search.fields.title).toBeDefined();
      expect(def.search.fields.title.selector).toBe('td:nth-child(2) a');
      expect(def.search.fields.download.attribute).toBe('href');
    });

    it('should parse filters on fields', async () => {
      const def = await loader.loadFromFile(path.join(fixturesDir, 'example-public-indexer.yml'));

      const categoryField = def.search.fields.category;
      expect(categoryField.filters).toHaveLength(1);
      expect(categoryField.filters[0].name).toBe('regex');
      expect(categoryField.filters[0].args).toEqual(['cat-(\\d+)']);
    });

    it('should parse legacy links', async () => {
      const def = await loader.loadFromFile(path.join(fixturesDir, 'example-private-indexer.yml'));
      expect(def.legacylinks).toContain('https://old-private-tracker.com');
    });

    it('should throw on non-existent file', async () => {
      await expect(loader.loadFromFile('/nonexistent/file.yml')).rejects.toThrow();
    });
  });

  describe('loadFromDirectory', () => {
    it('should load all YAML definitions from a directory', async () => {
      const definitions = await loader.loadFromDirectory(fixturesDir);

      expect(definitions.length).toBe(2);
      const ids = definitions.map(d => d.id);
      expect(ids).toContain('example-public');
      expect(ids).toContain('example-private');
    });
  });

  describe('validate', () => {
    it('should accept a valid definition', async () => {
      const def = await loader.loadFromFile(path.join(fixturesDir, 'example-public-indexer.yml'));
      expect(() => loader.validate(def)).not.toThrow();
    });

    it('should reject a definition missing required fields', () => {
      const invalid = { name: 'No ID' };
      expect(() => loader.validate(invalid)).toThrow(/id/i);
    });

    it('should reject a definition with no links', () => {
      const invalid = { id: 'test', name: 'Test', type: 'public', links: [] };
      expect(() => loader.validate(invalid)).toThrow(/links/i);
    });
  });
});
