import type { FilterBlock } from './DefinitionLoader';

export interface CardigannFilterRuntimeOptions {
  strict?: boolean;
  now?: Date;
}

function normalizeFilterArgs(args: unknown): unknown[] {
  if (args === undefined || args === null) {
    return [];
  }
  // If it's already an array, return it as is.
  // The caller (ScrapingParser or Test) should pass the args array.
  if (Array.isArray(args)) {
    return args;
  }
  return [args];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeLegacyUnicodeProperties(source: string): string {
  // Cardigann definitions sometimes use Go-style IsCJK property aliases.
  // JavaScript regex engines do not support this alias directly.
  return source.replace(/\\p\{IsCJKUnifiedIdeographs\}/g, '\\u4E00-\\u9FFF');
}

function dedupeRegexFlags(flags: string): string {
  return Array.from(new Set(flags.split(''))).join('');
}

function parseRegexPattern(pattern: string, forceGlobal = false): RegExp {
  const delimited = pattern.match(/^\/(.+)\/([a-z]*)$/i);
  let source = delimited?.[1] ?? pattern;
  let flags = delimited?.[2] ?? '';
  source = normalizeLegacyUnicodeProperties(source);

  // Cardigann regex often uses inline case-insensitive marker `(?i)`.
  if (source.startsWith('(?i)')) {
    source = source.slice('(?i)'.length);
    if (!flags.includes('i')) {
      flags += 'i';
    }
  }

  if (forceGlobal && !flags.includes('g')) {
    flags += 'g';
  }

  if (source.includes('\\p{') && !flags.includes('u')) {
    flags += 'u';
  }

  return new RegExp(source, dedupeRegexFlags(flags));
}

function parseRelativeDate(value: string, now: Date): Date | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === 'yesterday') {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  if (normalized === 'today' || normalized === 'just now') {
    return new Date(now.getTime());
  }

  const match = normalized.match(
    /^(\d+)\s*(second|seconds|minute|minutes|min|mins|hour|hours|day|days|week|weeks|month|months|year|years)\s*ago$/,
  );
  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const millisByUnit: Record<string, number> = {
    second: 1000,
    seconds: 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    min: 60 * 1000,
    mins: 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
    years: 365 * 24 * 60 * 60 * 1000,
  };
  const unitMs = millisByUnit[unit];
  if (!unitMs) {
    return undefined;
  }

  return new Date(now.getTime() - amount * unitMs);
}

function applyKnownFilter(
  inputValue: string,
  filterName: string,
  args: unknown[],
  options: CardigannFilterRuntimeOptions,
): string | undefined {
  switch (filterName) {
    case 'trim':
      return inputValue.trim();

    case 'lowercase':
    case 'tolower':
      return inputValue.toLowerCase();

    case 'uppercase':
      return inputValue.toUpperCase();

    case 'replace': {
      const [findRaw, replaceRaw] = args;
      const find = findRaw === undefined ? '' : String(findRaw);
      const replaceValue = replaceRaw === undefined ? '' : String(replaceRaw);
      return inputValue.replace(new RegExp(escapeRegex(find), 'g'), replaceValue);
    }

    case 'regex':
    case 'regexp': {
      const patternRaw = args[0];
      if (patternRaw === undefined) {
        return inputValue;
      }
      const pattern = String(patternRaw);
      const regex = parseRegexPattern(pattern);
      const match = inputValue.match(regex);
      return match?.[1] ?? match?.[0] ?? inputValue;
    }

    case 're_replace': {
      const patternRaw = args[0];
      const replacementRaw = args[1];
      if (patternRaw === undefined) {
        return inputValue;
      }
      const pattern = String(patternRaw);
      const replacement = replacementRaw === undefined ? '' : String(replacementRaw);
      const regex = parseRegexPattern(pattern, true);
      return inputValue.replace(regex, replacement);
    }

    case 'prepend':
      return `${args[0] === undefined ? '' : String(args[0])}${inputValue}`;

    case 'append':
      return `${inputValue}${args[0] === undefined ? '' : String(args[0])}`;

    case 'split': {
      const delimiterRaw = args[0];
      const indexRaw = args[1];
      const delimiter = delimiterRaw === undefined ? '' : String(delimiterRaw);
      const parts = inputValue.split(delimiter);
      const index = indexRaw === undefined ? 0 : Number(indexRaw);
      if (Number.isNaN(index)) {
        return inputValue;
      }
      return parts[index] ?? inputValue;
    }

    case 'remove': {
      const valueToRemoveRaw = args[0];
      if (valueToRemoveRaw === undefined) {
        return inputValue;
      }
      const valueToRemove = String(valueToRemoveRaw);
      return inputValue.split(valueToRemove).join('');
    }

    case 'case': {
      const map = args[0] as Record<string, string> | undefined;
      if (!map || typeof map !== 'object') {
        return inputValue;
      }
      return map[inputValue] ?? inputValue;
    }

    case 'urldecode':
      return decodeURIComponent(inputValue);

    case 'urlencode':
      return encodeURIComponent(inputValue);

    case 'timeago':
    case 'fuzzytime': {
      const now = options.now ?? new Date();
      const parsed = parseRelativeDate(inputValue, now);
      return parsed ? parsed.toISOString() : inputValue;
    }

    case 'dateparse': {
      // Handle dd.MM.yyyy HH:mm:ss or dd.MM.yyyy
      const ddmmyyyyMatch = inputValue.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
      if (ddmmyyyyMatch) {
        const [, day, month, year, hour, minute, second] = ddmmyyyyMatch;
        const date = new Date(
          Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour ?? 0),
            Number(minute ?? 0),
            Number(second ?? 0),
          ),
        );
        return date.toISOString();
      }

      const parsed = new Date(inputValue);
      return Number.isNaN(parsed.getTime()) ? inputValue : parsed.toISOString();
    }

    case 'humanize':
    case 'andmatch':
      return inputValue;

    default:
      return undefined;
  }
}

export function applyCardigannFilter(
  inputValue: string,
  filter: FilterBlock,
  options: CardigannFilterRuntimeOptions = {},
): string {
  const args = normalizeFilterArgs(filter.args);
  const output = applyKnownFilter(inputValue, filter.name, args, options);
  if (output !== undefined) {
    return output;
  }

  if (options.strict) {
    throw new Error(`Unsupported Cardigann filter: ${filter.name}`);
  }

  return inputValue;
}

export function applyCardigannFilters(
  inputValue: string,
  filters: FilterBlock[],
  options: CardigannFilterRuntimeOptions = {},
): string {
  let value = inputValue;
  for (const filter of filters) {
    value = applyCardigannFilter(value, filter, options);
  }
  return value;
}
