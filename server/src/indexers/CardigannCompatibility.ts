import type { CardigannDefinition } from './DefinitionLoader';

export type CompatibilityIssueSeverity = 'hard' | 'soft';
export type CompatibilityStatus = 'compatible' | 'degraded' | 'incompatible';

export interface DefinitionCompatibilityIssue {
  severity: CompatibilityIssueSeverity;
  feature: string;
  message: string;
  remediation: string;
}

export interface DefinitionCompatibilityReport {
  definitionId: string;
  status: CompatibilityStatus;
  issues: DefinitionCompatibilityIssue[];
}

const supportedFilters = new Set([
  'trim',
  'lowercase',
  'tolower',
  'uppercase',
  'replace',
  'regex',
  'regexp',
  're_replace',
  'prepend',
  'append',
  'split',
  'remove',
  'case',
  'urldecode',
  'urlencode',
  'timeago',
  'fuzzytime',
  'dateparse',
  'humanize',
  'andmatch',
]);

function collectFilterNames(value: unknown, filterNames: Set<string>, keyName?: string): void {
  if (Array.isArray(value)) {
    if (keyName === 'filters' || keyName === 'keywordsfilters') {
      for (const item of value) {
        if (item && typeof item === 'object' && 'name' in item) {
          const filterName = (item as { name?: unknown }).name;
          if (typeof filterName === 'string') {
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

function collectTemplateExpressions(value: unknown, target: string[]): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
      const expression = match[1]?.trim();
      if (expression) {
        target.push(expression);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTemplateExpressions(item, target);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      collectTemplateExpressions(nestedValue, target);
    }
  }
}

function formatCompatibilityIssue(issue: DefinitionCompatibilityIssue): string {
  return `${issue.feature}: ${issue.message} (${issue.remediation})`;
}

export function formatCompatibilityFailure(report: DefinitionCompatibilityReport): string {
  const hardIssues = report.issues.filter(issue => issue.severity === 'hard');
  if (hardIssues.length === 0) {
    return `Definition '${report.definitionId}' is compatible`;
  }

  const details = hardIssues.slice(0, 3).map(formatCompatibilityIssue).join('; ');
  return `Definition '${report.definitionId}' is incompatible: ${details}`;
}

export function assessDefinitionCompatibility(definition: CardigannDefinition): DefinitionCompatibilityReport {
  const issues: DefinitionCompatibilityIssue[] = [];

  if (!definition.search.paths || definition.search.paths.length === 0) {
    issues.push({
      severity: 'hard',
      feature: 'search.paths',
      message: 'Definition has no search paths',
      remediation: 'Add at least one search path in the Cardigann definition.',
    });
  }

  for (const path of definition.search.paths ?? []) {
    const responseType = (path.response?.type ?? 'html').toLowerCase();
    if (responseType !== 'html' && responseType !== 'json') {
      issues.push({
        severity: 'hard',
        feature: 'search.paths.response.type',
        message: `Unsupported response type '${responseType}'`,
        remediation: 'Use supported response types: html or json.',
      });
    }
  }

  const filterNames = new Set<string>();
  collectFilterNames(definition, filterNames);
  for (const filterName of filterNames) {
    if (!supportedFilters.has(filterName)) {
      issues.push({
        severity: 'hard',
        feature: `filter:${filterName}`,
        message: `Unsupported Cardigann filter '${filterName}'`,
        remediation: 'Implement this filter or remove it from the definition.',
      });
    }
  }

  const requestSurfaceExpressions: string[] = [];
  collectTemplateExpressions(
    {
      paths: definition.search.paths.map(path => ({
        path: path.path,
        inputs: path.inputs,
      })),
      inputs: definition.search.inputs,
      headers: definition.search.headers,
      rows: definition.search.rows,
    },
    requestSurfaceExpressions,
  );

  for (const expression of requestSurfaceExpressions) {
    if (/\bne\s+/.test(expression)) {
      issues.push({
        severity: 'soft',
        feature: 'template:ne',
        message: `Template uses unsupported conditional helper '${expression}'`,
        remediation: 'Replace with supported expression forms or extend template runtime.',
      });
    }
  }

  const hasHardIssues = issues.some(issue => issue.severity === 'hard');
  const status: CompatibilityStatus = hasHardIssues
    ? 'incompatible'
    : (issues.length > 0 ? 'degraded' : 'compatible');

  return {
    definitionId: definition.id,
    status,
    issues,
  };
}
