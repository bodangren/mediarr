import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DefinitionLoader } from '../DefinitionLoader';
import { applyCardigannFilter } from '../CardigannFilterRuntime';
import { buildDefinitionFeatureInventory } from './definitionFeatureInventory';
import { canonicalFilterSamples } from './filterSamples';

const fixedNow = new Date('2026-01-15T12:00:00.000Z');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const definitionsDirectory = path.resolve(__dirname, '../../../definitions');

describe('Cardigann per-site filter coverage', async () => {
  const loader = new DefinitionLoader();
  const definitions = await loader.loadFromDirectory(definitionsDirectory);
  const inventory = buildDefinitionFeatureInventory(definitions);

  for (const item of inventory) {
    it(`executes canonical checks for filters used by ${item.definitionId}`, () => {
      for (const filterName of item.filterNames) {
        const sample = canonicalFilterSamples[filterName];
        expect(sample).toBeDefined();

        const output = applyCardigannFilter(
          sample.input,
          { name: filterName, args: sample.args },
          { strict: true, now: fixedNow },
        );
        expect(output).toBe(sample.expected);
      }
    });
  }
});
