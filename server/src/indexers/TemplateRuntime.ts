import type { SearchQuery } from './BaseIndexer';

export interface TemplateRuntimeContext {
  query: SearchQuery;
  config: Record<string, unknown>;
  categories: number[];
}

function encodeQueryKeywords(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

function resolveSimpleReference(reference: string, context: TemplateRuntimeContext): string {
  switch (reference) {
    case 'Query.Keywords':
    case 'Keywords':
      return encodeQueryKeywords(context.query.q ?? '');
    case 'Query.Season':
    case 'Season':
      return String(context.query.season ?? '');
    case 'Query.Ep':
    case 'Ep':
      return String(context.query.ep ?? '');
    case 'Query.IMDBID':
    case 'IMDBID':
      return context.query.imdbid ?? '';
    case 'Query.TMDBID':
    case 'TMDBID':
      return context.query.tmdbid ?? '';
    case 'Categories':
      return context.categories.map(value => String(value)).join(',');
    default:
      break;
  }

  if (reference.startsWith('Config.')) {
    const key = reference.slice('Config.'.length);
    const value = context.config[key];
    return value === undefined || value === null ? '' : String(value);
  }

  return '';
}

export function renderCardigannTemplate(template: string, context: TemplateRuntimeContext): string {
  let rendered = template;

  rendered = rendered.replace(
    /\{\{\s*range\s+\.Categories\s*\}\}([\s\S]*?)\{\{\s*end\s*\}\}/g,
    (_fullMatch, body: string) => {
      return context.categories
        .map(category => body.replace(/\{\{\s*\.\s*\}\}/g, String(category)))
        .join('');
    },
  );

  rendered = rendered.replace(
    /\{\{\s*join\s+\.Categories\s+"([^"]*)"\s*\}\}/g,
    (_fullMatch, delimiter: string) => context.categories.map(value => String(value)).join(delimiter),
  );

  rendered = rendered.replace(
    /\{\{\s*\.([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)\s*\}\}/g,
    (_fullMatch, reference: string) => resolveSimpleReference(reference, context),
  );

  return rendered;
}

export function resolveCardigannUrl(baseUrl: string, renderedPath: string): string {
  if (renderedPath.startsWith('http://') || renderedPath.startsWith('https://')) {
    return renderedPath;
  }

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = renderedPath.startsWith('/') ? renderedPath : `/${renderedPath}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}
