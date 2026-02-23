import { NotFoundError, ValidationError } from '../errors/domainErrors';

export type FilterTargetType = 'series' | 'indexer';

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan';

export type SeriesFilterField = 'monitored' | 'network' | 'genre' | 'tag' | 'rating' | 'status';
export type IndexerFilterField = 'protocol' | 'enabled' | 'capability' | 'priority' | 'tag';
export type FilterField = SeriesFilterField | IndexerFilterField;

export interface FilterCondition {
  field: FilterField;
  operator: FilterOperator;
  value: string | number | boolean;
}

export interface FilterConditionsGroup {
  operator: 'and' | 'or';
  conditions: FilterCondition[];
}

export interface CustomFilterRecord {
  id: number;
  name: string;
  type: FilterTargetType;
  conditions: FilterConditionsGroup;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomFilterInput {
  name: string;
  type: FilterTargetType;
  conditions: FilterConditionsGroup;
}

export interface UpdateCustomFilterInput {
  name?: string;
  conditions?: FilterConditionsGroup;
}

const VALID_FIELDS_BY_TARGET: Record<FilterTargetType, Set<FilterField>> = {
  series: new Set<FilterField>(['monitored', 'network', 'genre', 'tag', 'rating', 'status']),
  indexer: new Set<FilterField>(['protocol', 'enabled', 'capability', 'priority', 'tag']),
};

const VALID_OPERATORS = new Set<FilterOperator>([
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'greaterThan',
  'lessThan',
]);

function normalizeBooleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  return false;
}

function stringMatches(actual: string, expected: string, operator: FilterOperator): boolean {
  switch (operator) {
    case 'equals':
      return actual === expected;
    case 'notEquals':
      return actual !== expected;
    case 'contains':
      return actual.includes(expected);
    case 'notContains':
      return !actual.includes(expected);
    default:
      return false;
  }
}

function arrayMatches(actual: string[], expected: string, operator: FilterOperator): boolean {
  if (operator === 'equals' || operator === 'contains') {
    return actual.some(value => value === expected || value.includes(expected));
  }

  if (operator === 'notEquals' || operator === 'notContains') {
    return actual.every(value => value !== expected && !value.includes(expected));
  }

  return false;
}

function getSeriesValue(item: Record<string, unknown>, field: SeriesFilterField): unknown {
  switch (field) {
    case 'monitored':
      return item.monitored;
    case 'network':
      return item.network;
    case 'genre':
      return item.genres;
    case 'tag':
      return item.tags;
    case 'rating': {
      if (typeof item.rating === 'number') {
        return item.rating;
      }

      const ratingObject = item.ratings as { value?: unknown } | undefined;
      if (ratingObject && typeof ratingObject.value === 'number') {
        return ratingObject.value;
      }

      return undefined;
    }
    case 'status':
      return item.status;
    default:
      return undefined;
  }
}

function getIndexerCapabilities(item: Record<string, unknown>): string[] {
  const explicit = item.capabilities;
  if (Array.isArray(explicit)) {
    return explicit.map(value => String(value).toLowerCase().trim()).filter(Boolean);
  }

  const derived: string[] = [];
  if (normalizeBooleanValue(item.supportsRss)) {
    derived.push('rss');
  }
  if (normalizeBooleanValue(item.supportsSearch)) {
    derived.push('search');
  }

  return [...new Set(derived)];
}

function getIndexerTags(item: Record<string, unknown>): string[] {
  const direct = item.tags;
  if (Array.isArray(direct)) {
    return direct.map(value => String(value).trim()).filter(Boolean);
  }

  const rawSettings = item.settings;
  if (typeof rawSettings !== 'string' || rawSettings.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawSettings) as Record<string, unknown>;
    if (Array.isArray(parsed.tags)) {
      return parsed.tags.map(value => String(value).trim()).filter(Boolean);
    }

    if (typeof parsed.tag === 'string' && parsed.tag.trim().length > 0) {
      return [parsed.tag.trim()];
    }
  } catch {
    return [];
  }

  return [];
}

function evaluateSeriesCondition(item: Record<string, unknown>, condition: FilterCondition): boolean {
  const field = condition.field as SeriesFilterField;
  const actual = getSeriesValue(item, field);

  if (field === 'monitored') {
    const actualBool = normalizeBooleanValue(actual);
    const expected = normalizeBooleanValue(condition.value);

    if (condition.operator === 'equals') {
      return actualBool === expected;
    }

    if (condition.operator === 'notEquals') {
      return actualBool !== expected;
    }

    return false;
  }

  if (field === 'rating') {
    const actualNumber = typeof actual === 'number' ? actual : Number(actual);
    const expectedNumber = Number(condition.value);

    if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) {
      return false;
    }

    if (condition.operator === 'equals') {
      return actualNumber === expectedNumber;
    }

    if (condition.operator === 'notEquals') {
      return actualNumber !== expectedNumber;
    }

    if (condition.operator === 'greaterThan') {
      return actualNumber > expectedNumber;
    }

    if (condition.operator === 'lessThan') {
      return actualNumber < expectedNumber;
    }

    return false;
  }

  const expected = String(condition.value ?? '').toLowerCase();

  if (Array.isArray(actual)) {
    const values = actual.map(entry => String(entry).toLowerCase());
    return arrayMatches(values, expected, condition.operator);
  }

  const actualString = String(actual ?? '').toLowerCase();
  return stringMatches(actualString, expected, condition.operator);
}

