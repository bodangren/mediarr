import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { TestResult } from './shared-schemas';
declare const indexerSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    implementation: z.ZodString;
    configContract: z.ZodString;
    settings: z.ZodString;
    protocol: z.ZodString;
    appProfileId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    enabled: z.ZodBoolean;
    supportsRss: z.ZodBoolean;
    supportsSearch: z.ZodBoolean;
    priority: z.ZodNumber;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    name: z.ZodString;
    implementation: z.ZodString;
    configContract: z.ZodString;
    settings: z.ZodString;
    protocol: z.ZodString;
    appProfileId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    enabled: z.ZodBoolean;
    supportsRss: z.ZodBoolean;
    supportsSearch: z.ZodBoolean;
    priority: z.ZodNumber;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    name: z.ZodString;
    implementation: z.ZodString;
    configContract: z.ZodString;
    settings: z.ZodString;
    protocol: z.ZodString;
    appProfileId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    enabled: z.ZodBoolean;
    supportsRss: z.ZodBoolean;
    supportsSearch: z.ZodBoolean;
    priority: z.ZodNumber;
}, z.ZodTypeAny, "passthrough">>;
export type IndexerItem = z.infer<typeof indexerSchema>;
export interface CreateIndexerInput {
    name: string;
    implementation: string;
    configContract: string;
    settings: string;
    protocol: string;
    appProfileId?: number;
    enabled?: boolean;
    supportsRss?: boolean;
    supportsSearch?: boolean;
    priority?: number;
}
export type IndexerTestResult = TestResult;
declare const indexerSchemaField: z.ZodObject<{
    name: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["text", "password", "number", "boolean"]>;
    required: z.ZodOptional<z.ZodBoolean>;
    defaultValue: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
}, "strip", z.ZodTypeAny, {
    type: "number" | "boolean" | "text" | "password";
    label: string;
    name: string;
    required?: boolean | undefined;
    defaultValue?: string | number | boolean | undefined;
}, {
    type: "number" | "boolean" | "text" | "password";
    label: string;
    name: string;
    required?: boolean | undefined;
    defaultValue?: string | number | boolean | undefined;
}>;
declare const indexerConfigSchemaResponse: z.ZodObject<{
    configContract: z.ZodString;
    definitionId: z.ZodOptional<z.ZodString>;
    fields: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["text", "password", "number", "boolean"]>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    }, "strip", z.ZodTypeAny, {
        type: "number" | "boolean" | "text" | "password";
        label: string;
        name: string;
        required?: boolean | undefined;
        defaultValue?: string | number | boolean | undefined;
    }, {
        type: "number" | "boolean" | "text" | "password";
        label: string;
        name: string;
        required?: boolean | undefined;
        defaultValue?: string | number | boolean | undefined;
    }>, "many">;
    compatibility: z.ZodNullable<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    configContract: string;
    fields: {
        type: "number" | "boolean" | "text" | "password";
        label: string;
        name: string;
        required?: boolean | undefined;
        defaultValue?: string | number | boolean | undefined;
    }[];
    definitionId?: string | undefined;
    compatibility?: unknown;
}, {
    configContract: string;
    fields: {
        type: "number" | "boolean" | "text" | "password";
        label: string;
        name: string;
        required?: boolean | undefined;
        defaultValue?: string | number | boolean | undefined;
    }[];
    definitionId?: string | undefined;
    compatibility?: unknown;
}>;
export type IndexerSchemaField = z.infer<typeof indexerSchemaField>;
export type IndexerConfigSchemaResponse = z.infer<typeof indexerConfigSchemaResponse>;
export declare function createIndexerApi(client: ApiHttpClient): {
    list: any;
    create: any;
    update: any;
    remove: any;
    test: any;
    testDraft: any;
    clone(id: number): Promise<IndexerItem>;
    getSchema(configContract: string, definitionId?: string): Promise<IndexerConfigSchemaResponse>;
};
export {};
//# sourceMappingURL=indexerApi.d.ts.map