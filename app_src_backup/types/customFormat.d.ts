import { z } from 'zod';
/**
 * Condition types for custom format evaluation
 */
export type ConditionType = 'regex' | 'size' | 'language' | 'indexerFlag' | 'releaseGroup' | 'source' | 'resolution' | 'qualityModifier';
/**
 * Condition operators
 */
export type ConditionOperator = 'equals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'regex' | 'notRegex';
/**
 * Condition fields
 */
export type ConditionField = 'title' | 'size' | 'language' | 'releaseGroup' | 'source' | 'resolution';
/**
 * Custom format condition definition
 */
export declare const customFormatConditionSchema: z.ZodObject<{
    type: z.ZodType<ConditionType>;
    field: z.ZodType<ConditionField | undefined>;
    operator: z.ZodType<ConditionOperator | undefined>;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    negate: z.ZodOptional<z.ZodBoolean>;
    required: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: ConditionType;
    value: string | number;
    operator?: ConditionOperator | undefined;
    required?: boolean | undefined;
    field?: ConditionField | undefined;
    negate?: boolean | undefined;
}, {
    type: ConditionType;
    value: string | number;
    operator?: ConditionOperator | undefined;
    required?: boolean | undefined;
    field?: ConditionField | undefined;
    negate?: boolean | undefined;
}>;
export type CustomFormatCondition = z.infer<typeof customFormatConditionSchema>;
/**
 * Custom format score for quality profile
 */
export declare const customFormatScoreSchema: z.ZodObject<{
    id: z.ZodNumber;
    qualityProfileId: z.ZodNumber;
    score: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    qualityProfileId: number;
    id: number;
    score: number;
}, {
    qualityProfileId: number;
    id: number;
    score: number;
}>;
export type CustomFormatScore = z.infer<typeof customFormatScoreSchema>;
/**
 * Custom format with scores
 */
export declare const customFormatSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    includeCustomFormatWhenRenaming: z.ZodBoolean;
    conditions: z.ZodArray<z.ZodObject<{
        type: z.ZodType<ConditionType>;
        field: z.ZodType<ConditionField | undefined>;
        operator: z.ZodType<ConditionOperator | undefined>;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        negate: z.ZodOptional<z.ZodBoolean>;
        required: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: ConditionType;
        value: string | number;
        operator?: ConditionOperator | undefined;
        required?: boolean | undefined;
        field?: ConditionField | undefined;
        negate?: boolean | undefined;
    }, {
        type: ConditionType;
        value: string | number;
        operator?: ConditionOperator | undefined;
        required?: boolean | undefined;
        field?: ConditionField | undefined;
        negate?: boolean | undefined;
    }>, "many">;
    scores: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        qualityProfileId: z.ZodNumber;
        score: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        qualityProfileId: number;
        id: number;
        score: number;
    }, {
        qualityProfileId: number;
        id: number;
        score: number;
    }>, "many">;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: number;
    conditions: {
        type: ConditionType;
        value: string | number;
        operator?: ConditionOperator | undefined;
        required?: boolean | undefined;
        field?: ConditionField | undefined;
        negate?: boolean | undefined;
    }[];
    includeCustomFormatWhenRenaming: boolean;
    scores: {
        qualityProfileId: number;
        id: number;
        score: number;
    }[];
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}, {
    name: string;
    id: number;
    conditions: {
        type: ConditionType;
        value: string | number;
        operator?: ConditionOperator | undefined;
        required?: boolean | undefined;
        field?: ConditionField | undefined;
        negate?: boolean | undefined;
    }[];
    includeCustomFormatWhenRenaming: boolean;
    scores: {
        qualityProfileId: number;
        id: number;
        score: number;
    }[];
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}>;
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
export declare const customFormatSchemaResponse: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    includeCustomFormatWhenRenaming: z.ZodBoolean;
    conditions: z.ZodArray<z.ZodObject<{
        type: z.ZodType<ConditionType>;
        field: z.ZodType<ConditionField | undefined>;
        operator: z.ZodType<ConditionOperator | undefined>;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        negate: z.ZodOptional<z.ZodBoolean>;
        required: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: ConditionType;
        value: string | number;
        operator?: ConditionOperator | undefined;
        required?: boolean | undefined;
        field?: ConditionField | undefined;
        negate?: boolean | undefined;
    }, {
        type: ConditionType;
        value: string | number;
        operator?: ConditionOperator | undefined;
        required?: boolean | undefined;
        field?: ConditionField | undefined;
        negate?: boolean | undefined;
    }>, "many">;
    scores: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        qualityProfileId: z.ZodNumber;
        score: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        qualityProfileId: number;
        id: number;
        score: number;
    }, {
        qualityProfileId: number;
        id: number;
        score: number;
    }>, "many">;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: number;
    conditions: {
        type: ConditionType;
        value: string | number;
        operator?: ConditionOperator | undefined;
        required?: boolean | undefined;
        field?: ConditionField | undefined;
        negate?: boolean | undefined;
    }[];
    includeCustomFormatWhenRenaming: boolean;
    scores: {
        qualityProfileId: number;
        id: number;
        score: number;
    }[];
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}, {
    name: string;
    id: number;
    conditions: {
        type: ConditionType;
        value: string | number;
        operator?: ConditionOperator | undefined;
        required?: boolean | undefined;
        field?: ConditionField | undefined;
        negate?: boolean | undefined;
    }[];
    includeCustomFormatWhenRenaming: boolean;
    scores: {
        qualityProfileId: number;
        id: number;
        score: number;
    }[];
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}>;
/**
 * Test result for custom format condition
 */
