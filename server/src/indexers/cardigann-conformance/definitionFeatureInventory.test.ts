import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DefinitionLoader, type CardigannDefinition } from '../DefinitionLoader';
import {
  assertTrackedFeatureCoverage,
  buildDefinitionFeatureInventory,
  generateCompatibilityMatrixArtifact,
} from './definitionFeatureInventory';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const definitionsDirectory = path.resolve(__dirname, '../../../definitions');

async function loadImportedDefinitions(): Promise<CardigannDefinition[]> {
  const loader = new DefinitionLoader();
  return loader.loadFromDirectory(definitionsDirectory);
}

describe('Cardigann definition feature inventory', () => {
  it('detects template constructs used by imported definitions', async () => {
    const definitions = await loadImportedDefinitions();
    const inventory = buildDefinitionFeatureInventory(definitions);
    const inventory1337x = inventory.find(item => item.definitionId === '1337x');

    expect(inventory1337x).toBeDefined();
    expect(inventory1337x?.templateConstructs).toContain('if');
    expect(inventory1337x?.templateConstructs).toContain('.Config.disablesort');
    expect(inventory1337x?.templateConstructs).toContain('.Keywords');
  });

  it('detects all filter names used by each imported definition', async () => {
    const definitions = await loadImportedDefinitions();
    const inventory = buildDefinitionFeatureInventory(definitions);
    const inventory1337x = inventory.find(item => item.definitionId === '1337x');
    const inventoryTorrentGalaxy = inventory.find(item => item.definitionId === 'torrentgalaxyclone');

    expect(inventory1337x).toBeDefined();
    expect(inventory1337x?.filterNames).toContain('re_replace');
    expect(inventory1337x?.filterNames).toContain('replace');

    expect(inventoryTorrentGalaxy).toBeDefined();
    expect(inventoryTorrentGalaxy?.filterNames).toContain('timeago');
  });

  it('detects path/input/header/response features used by each definition', async () => {
    const definitions = await loadImportedDefinitions();
    const inventory = buildDefinitionFeatureInventory(definitions);

    const inventoryNyaa = inventory.find(item => item.definitionId === 'nyaasi');
    const inventoryEztv = inventory.find(item => item.definitionId === 'eztv');
    const inventoryYts = inventory.find(item => item.definitionId === 'yts');

    expect(inventoryNyaa?.requestFeatures.hasSearchInputs).toBe(true);
    expect(inventoryNyaa?.requestFeatures.hasPathInputs).toBe(true);
    expect(inventoryEztv?.requestFeatures.hasHeaders).toBe(true);
    expect(inventoryYts?.requestFeatures.hasJsonResponse).toBe(true);
  });

  it('fails if imported definitions use untracked features', async () => {
    const definitions = await loadImportedDefinitions();
    const inventory = buildDefinitionFeatureInventory(definitions);

    expect(() =>
      assertTrackedFeatureCoverage(inventory, {
        templateConstructs: new Set<string>(),
        filterNames: new Set<string>(),
        requestFeatures: new Set<string>(),
      }),
    ).toThrow(/untracked/i);
  });

  it('generates a baseline compatibility matrix artifact for imported definitions', async () => {
    const definitions = await loadImportedDefinitions();
    const inventory = buildDefinitionFeatureInventory(definitions);

    const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'cardigann-matrix-'));
    const outputPath = path.join(outputDirectory, 'compatibility-matrix.json');

    await generateCompatibilityMatrixArtifact(inventory, outputPath);
    const output = await fs.readFile(outputPath, 'utf8');
    const parsed = JSON.parse(output) as {
      definitionCount: number;
      definitions: Array<{ definitionId: string }>;
    };

    expect(parsed.definitionCount).toBe(definitions.length);
    expect(parsed.definitions.map(item => item.definitionId)).toContain('1337x');
    expect(parsed.definitions.map(item => item.definitionId)).toContain('yts');
  });
});
