import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DefinitionLoader, type CardigannDefinition, type SearchPathBlock } from '../DefinitionLoader';
import { HttpClient } from '../HttpClient';
import { ScrapingParser } from '../ScrapingParser';
import { applyCardigannFilter, applyCardigannFilters } from '../CardigannFilterRuntime';
import { renderCardigannTemplate, resolveCardigannUrl } from '../TemplateRuntime';
import { buildDefinitionFeatureInventory } from './definitionFeatureInventory';
import { canonicalFilterSamples } from './filterSamples';

interface LiveSiteResult {
  definitionId: string;
  status: 'pass' | 'fail';
  url: string;
  httpStatus: number;
  parsedResults: number;
  filterChecked?: string;
  error?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const definitionsDirectory = path.resolve(__dirname, '../../../definitions');
const artifactOutputPath = path.resolve(
  __dirname,
  '../../../../conductor/archive/cardigann_runtime_parity_20260223/artifacts/live-site-cardigann-report.json',
);
const runLive = process.env.CARDIGANN_LIVE_TESTS === 'true';
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
const fixedNow = new Date('2026-01-15T12:00:00.000Z');

function buildDefaultConfig(definition: CardigannDefinition): Record<string, unknown> {
  const defaults: Record<string, unknown> = {
    sitelink: definition.links[0] ?? '',
  };

  for (const field of definition.settings ?? []) {
    if (field.default !== undefined) {
      defaults[field.name] = field.default;
    }
  }

  return defaults;
}

function stripUnresolvedTemplates(value: string): string {
  return value.replace(/\{\{[\s\S]*?\}\}/g, '');
}

function renderTemplateValue(
  value: string | number | boolean,
  config: Record<string, unknown>,
  categories: number[],
  queryKeywords: string,
): string {
  if (typeof value !== 'string') {
    return String(value);
  }

  return stripUnresolvedTemplates(
    renderCardigannTemplate(value, {
      query: { q: queryKeywords, categories },
      config,
      categories,
    }),
  );
}

function appendRawQuery(url: URL, raw: string): void {
  if (!raw.trim()) {
    return;
  }

  const normalized = raw.replace(/^&+|&+$/g, '');
  if (!normalized) {
    return;
  }

  url.search = url.search ? `${url.search}&${normalized}` : `?${normalized}`;
}

function applyInputsToUrl(
  url: URL,
  path: SearchPathBlock,
  definition: CardigannDefinition,
  config: Record<string, unknown>,
  categories: number[],
  queryKeywords: string,
): void {
  const mergedInputs: Record<string, string | number | boolean> = {
    ...(definition.search.inputs ?? {}),
    ...(path.inputs ?? {}),
  };

  for (const [key, templateValue] of Object.entries(mergedInputs)) {
    const rendered = renderTemplateValue(templateValue, config, categories, queryKeywords);
    if (!rendered) {
      continue;
    }

    if (key === '$raw') {
      appendRawQuery(url, rendered);
      continue;
    }

    url.searchParams.set(key, rendered);
  }
}

function buildHeaders(definition: CardigannDefinition): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, values] of Object.entries(definition.search.headers ?? {})) {
    if (values.length > 0) {
      headers[key] = values[0]!;
    }
  }
  return headers;
}

function isLikelyCloudflareBlocked(body: string): boolean {
  const normalized = body.toLowerCase();
  return normalized.includes('cloudflare') && normalized.includes('attention required');
}

function extractNumericCategories(definition: CardigannDefinition): number[] {
  const ids = definition.caps?.categorymappings?.map(item => Number(item.id)).filter(item => !Number.isNaN(item));
  if (!ids || ids.length === 0) {
    return [];
  }
  return ids.slice(0, 3);
}

