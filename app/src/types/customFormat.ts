import { z } from 'zod';

/**
 * Condition types for custom format evaluation
 */
export type ConditionType =
  | 'regex'
  | 'size'
  | 'language'
  | 'indexerFlag'
  | 'releaseGroup'
  | 'source'
  | 'resolution'
  | 'qualityModifier';

/**
 * Condition operators
 */
export type ConditionOperator =
  | 'equals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'regex'
  | 'notRegex';

/**
 * Condition fields
 */
export type ConditionField =
  | 'title'
  | 'size'
  | 'language'
  | 'releaseGroup'
  | 'source'
  | 'resolution';

/**
 * Custom format condition definition
 */
export const customFormatConditionSchema = z.object({
  type: z.string() as z.ZodType<ConditionType>,
  field: z.string().optional() as z.ZodType<ConditionField | undefined>,
  operator: z.string().optional() as z.ZodType<ConditionOperator | undefined>,
  value: z.union([z.string(), z.number()]),
  negate: z.boolean().optional(),
  required: z.boolean().optional(),
});

export type CustomFormatCondition = z.infer<typeof customFormatConditionSchema>;

/**
 * Custom format score for quality profile
 */
export const customFormatScoreSchema = z.object({
  id: z.number(),
  qualityProfileId: z.number(),
  score: z.number(),
});

export type CustomFormatScore = z.infer<typeof customFormatScoreSchema>;

/**
 * Custom format with scores
 */
export const customFormatSchema = z.object({
  id: z.number(),
  name: z.string(),
  includeCustomFormatWhenRenaming: z.boolean(),
  conditions: z.array(customFormatConditionSchema),
  scores: z.array(customFormatScoreSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CustomFormat = z.infer<typeof customFormatSchema>;

/**
 * Input for creating a new custom format
 */
export interface CreateCustomFormatInput {
  name: string;
  includeCustomFormatWhenRenaming?: boolean;
  conditions: CustomFormatCondition[];
  scores?: Array<{
    qualityProfileId: number;
    score: number;
  }>;
}

/**
 * Input for updating an existing custom format
 */
export interface UpdateCustomFormatInput {
  name?: string;
  includeCustomFormatWhenRenaming?: boolean;
  conditions?: CustomFormatCondition[];
  scores?: Array<{
    qualityProfileId: number;
    score: number;
  }>;
}

/**
 * Custom format schema response from API
 */
export const customFormatSchemaResponse = z.object({
  id: z.number(),
  name: z.string(),
  includeCustomFormatWhenRenaming: z.boolean(),
  conditions: z.array(customFormatConditionSchema),
  scores: z.array(customFormatScoreSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Test result for custom format condition
 */
export const conditionTestResultSchema = z.object({
  index: z.number(),
  type: z.string(),
  field: z.string().optional(),
  operator: z.string().optional(),
  value: z.union([z.string(), z.number()]),
  negate: z.boolean().optional(),
  matches: z.boolean(),
});

export type ConditionTestResult = z.infer<typeof conditionTestResultSchema>;

/**
 * Test result for custom format
 */
export const customFormatTestResultSchema = z.object({
  formatId: z.number(),
  formatName: z.string(),
  matches: z.boolean(),
  conditionResults: z.array(conditionTestResultSchema),
});

export type CustomFormatTestResult = z.infer<typeof customFormatTestResultSchema>;

/**
 * Schema for custom format validation
 */
export const customFormatSchemaSchema = z.object({
  conditionTypes: z.array(z.string()),
  operators: z.array(z.string()),
  fields: z.array(z.string()),
  examples: z.record(z.unknown()).optional(),
});

export type CustomFormatSchemaInfo = z.infer<typeof customFormatSchemaSchema>;

/**
 * Valid condition types for display
 */
export const CONDITION_TYPES: { value: ConditionType; label: string }[] = [
  { value: 'regex', label: 'Release Title' },
  { value: 'size', label: 'Size' },
  { value: 'language', label: 'Language' },
  { value: 'indexerFlag', label: 'Indexer Flags' },
  { value: 'releaseGroup', label: 'Release Group' },
  { value: 'source', label: 'Source' },
  { value: 'resolution', label: 'Resolution' },
  { value: 'qualityModifier', label: 'Quality Modifier' },
];

/**
 * Valid operators for display
 */
export const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does Not Contain' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'regex', label: 'Matches Regex' },
  { value: 'notRegex', label: 'Does Not Match Regex' },
];

/**
 * Valid fields for display
 */
export const FIELDS: { value: ConditionField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'size', label: 'Size' },
  { value: 'language', label: 'Language' },
  { value: 'releaseGroup', label: 'Release Group' },
  { value: 'source', label: 'Source' },
  { value: 'resolution', label: 'Resolution' },
];

/**
 * Get operators applicable for a condition type
 */
export function getOperatorsForType(type: ConditionType): ConditionOperator[] {
  switch (type) {
    case 'size':
    case 'resolution':
      return ['equals', 'greaterThan', 'lessThan'];
    case 'regex':
    case 'releaseGroup':
    case 'source':
    case 'language':
    case 'indexerFlag':
    case 'qualityModifier':
    default:
      return ['equals', 'contains', 'notContains', 'regex', 'notRegex'];
  }
}

/**
 * Create a default condition
 */
export function createDefaultCondition(): CustomFormatCondition {
  return {
    type: 'regex',
    field: 'title',
    operator: 'contains',
    value: '',
    negate: false,
    required: false,
  };
}