export declare const conditionTestResultSchema: z.ZodObject<{
    index: z.ZodNumber;
    type: z.ZodString;
    field: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodString>;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    negate: z.ZodOptional<z.ZodBoolean>;
    matches: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: string;
    matches: boolean;
    value: string | number;
    index: number;
    operator?: string | undefined;
    field?: string | undefined;
    negate?: boolean | undefined;
}, {
    type: string;
    matches: boolean;
    value: string | number;
    index: number;
    operator?: string | undefined;
    field?: string | undefined;
    negate?: boolean | undefined;
}>;
export type ConditionTestResult = z.infer<typeof conditionTestResultSchema>;
/**
 * Test result for custom format
 */
export declare const customFormatTestResultSchema: z.ZodObject<{
    formatId: z.ZodNumber;
    formatName: z.ZodString;
    matches: z.ZodBoolean;
    conditionResults: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        type: z.ZodString;
        field: z.ZodOptional<z.ZodString>;
        operator: z.ZodOptional<z.ZodString>;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        negate: z.ZodOptional<z.ZodBoolean>;
        matches: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        type: string;
        matches: boolean;
        value: string | number;
        index: number;
        operator?: string | undefined;
        field?: string | undefined;
        negate?: boolean | undefined;
    }, {
        type: string;
        matches: boolean;
        value: string | number;
        index: number;
        operator?: string | undefined;
        field?: string | undefined;
        negate?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    matches: boolean;
    formatId: number;
    formatName: string;
    conditionResults: {
        type: string;
        matches: boolean;
        value: string | number;
        index: number;
        operator?: string | undefined;
        field?: string | undefined;
        negate?: boolean | undefined;
    }[];
}, {
    matches: boolean;
    formatId: number;
    formatName: string;
    conditionResults: {
        type: string;
        matches: boolean;
        value: string | number;
        index: number;
        operator?: string | undefined;
        field?: string | undefined;
        negate?: boolean | undefined;
    }[];
}>;
export type CustomFormatTestResult = z.infer<typeof customFormatTestResultSchema>;
/**
 * Schema for custom format validation
 */
export declare const customFormatSchemaSchema: z.ZodObject<{
    conditionTypes: z.ZodArray<z.ZodString, "many">;
    operators: z.ZodArray<z.ZodString, "many">;
    fields: z.ZodArray<z.ZodString, "many">;
    examples: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    fields: string[];
    conditionTypes: string[];
    operators: string[];
    examples?: Record<string, unknown> | undefined;
}, {
    fields: string[];
    conditionTypes: string[];
    operators: string[];
    examples?: Record<string, unknown> | undefined;
}>;
export type CustomFormatSchemaInfo = z.infer<typeof customFormatSchemaSchema>;
/**
 * Valid condition types for display
 */
export declare const CONDITION_TYPES: {
    value: ConditionType;
    label: string;
}[];
/**
 * Valid operators for display
 */
export declare const OPERATORS: {
    value: ConditionOperator;
    label: string;
}[];
/**
 * Valid fields for display
 */
export declare const FIELDS: {
    value: ConditionField;
    label: string;
}[];
/**
 * Get operators applicable for a condition type
 */
export declare function getOperatorsForType(type: ConditionType): ConditionOperator[];
/**
 * Create a default condition
 */
export declare function createDefaultCondition(): CustomFormatCondition;
//# sourceMappingURL=customFormat.d.ts.map