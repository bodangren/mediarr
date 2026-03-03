import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
declare const activityItemSchema: z.ZodObject<{
    id: z.ZodNumber;
    eventType: z.ZodString;
    sourceModule: z.ZodOptional<z.ZodString>;
    entityRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    summary: z.ZodString;
    success: z.ZodOptional<z.ZodBoolean>;
    details: z.ZodOptional<z.ZodUnknown>;
    occurredAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    eventType: z.ZodString;
    sourceModule: z.ZodOptional<z.ZodString>;
    entityRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    summary: z.ZodString;
    success: z.ZodOptional<z.ZodBoolean>;
    details: z.ZodOptional<z.ZodUnknown>;
    occurredAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    eventType: z.ZodString;
    sourceModule: z.ZodOptional<z.ZodString>;
    entityRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    summary: z.ZodString;
    success: z.ZodOptional<z.ZodBoolean>;
    details: z.ZodOptional<z.ZodUnknown>;
    occurredAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export interface ActivityQuery {
    page?: number;
    pageSize?: number;
    eventType?: string;
    sourceModule?: string;
    entityRef?: string;
    success?: boolean;
    from?: string;
    to?: string;
}
declare const exportActivitySchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        eventType: z.ZodString;
        sourceModule: z.ZodOptional<z.ZodString>;
        entityRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        summary: z.ZodString;
        success: z.ZodOptional<z.ZodBoolean>;
        details: z.ZodOptional<z.ZodUnknown>;
        occurredAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodNumber;
        eventType: z.ZodString;
        sourceModule: z.ZodOptional<z.ZodString>;
        entityRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        summary: z.ZodString;
        success: z.ZodOptional<z.ZodBoolean>;
        details: z.ZodOptional<z.ZodUnknown>;
        occurredAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodNumber;
        eventType: z.ZodString;
        sourceModule: z.ZodOptional<z.ZodString>;
        entityRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        summary: z.ZodString;
        success: z.ZodOptional<z.ZodBoolean>;
        details: z.ZodOptional<z.ZodUnknown>;
        occurredAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    totalCount: z.ZodNumber;
    exportedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    items: z.objectOutputType<{
        id: z.ZodNumber;
        eventType: z.ZodString;
        sourceModule: z.ZodOptional<z.ZodString>;
        entityRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        summary: z.ZodString;
        success: z.ZodOptional<z.ZodBoolean>;
        details: z.ZodOptional<z.ZodUnknown>;
        occurredAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">[];
    totalCount: number;
    exportedAt: string;
}, {
    items: z.objectInputType<{
        id: z.ZodNumber;
        eventType: z.ZodString;
        sourceModule: z.ZodOptional<z.ZodString>;
        entityRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        summary: z.ZodString;
        success: z.ZodOptional<z.ZodBoolean>;
        details: z.ZodOptional<z.ZodUnknown>;
        occurredAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">[];
    totalCount: number;
    exportedAt: string;
}>;
export type ExportActivityResult = z.infer<typeof exportActivitySchema>;
export declare function createActivityApi(client: ApiHttpClient): {
    list(query?: ActivityQuery): Promise<PaginatedResult<ActivityItem>>;
    clear(query?: ActivityQuery): Promise<{
        deletedCount: number;
    }>;
    markFailed(id: number): Promise<ActivityItem>;
    export(query?: ActivityQuery): Promise<ExportActivityResult>;
};
export {};
//# sourceMappingURL=activityApi.d.ts.map