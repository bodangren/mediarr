import fs from 'node:fs/promises';
import path from 'node:path';
import type { CardigannDefinition } from '../DefinitionLoader';

export interface DefinitionRequestFeatures {
  hasSearchInputs: boolean;
  hasPathInputs: boolean;
  hasHeaders: boolean;
  hasJsonResponse: boolean;
  hasPathInheritance: boolean;
}

export interface DefinitionFeatureInventory {
  definitionId: string;
  templateConstructs: string[];
  filterNames: string[];
  requestFeatures: DefinitionRequestFeatures;
}

export interface TrackedFeatureCoverage {
  templateConstructs: Set<string>;
  filterNames: Set<string>;
  requestFeatures: Set<string>;
}

export interface UntrackedFeatureReport {
  templateConstructs: string[];
  filterNames: string[];
  requestFeatures: string[];
}

const TEMPLATE_BLOCK_PATTERN = /\{\{([\s\S]*?)\}\}/g;
const TEMPLATE_REFERENCE_PATTERN = /\.[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*/g;

function addTemplateConstructsFromString(value: string, constructs: Set<string>): void {
  for (const match of value.matchAll(TEMPLATE_BLOCK_PATTERN)) {
    const expression = match[1]?.trim() ?? '';
    if (!expression) {
      continue;
    }

    if (/\bif\b/.test(expression)) {
      constructs.add('if');
    }
    if (/\belse\b/.test(expression)) {
      constructs.add('else');
    }
    if (/\brange\b/.test(expression)) {
      constructs.add('range');
    }

    for (const referenceMatch of expression.matchAll(TEMPLATE_REFERENCE_PATTERN)) {
      if (referenceMatch[0]) {
        constructs.add(referenceMatch[0]);
      }
    }
  }
}

function collectTemplateConstructs(value: unknown, constructs: Set<string>): void {
  if (typeof value === 'string') {
    addTemplateConstructsFromString(value, constructs);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTemplateConstructs(item, constructs);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      collectTemplateConstructs(nestedValue, constructs);
    }
  }
}

function collectFilterNames(value: unknown, filterNames: Set<string>, keyName?: string): void {
  if (Array.isArray(value)) {
    if (keyName === 'filters' || keyName === 'keywordsfilters') {
      for (const item of value) {
        if (item && typeof item === 'object' && 'name' in item) {
          const filterName = (item as { name?: unknown }).name;
          if (typeof filterName === 'string' && filterName) {
            filterNames.add(filterName);
          }
        }
      }
    }

    for (const item of value) {
      collectFilterNames(item, filterNames, keyName);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      collectFilterNames(nestedValue, filterNames, nestedKey);
    }
  }
}

function getRequestFeatures(definition: CardigannDefinition): DefinitionRequestFeatures {
  const searchInputs = definition.search.inputs;
  const hasSearchInputs = Boolean(searchInputs && Object.keys(searchInputs).length > 0);
  const hasPathInputs = definition.search.paths.some(pathBlock =>
    Boolean(pathBlock.inputs && Object.keys(pathBlock.inputs).length > 0),
  );
  const hasHeaders = Boolean(definition.search.headers && Object.keys(definition.search.headers).length > 0);
  const hasJsonResponse = definition.search.paths.some(pathBlock => pathBlock.response?.type === 'json');
  const hasPathInheritance = definition.search.paths.some(pathBlock => pathBlock.inheritinputs === true);

  return {
    hasSearchInputs,
    hasPathInputs,
    hasHeaders,
    hasJsonResponse,
    hasPathInheritance,
  };
}

function toRequestFeatureSet(requestFeatures: DefinitionRequestFeatures): Set<string> {
  const values = new Set<string>();
  if (requestFeatures.hasSearchInputs) {
    values.add('search.inputs');
  }
  if (requestFeatures.hasPathInputs) {
    values.add('paths.inputs');
  }
  if (requestFeatures.hasHeaders) {
    values.add('search.headers');
  }
  if (requestFeatures.hasJsonResponse) {
    values.add('paths.response.json');
  }
  if (requestFeatures.hasPathInheritance) {
    values.add('paths.inheritinputs');
  }
  return values;
}