function evaluateIndexerCondition(item: Record<string, unknown>, condition: FilterCondition): boolean {
  if (condition.field === 'enabled') {
    const actual = normalizeBooleanValue(item.enabled);
    const expected = normalizeBooleanValue(condition.value);

    if (condition.operator === 'equals') {
      return actual === expected;
    }
    if (condition.operator === 'notEquals') {
      return actual !== expected;
    }
    return false;
  }

  if (condition.field === 'priority') {
    const actual = Number(item.priority);
    const expected = Number(condition.value);

    if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
      return false;
    }

    if (condition.operator === 'equals') {
      return actual === expected;
    }
    if (condition.operator === 'notEquals') {
      return actual !== expected;
    }
    if (condition.operator === 'greaterThan') {
      return actual > expected;
    }
    if (condition.operator === 'lessThan') {
      return actual < expected;
    }

    return false;
  }

  if (condition.field === 'capability') {
    const capabilities = getIndexerCapabilities(item);
    const expected = String(condition.value ?? '').toLowerCase().trim();
    return arrayMatches(capabilities, expected, condition.operator);
  }

  if (condition.field === 'tag') {
    const tags = getIndexerTags(item).map(value => value.toLowerCase());
    const expected = String(condition.value ?? '').toLowerCase().trim();
    return arrayMatches(tags, expected, condition.operator);
  }

  if (condition.field === 'protocol') {
    const actual = String(item.protocol ?? '').toLowerCase().trim();
    const expected = String(condition.value ?? '').toLowerCase().trim();
    return stringMatches(actual, expected, condition.operator);
  }

  return false;
}

export class FilterService {
  constructor(private readonly prisma: Record<string, any>) {}

  private validateConditionsGroup(input: unknown, targetType: FilterTargetType): FilterConditionsGroup {
    if (typeof input !== 'object' || input === null) {
      throw new ValidationError('conditions must be an object');
    }

    const record = input as Record<string, unknown>;
    const operator = record.operator;
    const conditions = record.conditions;

    if (operator !== 'and' && operator !== 'or') {
      throw new ValidationError("conditions.operator must be 'and' or 'or'");
    }

    if (!Array.isArray(conditions) || conditions.length === 0) {
      throw new ValidationError('conditions.conditions must be a non-empty array');
    }

    const validFields = VALID_FIELDS_BY_TARGET[targetType];

    const validatedConditions: FilterCondition[] = conditions.map((condition, index) => {
      if (typeof condition !== 'object' || condition === null) {
        throw new ValidationError(`condition ${index + 1} must be an object`);
      }

      const conditionRecord = condition as Record<string, unknown>;
      const field = conditionRecord.field;
      const operatorValue = conditionRecord.operator;
      const value = conditionRecord.value;

      if (typeof field !== 'string' || !validFields.has(field as FilterField)) {
        throw new ValidationError(`condition ${index + 1} has invalid field`);
      }

      if (typeof operatorValue !== 'string' || !VALID_OPERATORS.has(operatorValue as FilterOperator)) {
        throw new ValidationError(`condition ${index + 1} has invalid operator`);
      }

      if (value === undefined || value === null || value === '') {
        throw new ValidationError(`condition ${index + 1} is missing a value`);
      }

      return {
        field: field as FilterField,
        operator: operatorValue as FilterOperator,
        value: value as string | number | boolean,
      };
    });

    return {
      operator,
      conditions: validatedConditions,
    };
  }

  async list(type: FilterTargetType): Promise<CustomFilterRecord[]> {
    const rows = await this.prisma.customFilter.findMany({
      where: { type },
      orderBy: { name: 'asc' },
    });

    return rows.map((row: Record<string, unknown>) => ({
      ...(row as Omit<CustomFilterRecord, 'conditions' | 'type'>),
      type: String(row.type) as FilterTargetType,
      conditions: this.validateConditionsGroup(row.conditions, String(row.type) as FilterTargetType),
    }));
  }

  async create(input: CreateCustomFilterInput): Promise<CustomFilterRecord> {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new ValidationError('name is required');
    }

    const conditions = this.validateConditionsGroup(input.conditions, input.type);

    const created = await this.prisma.customFilter.create({
      data: {
        name,
        type: input.type,
        conditions,
      },
    });

    return {
      ...created,
      conditions,
    } as CustomFilterRecord;
  }

  async update(id: number, input: UpdateCustomFilterInput): Promise<CustomFilterRecord> {
    const existing = await this.prisma.customFilter.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Filter ${id} not found`);
    }

    const existingType = String(existing.type) as FilterTargetType;
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length === 0) {
        throw new ValidationError('name cannot be empty');
      }
      updateData.name = name;
    }

    if (input.conditions !== undefined) {
      updateData.conditions = this.validateConditionsGroup(input.conditions, existingType);
    }

    const updated = await this.prisma.customFilter.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      conditions: this.validateConditionsGroup(updated.conditions, existingType),
    } as CustomFilterRecord;
  }

  async delete(id: number): Promise<{ id: number; deleted: true }> {
    const existing = await this.prisma.customFilter.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Filter ${id} not found`);
    }

    await this.prisma.customFilter.delete({ where: { id } });

    return { id, deleted: true };
  }

  applyToSeries<T extends Record<string, unknown>>(items: T[], group: FilterConditionsGroup): T[] {
    if (group.conditions.length === 0) {
      return items;
    }

    return items.filter(item => {
      const checks = group.conditions.map(condition => evaluateSeriesCondition(item, condition));
      return group.operator === 'and' ? checks.every(Boolean) : checks.some(Boolean);
    });
  }

  applyToIndexers<T extends Record<string, unknown>>(items: T[], group: FilterConditionsGroup): T[] {
    if (group.conditions.length === 0) {
      return items;
    }

    return items.filter(item => {
      const checks = group.conditions.map(condition => evaluateIndexerCondition(item, condition));
      return group.operator === 'and' ? checks.every(Boolean) : checks.some(Boolean);
    });
  }
}
