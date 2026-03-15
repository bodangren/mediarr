import type { SearchQuery } from './BaseIndexer';
import { applyCardigannFilters } from './CardigannFilterRuntime';
import type { CardigannDefinition, SearchPathBlock } from './DefinitionLoader';
import { renderCardigannTemplate, resolveCardigannUrl } from './TemplateRuntime';

export interface BuiltCardigannRequest {
  url: string;
  headers: Record<string, string>;
  responseType: string;
  query: SearchQuery;
}

function normalizeStringValue(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return value;
  }

  return String(value);
}

function appendRawQuery(url: URL, rawQuery: string): void {
  if (!rawQuery.trim()) {
    return;
  }

  const normalized = rawQuery.replace(/^&+|&+$/g, '');
  if (!normalized) {
    return;
  }

  url.search = url.search ? `${url.search}&${normalized}` : `?${normalized}`;
}

function applyKeywordFilters(definition: CardigannDefinition, query: SearchQuery): SearchQuery {
  const filters = definition.search.keywordsfilters ?? [];
  if (filters.length === 0) {
    return query;
  }

  const rawKeywords = query.q ?? '';
  const transformedKeywords = applyCardigannFilters(rawKeywords, filters, { strict: true });
  return {
    ...query,
    q: transformedKeywords,
  };
}

function buildRequestHeaders(
  definition: CardigannDefinition,
  query: SearchQuery,
  settings: Record<string, unknown>,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const categories = (query.categories ?? []).filter((v): v is number => typeof v === 'number');

  for (const [headerName, values] of Object.entries(definition.search.headers ?? {})) {
    if (!Array.isArray(values) || values.length === 0) {
      continue;
    }

    const rendered = renderCardigannTemplate(values[0] ?? '', {
      query,
      config: settings,
      categories,
    }, { strict: false });

    if (rendered) {
      headers[headerName] = rendered;
    }
  }

  return headers;
}

function buildRequestInputs(
  definition: CardigannDefinition,
  path: SearchPathBlock,
): Record<string, string | number | boolean> {
  const inheritedInputs = path.inheritinputs === false
    ? {}
    : (definition.search.inputs ?? {});

  return {
    ...inheritedInputs,
    ...(path.inputs ?? {}),
  };
}

export function buildCardigannRequest(
  definition: CardigannDefinition,
  path: SearchPathBlock,
  query: SearchQuery,
  settings: Record<string, unknown>,
): BuiltCardigannRequest {
  const normalizedQuery = applyKeywordFilters(definition, query);
  const categories = normalizedQuery.categories ?? [];

  let renderedPath = renderCardigannTemplate(path.path, {
    query: normalizedQuery,
    config: settings,
    categories,
  }, { strict: false });

  // Legacy shorthand used in some historic definitions.
  renderedPath = renderedPath.replace(/\{q\}/g, encodeURIComponent(normalizedQuery.q ?? '').replace(/%20/g, '+'));

  const baseUrl = definition.links[0];
  if (!baseUrl) {
    throw new Error(`Definition '${definition.id}' has no base link`);
  }

  const requestUrl = new URL(resolveCardigannUrl(baseUrl, renderedPath));
  const mergedInputs = buildRequestInputs(definition, path);

  for (const [key, value] of Object.entries(mergedInputs)) {
    const renderedValue = renderCardigannTemplate(normalizeStringValue(value), {
      query: normalizedQuery,
      config: settings,
      categories,
    }, { strict: false });

    if (!renderedValue) {
      continue;
    }

    if (key === '$raw') {
      appendRawQuery(requestUrl, renderedValue);
      continue;
    }

    requestUrl.searchParams.set(key, renderedValue);
  }

  return {
    url: requestUrl.toString(),
    headers: buildRequestHeaders(definition, normalizedQuery, settings),
    responseType: path.response?.type ?? 'html',
    query: normalizedQuery,
  };
}
