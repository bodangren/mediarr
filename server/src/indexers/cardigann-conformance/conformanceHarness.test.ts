import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  formatConformanceSummary,
  runConformanceHarness,
  type ConformanceCase,
} from './harness';
import { loadConformanceFixtures } from './fixtureLoader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Cardigann conformance harness', () => {
  it('reports pass/fail totals by feature area', async () => {
    const cases: ConformanceCase[] = [
      {
        id: 'case-template-pass',
        definitionId: '1337x',
        featureArea: 'templating',
        execute: async () => ({ status: 'pass' }),
      },
      {
        id: 'case-template-fail',
        definitionId: '1337x',
        featureArea: 'templating',
        execute: async () => ({ status: 'fail', reason: 'unsupported if node' }),
      },
      {
        id: 'case-filter-pass',
        definitionId: 'yts',
        featureArea: 'filters',
        execute: async () => ({ status: 'pass' }),
      },
    ];

    const report = await runConformanceHarness(cases);

    expect(report.byFeatureArea.templating).toEqual({
      total: 2,
      passed: 1,
      failed: 1,
    });
    expect(report.byFeatureArea.filters).toEqual({
      total: 1,
      passed: 1,
      failed: 0,
    });
  });

  it('reports pass/fail totals by definition id', async () => {
    const cases: ConformanceCase[] = [
      {
        id: 'case-a-pass',
        definitionId: 'torrentdownloads',
        featureArea: 'response',
        execute: async () => ({ status: 'pass' }),
      },
      {
        id: 'case-a-fail',
        definitionId: 'torrentdownloads',
        featureArea: 'filters',
        execute: async () => ({ status: 'fail', reason: 'missing re_replace' }),
      },
      {
        id: 'case-b-pass',
        definitionId: 'eztv',
        featureArea: 'headers',
        execute: async () => ({ status: 'pass' }),
      },
    ];

    const report = await runConformanceHarness(cases);

    expect(report.byDefinitionId.torrentdownloads).toEqual({
      total: 2,
      passed: 1,
      failed: 1,
    });
    expect(report.byDefinitionId.eztv).toEqual({
      total: 1,
      passed: 1,
      failed: 0,
    });
  });

  it('loads fixture snippets and expected normalized outputs', async () => {
    const fixtureDirectory = path.join(__dirname, 'fixtures');
    const fixtures = await loadConformanceFixtures(fixtureDirectory);
    const fixture = fixtures.find(item => item.id === 'sample-1337x-html');

    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixture).toBeDefined();
    expect(fixture?.definitionSnippet.id).toBe('sample-1337x');
    expect(fixture?.expectedNormalizedOutputs[0]?.title).toBe('Ubuntu 24.04 LTS');
  });

  it('formats summary output suitable for CI logs', async () => {
    const cases: ConformanceCase[] = [
      {
        id: 'case-ok',
        definitionId: '1337x',
        featureArea: 'templating',
        execute: async () => ({ status: 'pass' }),
      },
      {
        id: 'case-fail',
        definitionId: '1337x',
        featureArea: 'filters',
        execute: async () => ({ status: 'fail', reason: 'regexp unsupported' }),
      },
    ];

    const report = await runConformanceHarness(cases);
    const output = formatConformanceSummary(report);

    expect(output).toContain('CARDIGANN_CONFORMANCE_SUMMARY total=2 passed=1 failed=1');
    expect(output).toContain('FEATURE area=templating total=1 passed=1 failed=0');
    expect(output).toContain('DEFINITION id=1337x total=2 passed=1 failed=1');
    expect(output).toContain('FAIL case=case-fail definition=1337x area=filters reason="regexp unsupported"');
  });
});