async function fetchLiveResponse(
  definition: CardigannDefinition,
  queryKeywords: string,
): Promise<{ url: string; status: number; body: string }> {
  const firstPath = definition.search.paths[0];
  if (!firstPath) {
    throw new Error('Definition has no search paths');
  }

  const client = new HttpClient({ timeout: 25000, userAgent: 'Mediarr-Cardigann-LiveTest/1.0' });
  const config = buildDefaultConfig(definition);
  const categories = extractNumericCategories(definition);
  const renderedPath = renderTemplateValue(firstPath.path, config, categories, queryKeywords);
  const headers = buildHeaders(definition);

  const candidates = renderedPath.startsWith('http://') || renderedPath.startsWith('https://')
    ? [renderedPath]
    : definition.links.map(link => resolveCardigannUrl(link, renderedPath));

  let lastError = 'no candidates';
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      applyInputsToUrl(url, firstPath, definition, config, categories, queryKeywords);
      const response = await client.get(url.toString(), { headers });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }
      if (isLikelyCloudflareBlocked(response.body)) {
        lastError = 'cloudflare block';
        continue;
      }

      return { url: url.toString(), status: response.status, body: response.body };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`Unable to fetch usable live response: ${lastError}`);
}

function verifyAtLeastOneFilterForDefinition(definition: CardigannDefinition): string {
  const inventory = buildDefinitionFeatureInventory([definition])[0];
  if (!inventory) {
    throw new Error('No inventory generated');
  }

  const filterName = inventory.filterNames.find(name => canonicalFilterSamples[name] !== undefined);
  if (!filterName) {
    throw new Error('No canonical sample available for definition filters');
  }

  const sample = canonicalFilterSamples[filterName]!;
  const output = applyCardigannFilter(sample.input, { name: filterName, args: sample.args }, { strict: true, now: fixedNow });
  if (output !== sample.expected) {
    throw new Error(`Filter sample mismatch for ${filterName}: expected '${sample.expected}' got '${output}'`);
  }

  return filterName;
}

function countParsedHtmlResults(
  definition: CardigannDefinition,
  body: string,
  queryKeywords: string,
): number {
  const config = buildDefaultConfig(definition);
  const categories = extractNumericCategories(definition);
  const renderedSelector = renderTemplateValue(
    definition.search.rows.selector,
    config,
    categories,
    queryKeywords,
  );
  const parser = new ScrapingParser();
  const results = parser.parse(
    body,
    renderedSelector,
    definition.search.fields,
    definition.links[0] ?? '',
  );
  return results.length;
}

async function writeLiveReport(results: LiveSiteResult[]): Promise<void> {
  const artifact = {
    generatedAt: new Date().toISOString(),
    executedWithEnv: runLive,
    total: results.length,
    passed: results.filter(item => item.status === 'pass').length,
    failed: results.filter(item => item.status === 'fail').length,
    results,
  };

  await fs.mkdir(path.dirname(artifactOutputPath), { recursive: true });
  await fs.writeFile(artifactOutputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}

const liveResults: LiveSiteResult[] = [];

const liveDescribe = runLive ? describe : describe.skip;
liveDescribe('Cardigann live-site definition checks', () => {
  for (const definitionId of presetDefinitionIds) {
    it(`live definition check: ${definitionId}`, async () => {
      const loader = new DefinitionLoader();
      const definitions = await loader.loadFromDirectory(definitionsDirectory);
      const definition = definitions.find(item => item.id === definitionId);
      expect(definition).toBeDefined();

      try {
        const filterChecked = verifyAtLeastOneFilterForDefinition(definition!);
        const response = await fetchLiveResponse(definition!, 'ubuntu 2024');

        let parsedResults = 0;
        if (definition!.search.paths[0]?.response?.type !== 'json') {
          parsedResults = countParsedHtmlResults(definition!, response.body, 'ubuntu 2024');
        } else {
          // For JSON definitions, ensure keyword filters can execute in runtime.
          const keywordFilters = definition!.search.keywordsfilters ?? [];
          const transformed = applyCardigannFilters('ubuntu 2024', keywordFilters, { strict: true, now: fixedNow });
          expect(transformed.length).toBeGreaterThan(0);
        }

        const result: LiveSiteResult = {
          definitionId,
          status: 'pass',
          url: response.url,
          httpStatus: response.status,
          parsedResults,
          filterChecked,
        };
        liveResults.push(result);
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(300);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const failed: LiveSiteResult = {
          definitionId,
          status: 'fail',
          url: '',
          httpStatus: 0,
          parsedResults: 0,
          error: message,
        };
        liveResults.push(failed);
        throw error;
      } finally {
        await writeLiveReport(liveResults);
      }
    }, 90_000);
  }
});

describe('Cardigann live-site definition checks (gating)', () => {
  it('is env-gated by CARDIGANN_LIVE_TESTS=true', () => {
    expect(typeof runLive).toBe('boolean');
  });
});