export function buildDefinitionFeatureInventory(
  definitions: CardigannDefinition[],
): DefinitionFeatureInventory[] {
  return definitions
    .map(definition => {
      const templateConstructs = new Set<string>();
      const filterNames = new Set<string>();

      collectTemplateConstructs(definition, templateConstructs);
      collectFilterNames(definition, filterNames);

      return {
        definitionId: definition.id,
        templateConstructs: Array.from(templateConstructs).sort(),
        filterNames: Array.from(filterNames).sort(),
        requestFeatures: getRequestFeatures(definition),
      };
    })
    .sort((a, b) => a.definitionId.localeCompare(b.definitionId));
}

export function assertTrackedFeatureCoverage(
  inventory: DefinitionFeatureInventory[],
  trackedCoverage: TrackedFeatureCoverage,
): UntrackedFeatureReport {
  const discoveredTemplateConstructs = new Set<string>();
  const discoveredFilters = new Set<string>();
  const discoveredRequestFeatures = new Set<string>();

  for (const item of inventory) {
    for (const templateConstruct of item.templateConstructs) {
      discoveredTemplateConstructs.add(templateConstruct);
    }
    for (const filterName of item.filterNames) {
      discoveredFilters.add(filterName);
    }
    for (const requestFeature of toRequestFeatureSet(item.requestFeatures)) {
      discoveredRequestFeatures.add(requestFeature);
    }
  }

  const untrackedTemplateConstructs = Array.from(discoveredTemplateConstructs)
    .filter(feature => !trackedCoverage.templateConstructs.has(feature))
    .sort();
  const untrackedFilters = Array.from(discoveredFilters)
    .filter(feature => !trackedCoverage.filterNames.has(feature))
    .sort();
  const untrackedRequestFeatures = Array.from(discoveredRequestFeatures)
    .filter(feature => !trackedCoverage.requestFeatures.has(feature))
    .sort();

  const report: UntrackedFeatureReport = {
    templateConstructs: untrackedTemplateConstructs,
    filterNames: untrackedFilters,
    requestFeatures: untrackedRequestFeatures,
  };

  if (
    untrackedTemplateConstructs.length > 0 ||
    untrackedFilters.length > 0 ||
    untrackedRequestFeatures.length > 0
  ) {
    throw new Error(
      `Untracked definition features detected: templates=[${untrackedTemplateConstructs.join(', ')}], filters=[${untrackedFilters.join(', ')}], request=[${untrackedRequestFeatures.join(', ')}]`,
    );
  }

  return report;
}

export async function generateCompatibilityMatrixArtifact(
  inventory: DefinitionFeatureInventory[],
  outputPath: string,
): Promise<void> {
  const allTemplateConstructs = new Set<string>();
  const allFilterNames = new Set<string>();
  const allRequestFeatures = new Set<string>();

  for (const item of inventory) {
    for (const templateConstruct of item.templateConstructs) {
      allTemplateConstructs.add(templateConstruct);
    }
    for (const filterName of item.filterNames) {
      allFilterNames.add(filterName);
    }
    for (const requestFeature of toRequestFeatureSet(item.requestFeatures)) {
      allRequestFeatures.add(requestFeature);
    }
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    definitionCount: inventory.length,
    aggregate: {
      templateConstructs: Array.from(allTemplateConstructs).sort(),
      filterNames: Array.from(allFilterNames).sort(),
      requestFeatures: Array.from(allRequestFeatures).sort(),
    },
    definitions: inventory.map(item => ({
      definitionId: item.definitionId,
      templateConstructs: item.templateConstructs,
      filterNames: item.filterNames,
      requestFeatures: Array.from(toRequestFeatureSet(item.requestFeatures)).sort(),
    })),
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}
