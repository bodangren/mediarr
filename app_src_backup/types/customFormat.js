import { z } from 'zod';
/**
 * Custom format condition definition
 */
export const customFormatConditionSchema = z.object({
    type: z.string(),
    field: z.string().optional(),
    operator: z.string().optional(),
    value: z.union([z.string(), z.number()]),
    negate: z.boolean().optional(),
    required: z.boolean().optional(),
});
/**
 * Custom format score for quality profile
 */
export const customFormatScoreSchema = z.object({
    id: z.number(),
    qualityProfileId: z.number(),
    score: z.number(),
});
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
/**
 * Test result for custom format
 */
export const customFormatTestResultSchema = z.object({
    formatId: z.number(),
    formatName: z.string(),
    matches: z.boolean(),
    conditionResults: z.array(conditionTestResultSchema),
});
/**
 * Schema for custom format validation
 */
export const customFormatSchemaSchema = z.object({
    conditionTypes: z.array(z.string()),
    operators: z.array(z.string()),
    fields: z.array(z.string()),
    examples: z.record(z.unknown()).optional(),
});
/**
 * Valid condition types for display
 */
export const CONDITION_TYPES = [
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
export const OPERATORS = [
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
export const FIELDS = [
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
export function getOperatorsForType(type) {
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
export function createDefaultCondition() {
    return {
        type: 'regex',
        field: 'title',
        operator: 'contains',
        value: '',
        negate: false,
        required: false,
    };
}
//# sourceMappingURL=customFormat.js.map