import type { SearchQuery } from './BaseIndexer';

export interface TemplateRuntimeContext {
  query: SearchQuery;
  config: Record<string, unknown>;
  categories: number[];
}

export interface TemplateRenderOptions {
  strict?: boolean;
}

function encodeQueryKeywords(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

function resolveReferenceValue(reference: string, context: TemplateRuntimeContext): unknown {
  switch (reference) {
    case 'Query.Keywords':
    case 'Keywords':
      return context.query.q ?? '';
    case 'Query.Season':
    case 'Season':
      return context.query.season ?? '';
    case 'Query.Ep':
    case 'Ep':
      return context.query.ep ?? '';
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
    return context.config[key];
  }

  return undefined;
}

function asTemplateString(reference: string, value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (reference === 'Query.Keywords' || reference === 'Keywords') {
    return encodeQueryKeywords(String(value));
  }
  if (Array.isArray(value)) {
    return value.map(item => String(item)).join(',');
  }
  return String(value);
}

function stripOuterParens(value: string): string {
  const trimmed = value.trim();
  if (!(trimmed.startsWith('(') && trimmed.endsWith(')'))) {
    return trimmed;
  }

  let depth = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index];
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0 && index < trimmed.length - 1) {
        return trimmed;
      }
    }
  }

  return trimmed.slice(1, -1).trim();
}

function splitTopLevelArguments(value: string): string[] {
  const argumentsList: string[] = [];
  let buffer = '';
  let depth = 0;
  let inQuote = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === '"') {
      inQuote = !inQuote;
      buffer += character;
      continue;
    }

    if (!inQuote) {
      if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth = Math.max(depth - 1, 0);
      }
    }

    if (!inQuote && depth === 0 && /\s/.test(character)) {
      if (buffer.trim().length > 0) {
        argumentsList.push(buffer.trim());
        buffer = '';
      }
      continue;
    }

    buffer += character;
  }

  if (buffer.trim().length > 0) {
    argumentsList.push(buffer.trim());
  }

  return argumentsList;
}

function valueToBoolean(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'string') {
    return value.length > 0;
  }
  return Boolean(value);
}

function resolveConditionValue(
  rawValue: string,
  context: TemplateRuntimeContext,
  strict: boolean,
): unknown {
  const value = stripOuterParens(rawValue);

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value === '.True') {
    return true;
  }
  if (value === '.False') {
    return false;
  }
  if (value.startsWith('.')) {
    const reference = value.slice(1);
    const resolved = resolveReferenceValue(reference, context);
    if (resolved === undefined && strict && !reference.startsWith('Config.')) {
      throw new Error(`Unresolved template reference: .${reference}`);
    }
    return resolved;
  }
  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }
  return value;
}

function evaluateCondition(
  condition: string,
  context: TemplateRuntimeContext,
  strict: boolean,
): boolean {
  const expression = stripOuterParens(condition);

  if (expression.startsWith('and ')) {
    const argumentsList = splitTopLevelArguments(expression.slice('and '.length));
    if (argumentsList.length < 2) {
      throw new Error(`Unsupported template node: if ${expression}`);
    }
    return argumentsList.every(item => evaluateCondition(item, context, strict));
  }

  if (expression.startsWith('or ')) {
    const argumentsList = splitTopLevelArguments(expression.slice('or '.length));
    if (argumentsList.length < 2) {
      throw new Error(`Unsupported template node: if ${expression}`);
    }
    return argumentsList.some(item => evaluateCondition(item, context, strict));
  }

  if (expression.startsWith('eq ')) {
    const argumentsList = splitTopLevelArguments(expression.slice('eq '.length));
    if (argumentsList.length !== 2) {
      throw new Error(`Unsupported template node: if ${expression}`);
    }

    const left = resolveConditionValue(argumentsList[0], context, strict);
    const right = resolveConditionValue(argumentsList[1], context, strict);
    return left === right;
  }

  if (expression.startsWith('ne ')) {
    throw new Error(`Unsupported template node: if ${expression}`);
  }

  const resolved = resolveConditionValue(expression, context, strict);
  return valueToBoolean(resolved);
}

function renderConditionals(
  template: string,
  context: TemplateRuntimeContext,
  strict: boolean,
): string {
  let rendered = template;
  let changed = true;
  let iterationCount = 0;

  while (changed && iterationCount < 20) {
    changed = false;
    iterationCount += 1;

    rendered = rendered.replace(
      /\{\{\s*if\s+([\s\S]*?)\s*\}\}([\s\S]*?)\{\{\s*else\s*\}\}([\s\S]*?)\{\{\s*end\s*\}\}/g,
      (_fullMatch, condition: string, thenBranch: string, elseBranch: string) => {
        changed = true;
        return evaluateCondition(condition, context, strict) ? thenBranch : elseBranch;
      },
    );

    rendered = rendered.replace(
      /\{\{\s*if\s+([\s\S]*?)\s*\}\}([\s\S]*?)\{\{\s*end\s*\}\}/g,
      (_fullMatch, condition: string, thenBranch: string) => {
        changed = true;
        return evaluateCondition(condition, context, strict) ? thenBranch : '';
      },
    );
  }

  return rendered;
}

export function renderCardigannTemplate(
  template: string,
  context: TemplateRuntimeContext,
  options: TemplateRenderOptions = {},
): string {
  const strict = options.strict ?? false;
  let rendered = template;
  rendered = renderConditionals(rendered, context, strict);

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
    (_fullMatch, reference: string) => {
      const resolved = resolveReferenceValue(reference, context);
      if (resolved === undefined) {
        if (strict && !reference.startsWith('Config.')) {
          throw new Error(`Unresolved template reference: .${reference}`);
        }
        return '';
      }
      return asTemplateString(reference, resolved);
    },
  );

  if (strict) {
    const unsupportedNode = rendered.match(/\{\{[\s\S]*?\}\}/);
    if (unsupportedNode) {
      throw new Error(`Unsupported template node: ${unsupportedNode[0]}`);
    }
  }

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
