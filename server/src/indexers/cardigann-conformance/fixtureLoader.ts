import fs from 'node:fs/promises';
import path from 'node:path';
import type { CardigannDefinition } from '../DefinitionLoader';

export interface ConformanceFixtureExpectedOutput {
  title?: string;
  guid?: string;
  downloadUrl?: string;
  seeders?: number;
  leechers?: number;
  categories?: number[];
}

export interface ConformanceFixture {
  id: string;
  definitionId: string;
  featureArea: string;
  definitionSnippet: CardigannDefinition;
  expectedNormalizedOutputs: ConformanceFixtureExpectedOutput[];
}

export async function loadConformanceFixtures(fixtureDirectory: string): Promise<ConformanceFixture[]> {
  const entries = await fs.readdir(fixtureDirectory, { withFileTypes: true });
  const fixtures: ConformanceFixture[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(fixtureDirectory, entry.name);
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as ConformanceFixture;
    fixtures.push(parsed);
  }

  return fixtures.sort((a, b) => a.id.localeCompare(b.id));
}
