import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DefinitionLoader } from '../DefinitionLoader';
import { IndexerFactory } from '../IndexerFactory';
import { HttpClient } from '../HttpClient';
import { buildDefinitionFeatureInventory } from './definitionFeatureInventory';
import { formatConformanceSummary, runConformanceHarness, type ConformanceCase } from './harness';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const definitionsDirectory = path.resolve(__dirname, '../../../definitions');
const finalArtifactPath = path.resolve(
  __dirname,
  '../../../../conductor/archive/cardigann_runtime_parity_20260223/artifacts/final-phase5-compatibility-matrix.json',
);

const presetDefinitionIds = [
  '1337x',
  'eztv',
  'yts',
  'thepiratebay',
  'nyaasi',
  'limetorrents',
  'torrentdownloads',
  'torrentgalaxyclone',
  'rutor',
];

function toRequestFeatures(item: ReturnType<typeof buildDefinitionFeatureInventory>[number]): string[] {
  const values: string[] = [];
  if (item.requestFeatures.hasSearchInputs) values.push('search.inputs');
  if (item.requestFeatures.hasPathInputs) values.push('paths.inputs');
  if (item.requestFeatures.hasHeaders) values.push('search.headers');
  if (item.requestFeatures.hasJsonResponse) values.push('paths.response.json');
  if (item.requestFeatures.hasPathInheritance) values.push('paths.inheritinputs');
  return values;
}

describe('Cardigann final conformance gate', () => {
  it('captures final compatibility matrix and harness summary for preset definitions', async () => {
    const loader = new DefinitionLoader();
    const definitions = await loader.loadFromDirectory(definitionsDirectory);
    const inventory = buildDefinitionFeatureInventory(definitions);
    const factory = new IndexerFactory(definitions, new HttpClient());

    const compatibility = presetDefinitionIds.map((definitionId) => factory.getCompatibilityReport(definitionId));

    const supportedRequestFeatures = new Set([
      'search.inputs',
      'paths.inputs',
      'search.headers',
      'paths.response.json',
      'paths.inheritinputs',
    ]);

    const cases: ConformanceCase[] = [];
    for (const item of inventory.filter(entry => presetDefinitionIds.includes(entry.definitionId))) {
      const report = compatibility.find(entry => entry.definitionId === item.definitionId);
      cases.push({
        id: `compatibility-${item.definitionId}`,
        definitionId: item.definitionId,
        featureArea: 'compatibility',
        execute: async () => {
          if (!report) {
            return { status: 'fail', reason: 'missing compatibility report' };
          }

          if (report.status === 'incompatible') {
            const reason = report.issues.map(issue => `${issue.feature}:${issue.remediation}`).join('; ');
            return { status: 'fail', reason: reason || 'incompatible with no diagnostics' };
          }

          return { status: 'pass' };
        },
      });

      for (const requestFeature of toRequestFeatures(item)) {
        cases.push({
          id: `request-${item.definitionId}-${requestFeature}`,
          definitionId: item.definitionId,
          featureArea: 'request',
          execute: async () => {
            return supportedRequestFeatures.has(requestFeature)
              ? { status: 'pass' }
              : { status: 'fail', reason: `unsupported request feature ${requestFeature}` };
          },
        });
      }
    }

    const harnessReport = await runConformanceHarness(cases);
    const harnessSummary = formatConformanceSummary(harnessReport);

    const artifact = {
      generatedAt: new Date().toISOString(),
      presetDefinitionIds,
      totals: {
        definitions: presetDefinitionIds.length,
        compatible: compatibility.filter(entry => entry.status === 'compatible').length,
        degraded: compatibility.filter(entry => entry.status === 'degraded').length,
        incompatible: compatibility.filter(entry => entry.status === 'incompatible').length,
      },
      compatibility,
      inventory: inventory
        .filter(entry => presetDefinitionIds.includes(entry.definitionId))
        .map(entry => ({
          definitionId: entry.definitionId,
          requestFeatures: toRequestFeatures(entry),
          filterNames: entry.filterNames,
          templateConstructs: entry.templateConstructs,
        })),
      harnessReport,
      harnessSummary,
    };

    await fs.mkdir(path.dirname(finalArtifactPath), { recursive: true });
    await fs.writeFile(finalArtifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

    expect(compatibility).toHaveLength(presetDefinitionIds.length);
    expect(artifact.harnessReport.total).toBeGreaterThan(0);

    for (const entry of compatibility) {
      if (entry.status === 'incompatible') {
        expect(entry.issues.length).toBeGreaterThan(0);
      }
    }
  });
});
